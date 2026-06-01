#!/bin/bash

echo "🎨 启动通勤租房分析器前端服务..."

cd "$(dirname "$0")/frontend"

if [ ! -d "node_modules" ]; then
    echo "📦 安装npm依赖..."
    npm install
fi

echo "🌐 启动Vue开发服务器 (端口 3000)..."
npm run dev
