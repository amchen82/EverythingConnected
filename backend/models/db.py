from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import declarative_base, relationship




Base = declarative_base()

class UserDB(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True)
    password = Column(String)
    gmail_access_token = Column(String)
    gmail_refresh_token = Column(String)
    gmail_token_expiry = Column(DateTime)

    workflows = relationship("WorkflowDB", back_populates="owner")

class WorkflowDB(Base):
    __tablename__ = "workflows"
    id = Column(Integer, primary_key=True)
    name = Column(String)
    workflow_json = Column(Text)  # Store workflow+edges as JSON string
    owner_id = Column(Integer, ForeignKey("users.id"))

    owner = relationship("UserDB", back_populates="workflows")