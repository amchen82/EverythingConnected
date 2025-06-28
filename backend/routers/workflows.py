# backend/routers/workflows.py
from fastapi import APIRouter, HTTPException, Depends, Request, WebSocket
from sqlalchemy.orm import Session
from models.workflow import Workflow
from models.db import WorkflowDB, UserDB
from database import SessionLocal
from services.gmail import check_new_email
from services.notion import create_notion_page
import json
from tasks import run_workflow_task 

from pydantic import BaseModel
import redis
import asyncio

r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

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
    workflow_id = workflow.get("id", "default")
    log_to_redis(workflow_id, "------------------------------------------------------")
    log_to_redis(workflow_id, "Workflow started.")
    gmail_token = request.headers.get("x-gmail-token")
    notion_token = request.headers.get("x-notion-token")
    trigger_data = None
    for step in workflow.get("workflow", []):
        if step.get("type") == "trigger" and step.get("service") == "gmail":
            log_to_redis(workflow_id, "Checking new email...")
            trigger_data = check_new_email(gmail_token)
            print(f"[RUN] Trigger data: {trigger_data}")
            if not trigger_data:
                log_to_redis(workflow_id, "No new email.")
                return {"message": "No new email.", "workflow_id": workflow_id}
            log_to_redis(workflow_id, f"New email: {trigger_data['subject']}")
        elif step.get("type") == "action" and step.get("service") == "notion":
            if trigger_data and notion_token:
                log_to_redis(workflow_id, "Creating Notion page...")
                title = trigger_data.get("subject", "New Page")
                content = trigger_data.get("body", "Created from EverythingConnected")
                parent_id = step.get("parentId")  # <-- Get parentId from node
                result = create_notion_page(notion_token, title=title, content=content, parent_id=parent_id)
                if result:
                    log_to_redis(workflow_id, "Notion page created.")
                else:
                    log_to_redis(workflow_id, "Failed to create Notion page.")
    log_to_redis(workflow_id, "Workflow executed.")
    log_to_redis(workflow_id,"------------------------------------------------------")
    return {"message": "Workflow executed.", "workflow_id": workflow_id}

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

