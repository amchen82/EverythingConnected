from pydantic import BaseModel, EmailStr

class User(BaseModel):
    username: EmailStr  # ✅ must be a valid email
    password: str
