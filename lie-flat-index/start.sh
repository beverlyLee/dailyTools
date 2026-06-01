#!/bin/bash

echo "🚀 正在启动躺平指数分析系统..."

if [ -f ".env" ]; then
    source .env
    export API_PORT=${API_PORT:-8000}
else
    export API_PORT=8000
fi

echo "📦 安装Python依赖..."
pip install -r requirements.txt -q

echo "📦 安装前端依赖..."
cd frontend
npm install -s 2>/dev/null
cd ..

echo ""
echo "🔧 正在启动后端服务..."
python main.py &
BACKEND_PID=$!

echo "🔧 正在启动前端服务..."
cd frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ 系统启动完成!"
echo "🌐 后端API: http://localhost:$API_PORT"
echo "🌐 前端页面: http://localhost:3000"
echo "📚 API文档: http://localhost:$API_PORT/docs"
echo ""
echo "数据切换功能:"
echo "  - 📊 真实公开数据: 基于智联招聘/脉脉公开调研数据"
echo "  - 📋 模拟演示数据: 用于演示的模拟数据"
echo ""
echo "按 Ctrl+C 停止所有服务"

trap "echo ''; echo '🛑 正在停止服务...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM

wait
