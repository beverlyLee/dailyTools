#!/bin/bash

echo "🚀 启动图书榜单对比分析服务..."

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo "📦 检查 Python 依赖..."
if [ ! -d "venv" ]; then
    echo "   创建虚拟环境..."
    python3 -m venv venv
fi

source venv/bin/activate
pip install -q -r requirements.txt

echo ""
echo "🔧 启动后端服务..."
python app.py &
BACKEND_PID=$!

sleep 3

echo ""
echo "📦 检查前端依赖..."
cd frontend
if [ ! -d "node_modules" ]; then
    echo "   安装 npm 依赖..."
    npm install
fi

echo ""
echo "🎨 启动前端服务..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ 服务启动完成！"
echo "   后端 PID: $BACKEND_PID"
echo "   前端 PID: $FRONTEND_PID"
echo ""
echo "📱 访问地址:"
echo "   前端: http://localhost:5173"
echo "   后端: http://localhost:5050"
echo ""
echo "⚠️  按 Ctrl+C 停止所有服务"

trap "echo ''; echo '🛑 正在停止服务...'; kill $BACKEND_PID 2>/dev/null; kill $FRONTEND_PID 2>/dev/null; exit" INT

wait
