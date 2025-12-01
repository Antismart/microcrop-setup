#!/bin/bash

# MicroCrop Data Processor - Celery Worker Startup Script

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Activate virtual environment
source venv/bin/activate

# Set Python path
export PYTHONPATH="$SCRIPT_DIR:$PYTHONPATH"

# Check if .env exists
if [ ! -f "$SCRIPT_DIR/.env" ]; then
    echo "⚠️  Warning: .env file not found"
    echo "Creating .env from .env.example..."
    if [ -f "$SCRIPT_DIR/.env.example" ]; then
        cp "$SCRIPT_DIR/.env.example" "$SCRIPT_DIR/.env"
    fi
fi

echo "🚀 Starting MicroCrop Celery Worker..."
echo "📂 Working directory: $SCRIPT_DIR"
echo "🐍 Python path: $PYTHONPATH"
echo ""

# Start Celery worker
python -m celery -A src.workers.celery_app worker \
    --loglevel=info \
    --concurrency=4 \
    --queues=default,blockchain,weather,satellite,damage \
    --hostname=worker-main@%h \
    --max-tasks-per-child=100 \
    --time-limit=300 \
    --soft-time-limit=240
