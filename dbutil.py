from backend.database import SessionLocal
from backend.models.db import WorkflowDB

def clear_all_workflows():
    db = SessionLocal()
    try:
        deleted = db.query(WorkflowDB).delete()
        db.commit()
        print(f"Deleted {deleted} workflows.")
    finally:
        db.close()

if __name__ == "__main__":
    clear_all_workflows()