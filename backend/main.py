# backend/main.py
from fastapi import FastAPI
from backend.routers import workflows

app = FastAPI()

app.include_router(workflows.router, prefix="/workflows")