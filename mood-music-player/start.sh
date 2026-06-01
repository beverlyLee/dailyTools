#!/bin/bash

echo "🚀 启动情绪音乐播放器..."

echo ""
echo "📦 安装后端依赖..."
cd backend
pip install fastapi uvicorn python-multipart numpy

echo ""
echo "🔌 启动后端服务 (端口 8000)..."
python main.py &
BACKEND_PID=$!

echo ""
echo "⏳ 等待后端启动..."
sleep 3

echo ""
echo "🌐 启动前端服务 (端口 3000)..."
cd ../frontend
npm install
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ 服务已启动!"
echo "📡 后端 API: http://localhost:8000"
echo "🌐 前端页面: http://localhost:3000"
echo ""
echo "按 Ctrl+C 停止所有服务"

trap "echo '🛑 停止服务...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT

wait
