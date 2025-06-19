import pytest
from httpx import AsyncClient
from httpx._transports.asgi import ASGITransport
from backend.main import app
from backend.routers import workflows


@pytest.mark.asyncio
async def test_save_workflow():
    workflow_payload = {
        "workflow": [
            {"type": "trigger", "service": "gmail", "action": "new_file"},
            {"type": "action", "service": "notion", "action": "create_page"}
        ]
    }

    async with AsyncClient(  transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/workflows/save", json=workflow_payload)

    assert response.status_code == 200
    assert response.json() == {"message": "Workflow saved."}


@pytest.mark.asyncio
async def test_run_workflow_no_new_email(monkeypatch):
    # override Gmail polling to simulate no new email
    def mock_check_new_email():
        return None

    monkeypatch.setattr("backend.services.gmail.check_new_email", mock_check_new_email)

    async with AsyncClient(  transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/workflows/run")

    assert response.status_code == 200
    assert response.json()["message"] == "No new email."


@pytest.mark.asyncio
async def test_run_workflow_with_email(monkeypatch):
    # override Gmail polling to simulate a new email
    def mock_check_new_email():
        return {
            "subject": "Test Subject",
            "body": "Test Body"
        }

    # override Notion page creation to verify data
    def mock_create_notion_page(email_data):
        assert email_data["subject"] == "Test Subject"

    monkeypatch.setattr("backend.services.gmail.check_new_email", mock_check_new_email)
    monkeypatch.setattr("backend.services.notion.create_notion_page", mock_create_notion_page)

    async with AsyncClient(  transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/workflows/run")

    assert response.status_code == 200
    assert response.json()["message"] == "Workflow executed."
