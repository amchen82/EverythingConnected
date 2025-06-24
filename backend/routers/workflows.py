# backend/routers/workflows.py
from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.orm import Session
from models.workflow import Workflow
from models.db import WorkflowDB, UserDB
from database import SessionLocal
from services.gmail import check_new_email
from services.notion import create_notion_page  # if you have this service
import json
from tasks import run_workflow_task 

from pydantic import BaseModel

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
def run_workflow(workflow: Workflow, request: Request):
    trigger_data = None
    gmail_token = request.headers.get("x-gmail-token")  # Get token from header
    print("Running workflow with Gmail token:", gmail_token)
    print("Headers:", request.headers)  # <-- Log headers for debuggingRequest.headers)  # <-- Log headers for debugging
    
    for step in workflow.workflow:
        if step.type == "trigger" and step.service == "gmail":
            print("checking new email")
            trigger_data = check_new_email(gmail_token)  # Pass token
            if not trigger_data:
                return {"message": "No new email."}

        elif step.type == "action" and step.service == "notion":
        
            if trigger_data:
                print("create notion page")
                create_notion_page(trigger_data)

    return {"message": "Workflow executed."}

@router.delete("/delete/{workflow_id}")
def delete_workflow(workflow_id: int, db: Session = Depends(get_db)):
    wf = db.query(WorkflowDB).filter_by(id=workflow_id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    db.delete(wf)
    db.commit()
    return {"message": "Workflow deleted"}

