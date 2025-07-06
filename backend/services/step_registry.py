from services.gmail import check_new_email
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
    gmail_token = tokens.get("gmail_token")
    emails = check_new_email(gmail_token)
    return emails

@register_step("action", "notion")
def handle_notion_action(step, context, tokens):
    notion_token = tokens.get("notion_token")
    trigger_data = context.get("trigger_data")
    if trigger_data and notion_token:
        title = trigger_data.get("subject", "New Page")
        content = trigger_data.get("body", "Created from EverythingConnected")
        parent_id = step.get("parentId")
        return create_notion_page(notion_token, title=title, content=content, parent_id=parent_id)
    return None

@register_step("action", "openai")
def handle_openai_action(step, context, tokens):
    trigger_data = context.get("trigger_data")
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