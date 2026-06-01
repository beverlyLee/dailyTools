#!/bin/bash

echo "========================================="
echo "  咖啡店铺地理分析项目启动脚本"
echo "========================================="

echo ""
echo "安装 Python 依赖..."
pip install -r requirements.txt -q

echo ""
echo "安装前端依赖..."
cd frontend
npm install -q

echo ""
echo "启动后端服务 (端口 8001)..."
cd ..
python main.py &
BACKEND_PID=$!

sleep 3

echo ""
echo "启动前端服务..."
cd frontend
npm run dev &
FRONTEND_PID=$!

sleep 2

echo ""
echo "========================================="
echo "  服务已启动!"
echo "  后端: http://127.0.0.1:8001"
echo "  前端: http://localhost:5175 (Vite自动分配)"
echo "========================================="
echo ""
echo "API 测试地址:"
echo "  - 写字楼数据: http://127.0.0.1:8001/api/poi/offices"
echo "  - 咖啡店数据: http://127.0.0.1:8001/api/poi/coffee-shops"
echo "  - 六边形分析: http://127.0.0.1:8001/api/analysis/hexagon"
echo ""
echo "按 Ctrl+C 停止所有服务"

wait
