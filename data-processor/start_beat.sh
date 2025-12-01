#!/bin/bash

# MicroCrop Data Processor - Celery Beat Startup Script  

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Activate virtual environment
source venv/bin/activate

# Set Python path
export PYTHONPATH="$SCRIPT_DIR:$PYTHONPATH"

echo "⏰ Starting MicroCrop Celery Beat (Scheduler)..."
echo "📂 Working directory: $SCRIPT_DIR"
echo ""

# Start Celery beat
python -m celery -A src.workers.celery_app beat \
    --loglevel=info \
    --pidfile=/tmp/celerybeat.pid \
    --schedule=/tmp/celerybeat-schedule.db
