# backend/models/workflow.py
from pydantic import BaseModel
from typing import List, Dict

class Step(BaseModel):
    type: str  # trigger or action
    service: str
    action: str

class Workflow(BaseModel):
    workflow: List[Step]
