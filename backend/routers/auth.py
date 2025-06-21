from fastapi import APIRouter, HTTPException
from models.user import User

router = APIRouter()
fake_users_db = {}  # Replace with real DB later

@router.post("/login")
def login(user: User):
    if user.username not in fake_users_db:
        raise HTTPException(status_code=404, detail="User not found. Please sign up.")
    if fake_users_db[user.username] != user.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"token": user.username}

@router.post("/signup")
def signup(user: User):
    if user.username in fake_users_db:
        raise HTTPException(status_code=409, detail="Email already registered.")
    fake_users_db[user.username] = user.password
    return {"token": user.username}
