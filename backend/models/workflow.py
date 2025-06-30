from pydantic import BaseModel
from typing import List, Optional, Any

class Step(BaseModel):
    id: str  # <-- Add this line
    type: str  # trigger or action
    service: str
    action: str
    parentId: Optional[str] = None

class Workflow(BaseModel):
    name: str                   # 🔹 add this line
    workflow: List[Step]
    edges: List[Any] = []   # <-- Add this line
    owner: str
