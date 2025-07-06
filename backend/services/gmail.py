# backend/services/gmail.py
import os
import requests
import base64
from requests_oauthlib import OAuth2Session
from models.db import UserDB
from datetime import datetime, timedelta

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_OAUTH_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_OAUTH_CLIENT_SECRET")

def check_new_email(token=None):
    if token:
        headers = {
            "Authorization": f"Bearer {token}"
        }
        resp = requests.get(
            "https://gmail.googleapis.com/gmail/v1/users/me/messages",
            headers=headers,
            params={"maxResults": 10, "q": "category:primary"}
        )
        if resp.status_code != 200:
            print("Failed to fetch Gmail messages:", resp.text)
            return None

        messages = resp.json().get("messages", [])
        print(f"Found {len(messages)} messages.")
        if not messages:
            return []

        emails = []
        for msg in messages:
            msg_id = msg["id"]
            msg_detail = requests.get(
                f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{msg_id}",
                headers=headers,
                params={"format": "full"}
            )
            if msg_detail.status_code != 200:
                print(f"Failed to fetch Gmail message detail for {msg_id}: {msg_detail.text}")
                continue

            payload = msg_detail.json().get("payload", {})
            headers_list = payload.get("headers", [])
            sender = next((h["value"] for h in headers_list if h["name"] == "From"), "(Unknown Sender)")
            subject = next((h["value"] for h in headers_list if h["name"] == "Subject"), "(No Subject)")
            body = ""
            parts = payload.get("parts", [])
            for part in parts:
                if part.get("mimeType") == "text/plain":
                    data = part.get("body", {}).get("data", "")
                    try:
                        decoded = base64.urlsafe_b64decode(data.encode("ASCII")).decode("utf-8")
                        body = decoded.strip()
                        break
                    except Exception:
                        continue
            if not body:
                body = msg_detail.json().get("snippet", "")

            # --- Add date/time ---
            internal_date = msg_detail.json().get("internalDate")
            if internal_date:
                # Convert from ms to seconds, then to datetime
                dt = datetime.fromtimestamp(int(internal_date) / 1000)
                date_str = dt.isoformat()
            else:
                date_str = None

            emails.append({
                "from": sender,
                "subject": subject,
                "body": body[:100],
                "date": date_str  # <-- Add this line
            })

        return emails

    # Fallback: Simulate polling Gmail (for testing)
    print("Checking Gmail for new email (no token)...")
    return [
        {
            "subject": f"Test Email {i+1}",
            "body": "This is a test email body."[:100]
        }
        for i in range(10)
    ]

def get_valid_gmail_token(user: UserDB):
    # Check expiry
    if user.gmail_token_expiry < datetime.utcnow():
        # Refresh token
        extra = {
            'client_id': GOOGLE_CLIENT_ID,
            'client_secret': GOOGLE_CLIENT_SECRET,
        }
        oauth = OAuth2Session(GOOGLE_CLIENT_ID, token={
            'refresh_token': user.gmail_refresh_token,
            'token_type': 'Bearer',
            'expires_in': -30,  # force refresh
        })
        token = oauth.refresh_token(
            'https://oauth2.googleapis.com/token',
            refresh_token=user.gmail_refresh_token,
            **extra
        )
        # Update DB
        user.gmail_access_token = token['access_token']
        user.gmail_token_expiry = datetime.utcnow() + timedelta(seconds=token['expires_in'])
        # Save user to DB here
    return user.gmail_access_token
