# EverythingConnected

#   Todo: 
#   implement gmail sign in to integration
#   implement notion sign in to integrate
#   implement openai summarize
#   make front end look more professional 
#   add schedule to run button, implement queue
#   add real db 
#   add more test cases
<!-- 4. Security & Configuration
Secrets Management: Never hardcode secrets. Use environment variables and consider a secrets manager for production.
OAuth Tokens: Store and refresh OAuth tokens securely, and never expose them to the frontend.
CORS: Restrict allow_origins to trusted domains in production. -->


---

## Frontend Overview

The `frontend` directory contains a React application (TypeScript, [Create React App](https://create-react-app.dev/)) for visually building and running automation workflows.

### Key Features

- **Login/Signup**: Simple email/password authentication UI ([`src/pages/Login.tsx`](frontend/src/pages/Login.tsx)).
- **Workflow Builder**: Drag-and-drop interface to create workflows using services like Gmail and Notion ([`src/pages/WorkflowBuilder.tsx`](frontend/src/pages/WorkflowBuilder.tsx), [`src/components/Canvas.tsx`](frontend/src/components/Canvas.tsx)).
- **Workflow Canvas**: Users can add, connect, and edit nodes representing workflow steps.
- **Save/Run Workflow**: Workflows can be saved or executed via API calls to the backend.
- **Testing**: Includes setup for React Testing Library ([`src/setupTests.ts`](frontend/src/setupTests.ts)).

### Structure

- `src/pages/`: Main app pages (Login, WorkflowBuilder)
- `src/components/`: Reusable UI components (Canvas, IconNode)
- `src/App.tsx`: App entry, handles authentication state
- `public/`: Static assets and HTML template

### Development

- Start the frontend with `npm start` in the `frontend` directory.
- The app communicates with the backend at `http://localhost:8000`.

## Backend Overview

The `backend` directory contains a Python FastAPI application that provides RESTful APIs for authentication, workflow management, and integration with external services.

### Key Features

- **Authentication**: Endpoints for user registration and login using email/password.
- **Workflow Management**: APIs to create, save, retrieve, and execute user-defined workflows.
- **Service Integrations**: Supports integration with services like Gmail and Notion for workflow automation.
- **Summarization**: Provides endpoints to summarize content using OpenAI.
- **Database**: Currently uses an in-memory or simple file-based store (planned upgrade to a real database).
- **Testing**: Includes unit tests for API endpoints.

### Structure

- `main.py`: FastAPI app entry point, route definitions.
- `models.py`: Pydantic models for request/response schemas.
- `services/`: Logic for external service integrations (Gmail, Notion, OpenAI).
- `auth.py`: Authentication utilities and endpoints.
- `tests/`: Backend API test cases.

### Development

- Start the backend with `uvicorn main:app --reload` in the `backend` directory.
- The backend listens on `http://localhost:8000` and connects to the frontend at the same address.

docker run -p 6379:6379 redis
celery -A celery_app.celery_app worker --loglevel=info --pool=solo





# Change Summary - 2025/06/23

## Frontend
- Improved Google Sign-In integration in Node Edit popup (now uses OAuth2 access token for Gmail API).
- Added professional status display and Sign Out button for Gmail connection in Node Edit.
- Added output panel at the bottom of Canvas to display workflow run results.
- Updated workflow run logic to send Gmail token and display backend messages in the output panel instead of alerts.
- Removed unused `handleRun` function for clarity.
- Fixed Canvas ref and imperative handle to ensure output updates correctly.

## Backend
- Updated `/workflows/run` endpoint to return new email summary or message for Canvas output.
- Improved Gmail service to use access token for fetching latest email.
- Added logging for debugging token passing and backend responses.

## General
- Updated README with tonight’s changes.
- Improved error handling and logging for both frontend and backend.


