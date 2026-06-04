#!/bin/bash

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo "=========================================="
echo "  夜跑安全地图 - Night Run Safety Map"
echo "=========================================="

if [ ! -f ".env" ]; then
    echo "⚠️  警告: .env 文件不存在，请复制 .env.example 并配置 API Key"
fi

echo ""
echo "📦 检查 Python 依赖..."
if ! python -c "import fastapi" 2>/dev/null; then
    echo "安装 Python 依赖..."
    pip install -r requirements.txt
fi

echo ""
echo "📦 检查前端依赖..."
if [ ! -d "frontend/node_modules" ]; then
    echo "安装前端依赖..."
    cd frontend && npm install && cd ..
fi

echo ""
echo "🏗️  构建前端..."
cd frontend && npm run build && cd ..

echo ""
echo "🚀 启动后端服务..."
echo "服务地址: http://localhost:8000"
echo "API 文档: http://localhost:8000/docs"
echo ""
echo "按 Ctrl+C 停止服务"
echo "=========================================="

python src/main.py
