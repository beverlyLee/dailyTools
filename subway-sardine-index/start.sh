#!/bin/bash

set -e

echo "🐟 地铁沙丁鱼指数 - 启动脚本"
echo "=========================="

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

if [ ! -f .env ]; then
    echo "⚠️  未找到 .env 文件，正在从 .env.example 创建..."
    cp .env.example .env
    echo "请编辑 .env 文件，配置 GAODE_TRAFFIC_KEY"
fi

if [ ! -d .venv ] && [ ! -d venv ]; then
    echo "📦 创建虚拟环境..."
    python3 -m venv .venv
fi

if [ -d .venv ]; then
    source .venv/bin/activate
elif [ -d venv ]; then
    source venv/bin/activate
fi

echo "📦 安装依赖..."
pip install -q -r requirements.txt

echo ""
echo "🚀 启动服务..."
echo "  - Streamlit UI:      http://localhost:8501"
echo "  - FastAPI 后端:  http://localhost:8000"
echo "  - API 文档:      http://localhost:8000/docs"
echo ""

cleanup() {
    echo ""
    echo "🛑 正在停止服务..."
    kill $FASTAPI_PID 2>/dev/null || true
    kill $STREAMLIT_PID 2>/dev/null || true
    wait $FASTAPI_PID 2>/dev/null || true
    wait $STREAMLIT_PID 2>/dev/null || true
    echo "✅ 服务已停止"
    exit 0
}

trap cleanup SIGINT SIGTERM

echo "🔧 启动 FastAPI 后端服务 (端口 8000)..."
python -m uvicorn src.main:app --host 0.0.0.0 --port 8000 --log-level warning > logs/fastapi.log 2>&1 &
FASTAPI_PID=$!
echo "   FastAPI PID: $FASTAPI_PID"

sleep 2

echo "🎨 启动 Streamlit 前端界面 (端口 8501)..."
streamlit run app.py --server.port 8501 --server.headless true --browser.gatherUsageStats false > logs/streamlit.log 2>&1 &
STREAMLIT_PID=$!
echo "   Streamlit PID: $STREAMLIT_PID"

echo ""
echo "🎉 服务启动完成！"
echo "📱 访问地址: http://localhost:8501"
echo "📡 API 地址: http://localhost:8000"
echo ""
echo "按 Ctrl+C 停止所有服务"
echo ""

wait $STREAMLIT_PID
