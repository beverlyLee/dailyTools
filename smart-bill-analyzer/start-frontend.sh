#!/bin/bash

echo "=== 智能账单分析系统 - 前端 ==="
echo ""

cd frontend

echo "安装依赖..."
npm install

echo "启动前端开发服务器 (端口 3000)..."
npm run dev
