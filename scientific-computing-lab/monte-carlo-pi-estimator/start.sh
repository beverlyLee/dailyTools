#!/bin/bash

echo "========================================"
echo "蒙特卡洛圆周率估算模拟器 - 启动脚本"
echo "Monte Carlo Pi Estimation Simulator"
echo "========================================"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

echo "编译并启动后端服务 (Go)..."
cd "$BACKEND_DIR"

echo "编译 Go 程序..."
go build -o monte-carlo-pi .

echo "启动后端服务 (端口: 8002)..."
./monte-carlo-pi &
BACKEND_PID=$!

echo ""
echo "启动前端服务 (React + Vite)..."
cd "$FRONTEND_DIR"

if [ ! -d "node_modules" ]; then
    echo "安装前端依赖..."
    npm install
fi

echo "启动前端服务 (端口: 3002)..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "========================================"
echo "服务已启动!"
echo "========================================"
echo "后端 API: http://localhost:8002"
echo "前端界面: http://localhost:3002"
echo ""
echo "按 Ctrl+C 停止所有服务"
echo "========================================"

trap "echo '停止服务...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM

wait
