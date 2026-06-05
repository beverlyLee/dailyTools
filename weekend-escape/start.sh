#!/bin/bash

cd "$(dirname "$0")"

echo "========================================"
echo "  周末出行指南 - Weekend Escape"
echo "========================================"

if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate

echo "Installing dependencies..."
pip install -r requirements.txt -q

echo ""
echo "Starting server..."
echo "Open http://localhost:8000 in your browser"
echo ""

python src/main.py
