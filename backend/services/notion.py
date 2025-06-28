# backend/services/notion.py
from notion_client import Client

def extract_notion_uuid(raw_id):
    # Handles URLs and slugs, returns just the 32-char UUID (with or without dashes)
    import re
    # Remove URL parts if present
    if "/" in raw_id:
        raw_id = raw_id.split("/")[-1]
    # Remove query params/fragments
    raw_id = raw_id.split("?")[0].split("#")[0]
    # Find the 32-char hex string at the end
    match = re.search(r"([0-9a-fA-F]{32})", raw_id.replace("-", ""))
    if match:
        return match.group(1)
    return raw_id

def create_notion_page(token, title="New Page", content="Created from EverythingConnected", parent_id=None, parent_type="page_id"):
    notion = Client(auth=token)
    if not parent_id:
        print("No parent_id provided for Notion page creation.")
        return None
    # Extract UUID
    notion_uuid = extract_notion_uuid(parent_id)
    # Split content into 2000-char chunks
    max_len = 2000
    paragraphs = [
        {
            "object": "block",
            "type": "paragraph",
            "paragraph": {
                "rich_text": [
                    {
                        "type": "text",
                        "text": {"content": content[i:i+max_len]},
                    }
                ]
            },
        }
        for i in range(0, len(content), max_len)
    ]
    try:
        parent = {parent_type: notion_uuid}
        new_page = notion.pages.create(
            parent=parent,
            properties={
                "title": [
                    {
                        "type": "text",
                        "text": {"content": title},
                    }
                ]
            },
            children=paragraphs,
        )
        return new_page
    except Exception as e:
        print("Notion create page error:", e)
        return None
