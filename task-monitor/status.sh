#!/bin/bash

cd "$(dirname "$0")"
PROJECT_ROOT="$(pwd)"

LOG_DIR="$PROJECT_ROOT/logs"
BACKEND_PID_FILE="$LOG_DIR/backend.pid"
FRONTEND_PID_FILE="$LOG_DIR/frontend.pid"
BACKEND_PORT=8999
FRONTEND_PORT=3999

echo "========================================"
echo "  Task Monitor - 服务状态"
echo "========================================"
echo ""

check_process() {
    local pid_file=$1
    local name=$2
    local port=$3
    
    local status="❌ 未运行"
    local pid=""
    
    if [ -f "$pid_file" ]; then
        pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            if lsof -i :"$port" > /dev/null 2>&1; then
                status="✅ 运行中"
            else
                status="⚠️  进程存在但端口未监听"
            fi
        fi
    fi
    
    echo "  $name: $status"
    if [ -n "$pid" ]; then
        echo "         PID: $pid"
    fi
    
    if lsof -i :"$port" > /dev/null 2>&1; then
        echo "         端口 $port: ✅ 监听中"
    else
        echo "         端口 $port: ❌ 未监听"
    fi
    
    echo ""
}

check_process "$BACKEND_PID_FILE" "后端" "$BACKEND_PORT"
check_process "$FRONTEND_PID_FILE" "前端" "$FRONTEND_PORT"

echo "========================================"
echo "  快速链接"
echo "  🌐 前端: http://localhost:$FRONTEND_PORT"
echo "  📡 后端: http://localhost:$BACKEND_PORT"
echo "========================================"
echo ""
echo "  管理命令:"
echo "    启动: ./start.sh"
echo "    停止: ./stop.sh"
echo "    日志:"
echo "      后端: tail -f $LOG_DIR/backend.log"
echo "      前端: tail -f $LOG_DIR/frontend.log"
echo ""
