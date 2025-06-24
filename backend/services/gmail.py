# backend/services/gmail.py
import requests
import base64

def check_new_email(token=None):
    if token:
        # Call Gmail API to get the latest email
        headers = {
            "Authorization": f"Bearer {token}"
        }
        # Get the list of messages
        resp = requests.get(
            "https://gmail.googleapis.com/gmail/v1/users/me/messages",
            headers=headers,
            params={"maxResults": 10, "q": "category:primary"}
        )
        if resp.status_code != 200:
            print("Failed to fetch Gmail messages:", resp.text)
            return None

        messages = resp.json().get("messages", [])
        print(f"Found {len(messages)} new messages.")
        if not messages:
            return None

        # Get the latest message details
        msg_id = messages[0]["id"]
        msg_detail = requests.get(
            f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{msg_id}",
            headers=headers,
            params={"format": "full"}
        )
        if msg_detail.status_code != 200:
            print("Failed to fetch Gmail message detail:", msg_detail.text)
            return None

        payload = msg_detail.json().get("payload", {})
        headers_list = payload.get("headers", [])
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

        print(f"New email found: {subject}")
        print(f"Email body: {body[:100]}...")  # Print first 100 chars for brevity

        return {
            "subject": subject,
            "body": body,
        }

    # Fallback: Simulate polling Gmail (for testing)
    print("Checking Gmail for new email (no token)...")
    return {
        "subject": "New Email Subject",
        "body": "This is a test email.",
    }
