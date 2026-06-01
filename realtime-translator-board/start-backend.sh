#!/bin/bash

cd "$(dirname "$0")/backend"

if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate

if [ ! -f "venv/.installed" ]; then
    echo "Installing dependencies..."
    pip install -r requirements.txt
    touch venv/.installed
fi

echo "Starting FastAPI server on port 8000..."
uvicorn websocket:app --reload --host 0.0.0.0 --port 8000
