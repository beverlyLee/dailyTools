#!/bin/bash

set -e
set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

log_error() {
    echo "❌ 错误: $1" >&2
}

check_exit() {
    if [ $? -ne 0 ]; then
        log_error "$1"
        exit 1
    fi
}

echo "=========================================="
echo "  LunchDrift - 白领午休流动分析系统"
echo "=========================================="
echo ""

if [ ! -f .env ]; then
    echo "⚠️  未找到 .env 文件，从 .env.example 复制..."
    cp .env.example .env
    check_exit "无法复制 .env.example 文件"
    echo "请编辑 .env 文件配置您的 API Key"
    echo ""
fi

if [ -f .env ]; then
    set -a
    source .env
    set +a
fi

SERVER_PORT=${SERVER_PORT:-8000}
FRONTEND_PORT=${FRONTEND_PORT:-5173}

echo "📋 读取配置:"
echo "   后端端口: $SERVER_PORT"
echo "   前端端口: $FRONTEND_PORT"
echo ""

check_port() {
    local port=$1
    local name=$2
    if lsof -ti:"$port" > /dev/null 2>&1; then
        echo "⚠️  端口 $port ($name) 已被占用"
        read -p "是否终止占用进程? (y/N): " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            lsof -ti:"$port" | xargs kill -9 2>/dev/null || true
            sleep 1
            echo "   已尝试终止占用进程"
        else
            log_error "端口 $port 被占用，请手动释放后重试"
            exit 1
        fi
    fi
}

check_port "$SERVER_PORT" "后端"
check_port "$FRONTEND_PORT" "前端"
echo ""

echo "📦 检查并安装 Python 依赖..."
if [ ! -d "venv" ]; then
    echo "   创建虚拟环境中（超时30秒）..."
    timeout 30 python3 -m venv venv 2>&1
    if [ $? -eq 124 ]; then
        log_error "虚拟环境创建超时（超过30秒）"
        echo "   建议手动执行: python3 -m venv venv"
        exit 1
    fi
    check_exit "创建虚拟环境失败"
    echo "✅ 创建虚拟环境完成"
fi

source venv/bin/activate
check_exit "无法激活虚拟环境"

echo "   安装 Python 依赖中..."
pip install -r requirements.txt -q 2>&1 | tail -5
check_exit "安装 Python 依赖失败"
echo "✅ Python 依赖安装完成"

echo ""
echo "🌐 检查并安装前端依赖..."
cd frontend
if [ ! -d "node_modules" ]; then
    echo "   安装前端依赖中..."
    npm install 2>&1 | tail -10
    check_exit "安装前端依赖失败"
    echo "✅ 前端依赖安装完成"
else
    echo "✅ 前端依赖已存在"
fi
cd "$SCRIPT_DIR"

echo ""
echo "🚀 启动服务..."
echo "  - 后端 API: http://localhost:$SERVER_PORT"
echo "  - 前端应用: http://localhost:$FRONTEND_PORT"
echo ""
echo "按 Ctrl+C 停止服务"
echo ""

BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
    echo ""
    echo "🛑 正在停止服务..."
    if [ -n "$BACKEND_PID" ]; then
        kill "$BACKEND_PID" 2>/dev/null || true
    fi
    if [ -n "$FRONTEND_PID" ]; then
        kill "$FRONTEND_PID" 2>/dev/null || true
    fi
    pkill -P $$ 2>/dev/null || true
    echo "✅ 服务已停止"
    exit 0
}

trap cleanup SIGINT SIGTERM

cd "$SCRIPT_DIR"
source venv/bin/activate
python -m uvicorn src.main:app --host 0.0.0.0 --port "$SERVER_PORT" --reload &
BACKEND_PID=$!
check_exit "启动后端服务失败"

sleep 2

cd frontend
npm run dev &
FRONTEND_PID=$!
check_exit "启动前端服务失败"

wait
