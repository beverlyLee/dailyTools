#!/bin/bash

echo "🚀 启动通勤租房分析器后端服务..."

cd "$(dirname "$0")"

if [ ! -d "venv" ]; then
    echo "📦 创建虚拟环境..."
    python3 -m venv venv
fi

source venv/bin/activate

echo "🌐 启动FastAPI服务 (端口 8000)..."
cd src
uvicorn api.routes:app --reload --host 0.0.0.0 --port 8000
