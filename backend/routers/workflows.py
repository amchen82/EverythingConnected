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
    print(workflow)
    db.append(workflow.dict())
    return {"message": "Workflow saved."}

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

