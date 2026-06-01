#!/bin/bash

echo "======================================"
echo "  💼 Work Escape Rating - 打工人摸鱼指南"
echo "======================================"
echo ""

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
VENV_DIR="$BACKEND_DIR/venv"
LOG_DIR="$PROJECT_DIR/logs"

mkdir -p "$LOG_DIR"

export PYTHONUNBUFFERED=1

echo "📦 检查 Python 环境..."
if [ ! -d "$VENV_DIR" ]; then
    echo "   创建虚拟环境..."
    python3 -m venv "$VENV_DIR" || {
        echo "   ❌ 创建虚拟环境失败，尝试使用系统 Python..."
        python3 -m venv --without-pip "$VENV_DIR" 2>/dev/null
    }
fi

source "$VENV_DIR/bin/activate"

echo "   安装依赖..."
pip install --upgrade pip 2>/dev/null
pip install fastapi uvicorn python-multipart jieba python-dotenv 2>&1 | tail -3
echo "   ✅ Python 依赖安装完成"

echo ""
echo "📦 检查前端依赖..."
cd "$FRONTEND_DIR"
if [ ! -d "node_modules" ]; then
    echo "   安装 npm 依赖..."
    npm install --silent 2>&1 | tail -3
fi
echo "   ✅ 前端依赖安装完成"

echo ""
echo "🚀 启动服务..."
echo "   后端 API: http://localhost:8000"
echo "   前端页面: http://localhost:5173"
echo "   健康检查: http://localhost:8000/health"
echo ""
echo "   按 Ctrl+C 停止服务"
echo ""

cd "$PROJECT_DIR"

trap "echo ''; echo '🛑 正在停止服务...'; pkill -P $$ 2>/dev/null; exit 0" INT TERM

cd "$BACKEND_DIR"
source "$VENV_DIR/bin/activate"
uvicorn main:app --host 0.0.0.0 --port 8000 --reload > "$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID=$!

cd "$FRONTEND_DIR"
npm run dev > "$LOG_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!

echo "   📝 日志文件位置:"
echo "      后端: $LOG_DIR/backend.log"
echo "      前端: $LOG_DIR/frontend.log"
echo ""
echo "   🎉 服务启动中..."
echo ""

wait $BACKEND_PID $FRONTEND_PID
