#!/bin/bash

# MicroCrop Data Processor - Flower Monitoring Dashboard Startup Script

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Activate virtual environment
source venv/bin/activate

# Set Python path
export PYTHONPATH="$SCRIPT_DIR:$PYTHONPATH"

echo "🌸 Starting MicroCrop Flower Monitoring Dashboard..."
echo "📂 Working directory: $SCRIPT_DIR"
echo "🌐 Dashboard will be available at: http://localhost:5555"
echo ""

# Start Flower
python -m celery -A src.workers.celery_app flower \
    --port=5555 \
    --broker=redis://localhost:6379/0
