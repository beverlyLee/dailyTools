#!/bin/bash
cd "$(dirname "$0")/frontend"
echo "🌐 启动前端服务..."
npm install
npm run dev
