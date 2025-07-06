# backend/routers/workflows.py

from fastapi import APIRouter, HTTPException, Depends, Request, WebSocket, Body
from sqlalchemy.orm import Session
from models.workflow import Workflow
from models.db import WorkflowDB, UserDB
from database import SessionLocal
from services.gmail import check_new_email
from services.notion import create_notion_page
import json
from tasks import run_workflow_task 
import openai

from openai import OpenAI
import redis
import asyncio
import requests

import os
import logging
import uuid
from datetime import datetime, timedelta

from services.step_registry import STEP_REGISTRY

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")

from pydantic import BaseModel

r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

# Configure logging once, ideally in main.py
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(message)s'
)

logger = logging.getLogger(__name__)

def log_to_redis(workflow_id, message):
    print(f"[LOG] [{workflow_id}] {message}")  # Debug print
    r.rpush(f"workflow:{workflow_id}:log", message)

class ScheduleRequest(BaseModel):
    workflow_id: int
    schedule: int

router = APIRouter()



# In-memory workflow storage for example
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/schedule")
def schedule_workflow(req: ScheduleRequest):
    workflow_id = req.workflow_id
    schedule = req.schedule
    run_workflow_task.apply_async(
        args=[workflow_id],
        countdown=schedule * 60  # schedule in minutes
    )
    return {"message": f"Workflow {workflow_id} scheduled in {schedule} minutes"}

