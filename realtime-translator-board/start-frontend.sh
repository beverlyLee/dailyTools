#!/bin/bash

cd "$(dirname "$0")/frontend"

if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

echo "Starting Next.js frontend on port 3001..."
npm run dev
