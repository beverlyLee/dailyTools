#!/bin/bash

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

echo "========================================="
echo "⚡ 特种兵旅游路线挖掘工具 - 启动脚本"
echo "========================================="
echo ""

echo "📦 检查并安装后端依赖..."
cd "$BACKEND_DIR"
if [ ! -d "venv" ]; then
    echo "  创建虚拟环境..."
    python3 -m venv venv
fi

source venv/bin/activate
pip install -q -r requirements.txt
echo "  ✅ 后端依赖安装完成"
echo ""

echo "📦 检查并安装前端依赖..."
cd "$FRONTEND_DIR"
if [ ! -d "node_modules" ]; then
    echo "  安装 npm 依赖..."
    npm install --no-audit --no-fund --loglevel=error
fi
echo "  ✅ 前端依赖安装完成"
echo ""

echo "========================================="
echo "🚀 启动服务..."
echo "========================================="
echo ""

echo "  后端 API: http://localhost:8000"
echo "  前端界面: http://localhost:5173"
echo ""
echo "  按 Ctrl+C 停止所有服务"
echo "========================================="
echo ""

cd "$BACKEND_DIR"
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

cd "$FRONTEND_DIR"
npm run dev &
FRONTEND_PID=$!

cleanup() {
    echo ""
    echo "🛑 正在停止服务..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    wait $BACKEND_PID 2>/dev/null
    wait $FRONTEND_PID 2>/dev/null
    echo "✅ 服务已停止"
    exit 0
}

trap cleanup SIGINT SIGTERM

wait