@router.get("/user/{username}")
def get_user_workflows(username: str, db: Session = Depends(get_db)):
    user = db.query(UserDB).filter_by(username=username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
     # Attach DB id to each workflow
    workflows = []
    for wf in user.workflows:
        wf_data = json.loads(wf.workflow_json)
        wf_data['id'] = wf.id
        workflows.append(wf_data)
    print(f"[BACKEND] Returning workflows for {username}: {json.dumps(workflows, indent=2)}")  # <-- LOG

    return workflows


@router.post("/save")
def save_workflow(workflow: Workflow, db: Session = Depends(get_db)):
    user = db.query(UserDB).filter_by(username=workflow.owner).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    wf_json = json.dumps(workflow.dict())
    db_wf = WorkflowDB(name=workflow.name, workflow_json=wf_json, owner=user)
    db.add(db_wf)
    db.commit()
    return {"message": "Workflow saved"}

@router.post("/run")
def run_workflow(workflow: dict, request: Request, db: Session = Depends(get_db)):
    request_id = str(uuid.uuid4())
    workflow_id = workflow.get("id", "default")
    log_to_redis(workflow_id, "------------------------------------------------------")
    log_to_redis(workflow_id, "Workflow started.")
    log_to_redis(workflow_id, str(workflow.get("workflow", [])))

    gmail_token = request.headers.get("x-gmail-token")
    notion_token = request.headers.get("x-notion-token")
    context = {}  # Initialize the mutable context dictionary

    # Fetch user from workflow['owner'] or session
    username = workflow.get("owner")
    user = db.query(UserDB).filter_by(username=username).first() if username else None

    tokens = {
        "gmail_token": gmail_token,
        "notion_token": notion_token,
        "user": user,  # Pass the user object
    }    
    steps = workflow.get("workflow", [])
    log_to_redis(workflow_id, str(steps))
    edges = workflow.get("edges", [])  # Get all edges

    # Build graph representation
    graph = {step["id"]: [] for step in steps}
    for edge in edges:
        source = edge["source"]
        target = edge["target"]
        graph[source].append(target)

    # Perform topological sorting
    def topological_sort(graph):
        visited = set()
        stack = []
        result = []

        def dfs(node):
            if node in visited:
                return
            visited.add(node)
            for neighbor in graph.get(node, []):
                dfs(neighbor)
            stack.append(node)

        for node in graph:
            dfs(node)

        while stack:
            result.append(stack.pop())
        return result

    execution_order = topological_sort(graph)
    log_to_redis(workflow_id, f"Execution order: {execution_order}")

    # Execute steps in order
    for step_id in execution_order:
        step = next((s for s in steps if s["id"] == step_id), None)
        log_to_redis(workflow_id, f"step {step.get('service')}")
        if not step:
            continue
        handler = STEP_REGISTRY.get((step.get("type"), step.get("service")))
        if handler:
            try:
                result = handler(step, context, tokens)  # Pass context to each step
                if result:
                    context[f"{step.get('id')}_result"] = result  # Store step output in context
                log_to_redis(workflow_id, f"Step {step_id} completed.")
                log_to_redis(workflow_id, str(result))
            except Exception as e:
                log_to_redis(workflow_id, f"Error in step {step_id}: {str(e)}")
                return {"error": f"Step {step_id} failed: {str(e)}"}

    log_to_redis(workflow_id, "Workflow executed.")
    return {
        "message": "Workflow executed.",
        "workflow_id": workflow_id,
        "execution_order": execution_order,  # Return the execution order
        "context": context,  # Return the final context
    }

@router.delete("/delete/{workflow_id}")
def delete_workflow(workflow_id: int, db: Session = Depends(get_db)):
    wf = db.query(WorkflowDB).filter_by(id=workflow_id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    db.delete(wf)
    db.commit()
    return {"message": "Workflow deleted"}

@router.websocket("/ws/workflow_log/{workflow_id}")
async def websocket_workflow_log(websocket: WebSocket, workflow_id: str):
    print(f"[WS] Connection attempt for workflow_id: {workflow_id}")
    await websocket.accept()
    last_index = r.llen(f"workflow:{workflow_id}:log")  # Start at the end
    try:
        while True:
            logs = r.lrange(f"workflow:{workflow_id}:log", last_index, -1)
            if logs:
                for log in logs:
                    print(f"[WS] Sending log to client: {log}")
                    await websocket.send_text(log)
                last_index += len(logs)
            await asyncio.sleep(1)
    except Exception as e:
        print(f"[WS] Exception: {e}")
    finally:
        print(f"[WS] Connection closed for workflow_id: {workflow_id}")


@router.delete("/clear_all")
def clear_all_workflows(db: Session = Depends(get_db)):
    db.query(WorkflowDB).delete()
    db.commit()
    return {"message": "All workflows deleted"}

@router.post("/tools/googlesheets")
def google_sheets_stub():
    return {"message": "Google Sheets endpoint stub"}

@router.post("/tools/slack")
def slack_stub():
    return {"message": "Slack endpoint stub"}

@router.post("/tools/facebook")
def facebook_stub():
    return {"message": "Facebook endpoint stub"}

@router.post("/tools/yahoofinance")
def yahoo_finance_stub():
    return {"message": "Yahoo Finance endpoint stub"}

@router.post("/tools/openai")
def openai_stub():
    return {"message": "OpenAI endpoint stub"}

@router.post("/tools/twilio")
def twilio_stub():
    return {"message": "Twilio endpoint stub"}

@router.post("/tools/openai/generate")
def openai_generate(prompt: str = Body(...), api_key: str = Body(None)):
    client = OpenAI(api_key=OPENAI_API_KEY)
    try:
        response = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.6,
            max_tokens=300
        )
        return {"result": response.choices[0].message.content}
    except Exception as e:
        return {"error": str(e)}

@router.post("/save_gmail_token")
def save_gmail_token(data: dict, db: Session = Depends(get_db)):
    username = data.get("username")
    access_token = data.get("gmail_access_token")
    refresh_token = data.get("gmail_refresh_token")
    token_expiry = data.get("gmail_token_expiry")
    if not username or not access_token:
        return {"error": "Missing username or gmail_access_token"}
    user = db.query(UserDB).filter_by(username=username).first()
    if not user:
        return {"error": "User not found"}
    user.gmail_access_token = access_token
    if refresh_token:
        user.gmail_refresh_token = refresh_token
    if token_expiry:
        # Convert ms timestamp to datetime
        user.gmail_token_expiry = datetime.fromtimestamp(int(token_expiry) / 1000)
    db.commit()
    return {"message": "Gmail token info saved"}

@router.post("/exchange_gmail_code")
def exchange_gmail_code(data: dict, db: Session = Depends(get_db)):
   
 

    logger.info("Received request to exchange Gmail code")
    code = data.get("code")
    username = data.get("username")
    if not code or not username:
        logger.warning("Missing code or username")
        return {"error": "Missing code or username"}
    user = db.query(UserDB).filter_by(username=username).first()
    if not user:
        return {"error": "User not found"}

    # Exchange code for tokens
    token_url = "https://oauth2.googleapis.com/token"
    payload = {
        "client_id": os.environ["GOOGLE_OAUTH_CLIENT_ID"],
        "client_secret": os.environ["GOOGLE_OAUTH_CLIENT_SECRET"],
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": "postmessage",  # for popup/SPA, use "postmessage"
    }
    resp = requests.post(token_url, data=payload)
    if resp.status_code != 200:
        return {"error": "Failed to exchange code", "details": resp.text}
    tokens = resp.json()
    user.gmail_access_token = tokens.get("access_token")
    user.gmail_refresh_token = tokens.get("refresh_token")
    expires_in = tokens.get("expires_in")
    if expires_in:
        user.gmail_token_expiry = datetime.utcnow() + timedelta(seconds=expires_in)
    db.commit()
    return {
        "gmail_access_token": user.gmail_access_token,
        "gmail_refresh_token": user.gmail_refresh_token,
        "gmail_token_expiry": user.gmail_token_expiry.isoformat() if user.gmail_token_expiry else None,
    }

