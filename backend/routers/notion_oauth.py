# backend/routers/notion_oauth.py
from fastapi import APIRouter, Request
from starlette.responses import RedirectResponse
from authlib.integrations.starlette_client import OAuth
import os
from dotenv import load_dotenv

load_dotenv()

# // add logging
print(os.environ['NOTION_CLIENT_ID'], os.environ['NOTION_CLIENT_SECRET'])
router = APIRouter()
oauth = OAuth()
oauth.register(
    name='notion',
    client_id=os.environ['NOTION_CLIENT_ID'],
    client_secret=os.environ['NOTION_CLIENT_SECRET'],
    access_token_url='https://api.notion.com/v1/oauth/token',
    authorize_url='https://api.notion.com/v1/oauth/authorize',
    api_base_url='https://api.notion.com/v1/',
    client_kwargs={'scope': 'database.read database.write'},
)

@router.get("/notion/oauth/start")
async def notion_oauth_start(request: Request):
    redirect_uri = "http://localhost:8000/notion/oauth/callback"
    return await oauth.notion.authorize_redirect(request, redirect_uri)

@router.get("/notion/oauth/callback")
async def notion_oauth_callback(request: Request):
    try:
        token = await oauth.notion.authorize_access_token(request)
    except Exception as e:
        print("Notion OAuth error:", e)
        raise
    response = RedirectResponse(url=f"http://localhost:3000/canvas?notion_token={token['access_token']}")
    return response