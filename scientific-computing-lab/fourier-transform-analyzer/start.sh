#!/bin/bash

echo "========================================"
echo "傅里叶变换信号分析实验台 - 启动脚本"
echo "Fourier Transform Signal Analyzer"
echo "========================================"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

echo "启动后端服务 (Python FastAPI)..."
cd "$BACKEND_DIR"

if [ ! -d "venv" ]; then
    echo "创建虚拟环境..."
    python3 -m venv venv
fi

echo "激活虚拟环境并安装依赖..."
source venv/bin/activate
pip install -q -r requirements.txt

echo "启动后端服务 (端口: 8001)..."
python run.py &
BACKEND_PID=$!

echo ""
echo "启动前端服务 (React + Vite)..."
cd "$FRONTEND_DIR"

if [ ! -d "node_modules" ]; then
    echo "安装前端依赖..."
    npm install
fi

echo "启动前端服务 (端口: 3001)..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "========================================"
echo "服务已启动!"
echo "========================================"
echo "后端 API: http://localhost:8001"
echo "前端界面: http://localhost:3001"
echo ""
echo "按 Ctrl+C 停止所有服务"
echo "========================================"

trap "echo '停止服务...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM

wait
