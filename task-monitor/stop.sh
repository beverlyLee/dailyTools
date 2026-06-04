#!/bin/bash

cd "$(dirname "$0")"
PROJECT_ROOT="$(pwd)"

LOG_DIR="$PROJECT_ROOT/logs"
BACKEND_PID_FILE="$LOG_DIR/backend.pid"
FRONTEND_PID_FILE="$LOG_DIR/frontend.pid"
BACKEND_PORT=8999
FRONTEND_PORT=3999

echo "========================================"
echo "  Task Monitor - 停止服务"
echo "========================================"
echo ""

kill_process() {
    local pid_file=$1
    local name=$2
    local port=$3
    
    if [ -f "$pid_file" ]; then
        local pid
        pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            echo "🛑 停止 $name (PID: $pid)..."
            kill -9 "$pid" 2>/dev/null || true
            sleep 1
        else
            echo "ℹ️  $name 未运行"
        fi
        rm -f "$pid_file"
    fi
    
    if lsof -i :"$port" > /dev/null 2>&1; then
        echo "🧹 清理端口 $port..."
        lsof -ti :"$port" | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
}

kill_process "$BACKEND_PID_FILE" "后端" "$BACKEND_PORT"
kill_process "$FRONTEND_PID_FILE" "前端" "$FRONTEND_PORT"

echo ""
echo "========================================"
echo "  ✅ 所有服务已停止"
echo "========================================"
echo ""
