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

import os
import logging
import uuid

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
def run_workflow(workflow: dict, request: Request):
    request_id = str(uuid.uuid4())
    workflow_id = workflow.get("id", "default")
    log_to_redis(workflow_id, "------------------------------------------------------")
    log_to_redis(workflow_id, "Workflow started.")
    log_to_redis(workflow_id, str(workflow.get("workflow", [])))

    gmail_token = request.headers.get("x-gmail-token")
    notion_token = request.headers.get("x-notion-token")
    trigger_data = None
    openai_result = None

    # --- Sort steps: trigger first, then by service ---
    steps = workflow.get("workflow", [])
    steps_sorted = sorted(
        steps,
        key=lambda s: (0 if s.get("type") == "trigger" else 1, s.get("service", ""))
    )


    for idx, step in enumerate(steps_sorted):
        step_id = step.get("id", f"step-{idx}")
        logger.info(
            f"{request_id} {step_id} Running step: {step.get('service')} ({step.get('type')})"
           
        )
        # Gmail trigger
        if step.get("type") == "trigger" and step.get("service") == "gmail":
            log_to_redis(workflow_id, "Checking new email...")
            trigger_data = check_new_email(gmail_token)
            logger.info(f"{request_id} {step_id} [RUN] Trigger data: {trigger_data}")
            if not trigger_data:
                log_to_redis(workflow_id, "No new email.")
                return {"message": "No new email.", "workflow_id": workflow_id}
            log_to_redis(workflow_id, f"New email: {trigger_data}")

        # Notion action
        elif step.get("type") == "action" and step.get("service") == "notion":
            if trigger_data and notion_token:
                log_to_redis(workflow_id, "Creating Notion page...")
                title = trigger_data.get("subject", "New Page")
                content = trigger_data.get("body", "Created from EverythingConnected")
                parent_id = step.get("parentId")
                result = create_notion_page(notion_token, title=title, content=content, parent_id=parent_id)
                if result:
                    log_to_redis(workflow_id, "Notion page created.")
                else:
                    log_to_redis(workflow_id, "Failed to create Notion page.")

        # OpenAI action
        elif step.get("type") == "action" and step.get("service") == "openai":
            if trigger_data:
                log_to_redis(workflow_id, "Calling OpenAI...")
                prompt = step.get("prompt", "Summarize the following email:")
                log_to_redis(workflow_id, f"Prompt: {prompt}")
                email_body = trigger_data
                # Combine prompt and email body
                full_prompt = f"{prompt}\n\nEmail Content:\n{email_body}"
                client = OpenAI(api_key=OPENAI_API_KEY)
                try:
                    response = client.chat.completions.create(
                        model="gpt-4.1-mini",
                        messages=[{"role": "user", "content": full_prompt}],
                        temperature=0.6,
                        max_tokens=300
                    )
                    openai_result = response.choices[0].message.content
                    logger.info(
                                f"{request_id} {step_id} OpenAI result: {openai_result}"
                    )
                    log_to_redis(workflow_id, f"OpenAI result: {openai_result}")
                except Exception as e:
                    log_to_redis(workflow_id, f"OpenAI error: {str(e)}")
                    openai_result = None

    log_to_redis(workflow_id, "Workflow executed.")
    log_to_redis(workflow_id, "------------------------------------------------------")
    return {
        "message": "Workflow executed.",
        "workflow_id": workflow_id,
        "openai_result": openai_result,
        "trigger_data": trigger_data
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

