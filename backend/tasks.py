from celery_app import celery_app

@celery_app.task
def run_workflow_task(workflow_id):
    print(f"Running workflow {workflow_id}")
    # Add your workflow execution logic here