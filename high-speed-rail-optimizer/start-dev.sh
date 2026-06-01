#!/bin/bash

echo "="
echo "  高铁优化器 - 开发环境启动脚本"
echo "="

echo ""
echo "正在启动后端服务..."
cd "$(dirname "$0")"

if [ ! -f "bin/server" ]; then
    echo "首次启动，正在编译后端..."
    go build -o bin/server cmd/main.go
fi

# 启动后端服务
./bin/server &
BACKEND_PID=$!

echo ""
echo "后端服务已启动 (PID: $BACKEND_PID)"
echo "API 地址: http://localhost:8080"
echo ""
echo "正在启动前端开发服务器..."
echo ""

# 等待后端启动
sleep 2

# 启动前端开发服务器
cd web
npm run dev

echo ""
echo "正在停止服务..."
kill $BACKEND_PID 2>/dev/null
echo "服务已停止"
