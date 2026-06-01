#!/bin/bash

echo "🚀 正在启动中国城市便利店发展指数可视化系统..."

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "📁 项目目录: $PROJECT_DIR"

mkdir -p "$PROJECT_DIR/data/raw"
mkdir -p "$PROJECT_DIR/data/processed"
mkdir -p "$PROJECT_DIR/data/geojson"

echo "🐍 检查Python虚拟环境..."
if [ ! -d "$PROJECT_DIR/venv" ]; then
    echo "   创建Python虚拟环境..."
    python3 -m venv "$PROJECT_DIR/venv"
fi

source "$PROJECT_DIR/venv/bin/activate"

echo "📦 安装Python依赖..."
pip install -q -r "$PROJECT_DIR/requirements.txt"

echo "🌐 检查前端依赖..."
cd "$PROJECT_DIR/frontend"
if [ ! -d "node_modules" ]; then
    echo "   安装前端依赖..."
    npm install 2>/dev/null
fi

echo "📍 启动FastAPI后端服务 (端口 8000)..."
cd "$PROJECT_DIR"
uvicorn src.api.routes:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

sleep 3

echo "🎨 启动前端开发服务器 (端口 5173)..."
cd "$PROJECT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ 系统启动完成！"
echo "📊 前端地址: http://localhost:5173"
echo "🔌 后端API: http://localhost:8000"
echo "📖 API文档: http://localhost:8000/docs"
echo ""
echo "💡 按 Ctrl+C 停止所有服务"

wait $BACKEND_PID $FRONTEND_PID
