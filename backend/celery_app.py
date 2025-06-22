from celery import Celery

celery_app = Celery(
    "everything_connected",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/0"
)

import tasks  # <-- Add this line to ensure tasks are registered