#!/bin/bash

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR/frontend"

echo "========================================="
echo "  Skyline Cement Forest - 前端服务"
echo "========================================="

echo ""
echo "检查 Node.js 环境..."
if ! command -v npm &> /dev/null; then
    echo "❌ 未找到 npm"
    exit 1
fi

echo "安装前端依赖..."
npm install

echo ""
echo "启动前端开发服务器..."
echo "前端将在 http://localhost:3000 启动"
echo ""

npm run dev
