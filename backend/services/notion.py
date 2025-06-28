# backend/services/notion.py
from notion_client import Client

def create_notion_page(token, title="New Page", content="Created from EverythingConnected"):
    notion = Client(auth=token)
    parent_id = "21fa46cfaac28026912dc2e6a0539ea5"
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
        new_page = notion.pages.create(
            parent={"type": "page_id", "page_id": parent_id},
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
