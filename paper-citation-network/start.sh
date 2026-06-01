#!/bin/bash

cd "$(dirname "$0")"

if [ -d "venv" ]; then
    source venv/bin/activate
else
    echo "Creating virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
fi

echo "Starting Paper Citation Network Analyzer..."
echo "Open http://localhost:5000 in your browser"
echo ""

python app.py
