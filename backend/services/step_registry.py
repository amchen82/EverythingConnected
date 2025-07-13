from models.db import UserDB
from services.gmail import check_new_email, get_valid_gmail_token
from services.notion import create_notion_page
from openai import OpenAI
import os

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")

STEP_REGISTRY = {}

def register_step(step_type, service):
    def decorator(func):
        STEP_REGISTRY[(step_type, service)] = func
        return func
    return decorator

@register_step("trigger", "gmail")
def handle_gmail_trigger(step, context, tokens):
    user = tokens.get("user")
    gmail_token = get_valid_gmail_token(user)
    emails = check_new_email(gmail_token)
    if emails:
        context["trigger_data"] = emails
    return emails

@register_step("action", "notion")
def handle_notion_action(step, context, tokens):
    notion_token = tokens.get("notion_token")
    trigger_data = context.get("trigger_data")  # Use data from the previous step
    if trigger_data and notion_token:
        title = "new page"
        content =  "Created from EverythingConnected"
        # parent_id = step.get("parentId", "Try-AI-Meeting-Notes-21fa46cfaac28026912dc2e6a0539ea5")
        return create_notion_page(notion_token, title=title, content=content, parent_id="Try-AI-Meeting-Notes-21fa46cfaac28026912dc2e6a0539ea5")

@register_step("action", "openai")
def handle_openai_action(step, context, tokens):
    trigger_data = context.get("trigger_data")  # Use data from the Gmail step
    if trigger_data:
        prompt = step.get("prompt", "Summarize the following email:")
        email_body = trigger_data
        full_prompt = f"{prompt}\n\nEmail Content:\n{email_body}"
        client = OpenAI(api_key=OPENAI_API_KEY)
        response = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[{"role": "user", "content": full_prompt}],
            temperature=0.6,
            max_tokens=300
        )
        return response.choices[0].message.content
    return None