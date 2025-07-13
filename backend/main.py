# backend/main.py
from fastapi import FastAPI
from routers import workflows, auth
from fastapi.middleware.cors import CORSMiddleware
from database import init_db
from dotenv import load_dotenv
import os
from routers import notion_oauth
from starlette.middleware.sessions import SessionMiddleware

load_dotenv()

app = FastAPI()
import secrets

secret_key = os.environ.get("SESSION_SECRET_KEY", "dev-secret-key")
app.add_middleware(SessionMiddleware, secret_key=secret_key)

init_db()  # <-- Add this line


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Allow requests from the frontend
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],  # Allow all headers
)

app.include_router(workflows.router, prefix="/workflows")
app.include_router(auth.router)
app.include_router(notion_oauth.router)

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_OAUTH_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_OAUTH_CLIENT_SECRET")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")