# backend/routers/workflows.py
from fastapi import APIRouter, HTTPException
from backend.models.workflow import Workflow
from backend.services.gmail import check_new_email
from backend.services.notion import create_notion_page

router = APIRouter()

# In-memory workflow storage for example
db = []

@router.post("/save")
def save_workflow(workflow: Workflow):
    db.append(workflow.dict())
    return {"message": "Workflow saved."}

@router.post("/run")
def run_workflow():
    for workflow in db:
        steps = workflow["workflow"]
        trigger_data = None
        for step in steps:
            if step["type"] == "trigger" and step["service"] == "gmail":
                trigger_data = check_new_email()
                if not trigger_data:
                    return {"message": "No new email."}
            elif step["type"] == "action" and step["service"] == "notion":
                if trigger_data:
                    create_notion_page(trigger_data)
    return {"message": "Workflow executed."}
