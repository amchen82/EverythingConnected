from pydantic import BaseModel
from typing import List

class Step(BaseModel):
    type: str  # trigger or action
    service: str
    action: str

class Workflow(BaseModel):
    name: str                   # 🔹 add this line
    workflow: List[Step]
    owner: str
