from pydantic import BaseModel
from typing import List
from typing import List, Any  # <-- Add Any here

class Step(BaseModel):
    type: str  # trigger or action
    service: str
    action: str

class Workflow(BaseModel):
    name: str                   # 🔹 add this line
    workflow: List[Step]
    edges: List[Any] = []   # <-- Add this line
    owner: str
