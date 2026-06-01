#!/bin/bash

cd "$(dirname "$0")/backend"

if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate

echo "Installing dependencies..."
pip install -q -r requirements.txt

echo "Starting backend server..."
echo "Backend will be available at: http://localhost:8001"
echo "API docs: http://localhost:8001/docs"
python run.py
