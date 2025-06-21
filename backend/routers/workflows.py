# backend/routers/workflows.py
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from models.workflow import Workflow
from models.db import WorkflowDB, UserDB
from database import SessionLocal
from services.gmail import check_new_email
from services.notion import create_notion_page  # if you have this service
import json

router = APIRouter()

# In-memory workflow storage for example
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/user/{username}")
def get_user_workflows(username: str, db: Session = Depends(get_db)):
    user = db.query(UserDB).filter_by(username=username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return [json.loads(wf.workflow_json) for wf in user.workflows]

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
def run_workflow(workflow: Workflow):
    trigger_data = None

    for step in workflow.workflow:
        if step.type == "trigger" and step.service == "gmail":
            print("checking new email")
            trigger_data = check_new_email()
            if not trigger_data:
                return {"message": "No new email."}

        elif step.type == "action" and step.service == "notion":
        
            if trigger_data:
                print("create notion page")
                create_notion_page(trigger_data)

    return {"message": "Workflow executed."}

