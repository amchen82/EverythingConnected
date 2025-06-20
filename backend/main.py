# backend/main.py
from fastapi import FastAPI
from backend.routers import workflows
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

from backend.routers import auth
app.include_router(auth.router)  # ← add this!



app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # or specify ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(workflows.router, prefix="/workflows")