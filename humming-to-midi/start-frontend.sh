#!/bin/bash

cd "$(dirname "$0")/frontend"

if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

echo "Starting frontend dev server..."
echo "Frontend will be available at: http://localhost:3001"
npm run dev
