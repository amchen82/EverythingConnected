from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import declarative_base, relationship




Base = declarative_base()

class UserDB(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True, index=True)
    password = Column(String)

    workflows = relationship("WorkflowDB", back_populates="owner")

class WorkflowDB(Base):
    __tablename__ = "workflows"
    id = Column(Integer, primary_key=True)
    name = Column(String)
    workflow_json = Column(Text)  # Store workflow+edges as JSON string
    owner_id = Column(Integer, ForeignKey("users.id"))

    owner = relationship("UserDB", back_populates="workflows")