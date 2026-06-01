#!/bin/bash

echo "🚀 启动食堂价格追踪器..."

echo "📦 安装Python依赖..."
pip3 install -r requirements.txt

echo "🌐 启动Flask后端 (端口5000)..."
python3 app.py &
FLASK_PID=$!

sleep 3

echo "📱 安装前端依赖..."
cd client
npm install

echo "🎨 启动React前端 (端口3000)..."
npm start &
REACT_PID=$!

echo ""
echo "✅ 服务已启动!"
echo "   后端API: http://localhost:5000"
echo "   前端界面: http://localhost:3000"
echo ""
echo "按 Ctrl+C 停止所有服务"

cleanup() {
    echo ""
    echo "🛑 正在停止服务..."
    kill $FLASK_PID 2>/dev/null
    kill $REACT_PID 2>/dev/null
    exit 0
}

trap cleanup INT

wait
