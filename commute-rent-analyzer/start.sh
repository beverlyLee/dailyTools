#!/bin/bash

echo "🏠 通勤租房分析器 - 快速启动"
echo "================================"

trap 'kill 0 2>/dev/null' EXIT SIGINT SIGTERM

cd "$(dirname "$0")"

echo "🚀 启动后端服务 (端口 8000)..."
bash start-backend.sh &
BACKEND_PID=$!

sleep 3

echo "🎨 启动前端服务 (端口 3000)..."
bash start-frontend.sh &
FRONTEND_PID=$!

echo ""
echo "✅ 服务启动完成！"
echo "📊 后端API: http://localhost:8000"
echo "📊 API文档: http://localhost:8000/docs"
echo "🌐 前端界面: http://localhost:3000"
echo ""
echo "按 Ctrl+C 停止所有服务"

wait $BACKEND_PID $FRONTEND_PID
