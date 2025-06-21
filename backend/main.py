# backend/main.py
from fastapi import FastAPI
from routers import workflows, auth
from fastapi.middleware.cors import CORSMiddleware
from database import init_db

app = FastAPI()
init_db()  # <-- Add this line

app.include_router(workflows.router, prefix="/workflows")
app.include_router(auth.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # or specify ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)