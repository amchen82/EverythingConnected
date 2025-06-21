# EverythingConnected

#   Todo: 
#   implement gmail sign in to integration
#   implement notion sign in to integrate
#   implement openai summarize
#   make front end look more professional 
#   add schedule to run button, implement queue
#   add real db 
#   add more test cases

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
