#!/bin/bash

cd "$(dirname "$0")"

export BACKEND_PORT=${BACKEND_PORT:-5001}
export FRONTEND_PORT=${FRONTEND_PORT:-3000}
export VITE_BACKEND_PORT=$BACKEND_PORT
export VITE_FRONTEND_PORT=$FRONTEND_PORT

echo "🏥 校园健康预警系统启动中..."
echo "========================================"
echo "📋 配置信息:"
echo "   后端端口: $BACKEND_PORT"
echo "   前端端口: $FRONTEND_PORT"
echo "========================================"
echo ""

echo "[1/3] 启动后端 Flask 服务..."
PORT=$BACKEND_PORT python3 app.py &
FLASK_PID=$!
sleep 3

if ps -p $FLASK_PID > /dev/null; then
    ACTUAL_BACKEND_PORT=$(curl -s http://localhost:${BACKEND_PORT}/api/health 2>/dev/null | grep -o '"port":[0-9]*' | grep -o '[0-9]*')
    if [ -z "$ACTUAL_BACKEND_PORT" ]; then
        ACTUAL_BACKEND_PORT=$BACKEND_PORT
    fi
    echo "✅ 后端服务已启动 (PID: $FLASK_PID, 端口: $ACTUAL_BACKEND_PORT)"

    if [ "$ACTUAL_BACKEND_PORT" != "$BACKEND_PORT" ]; then
        echo "⚠️  端口已从 $BACKEND_PORT 自动调整为 $ACTUAL_BACKEND_PORT"
        export VITE_BACKEND_PORT=$ACTUAL_BACKEND_PORT
    fi
else
    echo "❌ 后端服务启动失败"
    exit 1
fi

echo ""
echo "[2/3] 安装前端依赖..."
cd client
if [ ! -d "node_modules" ]; then
    npm install --silent
fi

echo ""
echo "[3/3] 启动前端开发服务器..."
npm start &
FRONT_PID=$!

sleep 3

echo ""
echo "========================================"
echo "✅ 系统启动完成！"
echo "📊 前端地址: http://localhost:${FRONTEND_PORT}"
echo "🔌 后端 API: http://localhost:${ACTUAL_BACKEND_PORT}"
echo "🔍 健康检查: http://localhost:${ACTUAL_BACKEND_PORT}/api/health"
echo "========================================"
echo ""
echo "按 Ctrl+C 停止所有服务"

trap "echo '正在停止服务...'; kill $FLASK_PID $FRONT_PID 2>/dev/null; exit 0" INT

wait
