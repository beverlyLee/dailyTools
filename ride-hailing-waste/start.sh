#!/bin/bash

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

cd "$PROJECT_DIR"

if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate

if [ -f "requirements.txt" ]; then
    echo "Installing dependencies..."
    pip install -q -r requirements.txt
fi

echo "Starting ride-hailing waste analysis server..."
echo "Server will be available at http://localhost:8000"

cd src
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
