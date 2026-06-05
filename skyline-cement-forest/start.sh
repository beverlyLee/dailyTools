#!/bin/bash

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

echo "========================================="
echo "  Skyline Cement Forest - 城市建筑密度增长模拟"
echo "========================================="

echo ""
echo "检查 Python 环境..."
if ! command -v python3 &> /dev/null; then
    echo "❌ 未找到 Python 3"
    exit 1
fi

echo "创建虚拟环境..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

source venv/bin/activate

echo "安装 Python 依赖..."
pip install -r requirements.txt

echo ""
echo "启动后端服务..."
echo "后端 API 将在 http://localhost:8000 启动"
echo ""

cd src
uvicorn main:app --reload --host 0.0.0.0 --port 8000
