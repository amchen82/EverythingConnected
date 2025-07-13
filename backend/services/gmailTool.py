from abc import ABC
from typing import Dict, Any
from authlib.integrations.starlette_client import OAuth
import requests

from .ToolInterface import ToolInterface

class GmailTool(ToolInterface):
    def __init__(self):
        self.oauth = OAuth()
        self.oauth.register(
            name='gmail',
            client_id='YOUR_GMAIL_CLIENT_ID',
            client_secret='YOUR_GMAIL_CLIENT_SECRET',
            access_token_url='https://oauth2.googleapis.com/token',
            authorize_url='https://accounts.google.com/o/oauth2/auth',
            api_base_url='https://www.googleapis.com/gmail/v1/',
            client_kwargs={'scope': 'https://www.googleapis.com/auth/gmail.readonly'},
        )

    def get_oauth_config(self) -> Dict[str, Any]:
        return {
            "client_id": "YOUR_GMAIL_CLIENT_ID",
            "authorize_url": "https://accounts.google.com/o/oauth2/auth",
            "scopes": ["https://www.googleapis.com/auth/gmail.readonly"],
        }

    async def handle_oauth_callback(self, request: Any) -> Dict[str, Any]:
        token = await self.oauth.gmail.authorize_access_token(request)
        user_info = await self.oauth.gmail.get("https://www.googleapis.com/oauth2/v1/userinfo")
        return {"access_token": token["access_token"], "user_info": user_info.json()}

    def execute_action(self, action: str, params: Dict[str, Any]) -> Any:
        if action == "send_email":
            headers = {"Authorization": f"Bearer {params['token']}"}
            data = {
                "raw": params["email_data"],  # Base64-encoded email content
            }
            response = requests.post(
                "https://www.googleapis.com/gmail/v1/users/me/messages/send",
                headers=headers,
                json=data,
            )
            return response.json()
        else:
            raise ValueError(f"Unsupported action: {action}")

    def revoke_token(self, token: str) -> None:
        requests.post(
            "https://oauth2.googleapis.com/revoke",
            params={"token": token},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )