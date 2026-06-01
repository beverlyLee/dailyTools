#!/bin/bash

echo "="
echo "  高铁优化器 - 生产环境启动脚本"
echo "="

echo ""
echo "正在编译后端..."
cd "$(dirname "$0")"

go build -o bin/server cmd/main.go

echo ""
echo "正在构建前端..."
cd web
npm run build
cd ..

echo ""
echo "启动服务..."
echo "访问地址: http://localhost:8080"
echo ""

./bin/server
