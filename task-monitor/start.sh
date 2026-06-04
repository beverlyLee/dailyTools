#!/bin/bash

set -e

cd "$(dirname "$0")"
PROJECT_ROOT="$(pwd)"

BACKEND_PORT=8999
FRONTEND_PORT=3999
LOG_DIR="$PROJECT_ROOT/logs"
mkdir -p "$LOG_DIR"

BACKEND_LOG="$LOG_DIR/backend.log"
FRONTEND_LOG="$LOG_DIR/frontend.log"

echo "========================================"
echo "  Task Monitor - 一键启动"
echo "========================================"
echo ""

cleanup_port() {
    local port=$1
    if lsof -i :"$port" > /dev/null 2>&1; then
        echo "🧹 清理端口 $port..."
        lsof -ti :"$port" | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
}

check_service() {
    local url=$1
    local name=$2
    local max_attempts=15
    local attempt=0
    
    echo -n "⏳ 等待 $name 启动..."
    while [ $attempt -lt $max_attempts ]; do
        if curl -s -m 2 "$url" > /dev/null 2>&1; then
            echo " ✅"
            return 0
        fi
        attempt=$((attempt + 1))
        echo -n "."
        sleep 1
    done
    echo " ❌"
    return 1
}

echo "📦 检查环境..."

if [ ! -d "frontend/node_modules" ]; then
    echo "📥 安装前端依赖..."
    cd frontend
    npm install --silent
    cd ..
fi

echo ""
echo "🧹 清理旧进程..."
cleanup_port $BACKEND_PORT
cleanup_port $FRONTEND_PORT

echo ""
echo "🚀 启动服务..."
echo ""

echo "📡 启动后端 (端口 $BACKEND_PORT)..."
cd backend
nohup python3 -m uvicorn main:app --host 0.0.0.0 --port $BACKEND_PORT > "$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!
cd ..
echo "   PID: $BACKEND_PID, 日志: $BACKEND_LOG"

echo "🌐 启动前端 (端口 $FRONTEND_PORT)..."
cd frontend
nohup npx vite --port $FRONTEND_PORT --host 0.0.0.0 > "$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!
cd ..
echo "   PID: $FRONTEND_PID, 日志: $FRONTEND_LOG"

echo ""
if check_service "http://localhost:$BACKEND_PORT/api/sessions" "后端"; then
    BACKEND_OK=true
else
    BACKEND_OK=false
    echo "   后端日志最后 10 行:"
    tail -10 "$BACKEND_LOG" | sed 's/^/   /'
fi

if check_service "http://localhost:$FRONTEND_PORT/" "前端"; then
    FRONTEND_OK=true
else
    FRONTEND_OK=false
    echo "   前端日志最后 10 行:"
    tail -10 "$FRONTEND_LOG" | sed 's/^/   /'
fi

echo ""
echo "========================================"
if [ "$BACKEND_OK" = true ] && [ "$FRONTEND_OK" = true ]; then
    echo "  ✅ 服务启动成功!"
    echo ""
    echo "  🌐 前端: http://localhost:$FRONTEND_PORT"
    echo "  📡 后端: http://localhost:$BACKEND_PORT"
    echo ""
    echo "  管理命令:"
    echo "    查看状态: ./status.sh"
    echo "    停止服务: ./stop.sh"
    echo "    查看日志: tail -f logs/backend.log | logs/frontend.log"
    echo "========================================"
    
    echo $BACKEND_PID > "$LOG_DIR/backend.pid"
    echo $FRONTEND_PID > "$LOG_DIR/frontend.pid"
    
    echo ""
    echo "💡 服务已在后台运行，关闭终端不会影响"
    echo "   如需前台运行，按 Ctrl+C 后使用 ./start-foreground.sh"
else
    echo "  ❌ 部分服务启动失败"
    echo "     请检查日志文件"
    echo "========================================"
    exit 1
fi
