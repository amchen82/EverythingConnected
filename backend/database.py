# backend/database.py
# Placeholder for future DB integration
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.db import Base

DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)

    
def save_to_db(data):
    print("Saving to database")


def load_from_db():
    return []
