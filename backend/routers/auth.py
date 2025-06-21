from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from models.user import User
from models.db import UserDB
from database import SessionLocal

router = APIRouter()



def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/signup")
def signup(user: User, db: Session = Depends(get_db)):
    if db.query(UserDB).filter_by(username=user.username).first():
        raise HTTPException(status_code=400, detail="User exists")
    db_user = UserDB(username=user.username, password=user.password)
    db.add(db_user)
    db.commit()
    return {"message": "User created"}

@router.post("/login")
def login(user: User, db: Session = Depends(get_db)):
    db_user = db.query(UserDB).filter_by(username=user.username).first()
    if not db_user or db_user.password != user.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    # Load workflows for this user
    workflows = db_user.workflows
    return {
        "token": user.username,
        "workflows": [w.workflow_json for w in workflows]
    }
