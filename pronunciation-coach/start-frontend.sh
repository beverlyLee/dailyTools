#!/bin/bash

cd "$(dirname "$0")/frontend"

if [ ! -d "node_modules" ]; then
    echo "安装依赖..."
    npm install
fi

echo "启动前端服务 (端口 5173)..."
npm run dev
