#!/bin/bash

echo "🚀 启动股票情绪分析仪表盘..."
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 检查后端依赖
echo "📦 检查后端依赖..."
cd backend
if ! python -c "import flask" 2>/dev/null; then
    echo "   安装 Python 依赖..."
    pip install -q flask flask-cors requests python-dotenv pandas feedparser
fi
cd ..

# 启动后端
echo ""
echo "🔧 启动后端服务 (端口 8001)..."
cd backend
python app.py > backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# 等待后端启动
sleep 2

# 检查后端是否启动成功
if curl -s http://localhost:8001/api/health > /dev/null; then
    echo -e "   ${GREEN}✅ 后端服务启动成功${NC}"
else
    echo -e "   ${YELLOW}⚠️  后端启动可能有问题，请检查 backend.log${NC}"
fi

# 启动前端
echo ""
echo "🎨 启动前端服务 (端口 3000)..."
cd frontend
npm start > frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# 等待前端启动
sleep 3

echo ""
echo "🎉 启动完成！"
echo ""
echo "📊 前端地址: http://localhost:3000"
echo "🔧 后端地址: http://localhost:8001"
echo ""
echo "📝 测试命令:"
echo "   curl http://localhost:8001/api/health"
echo "   curl http://localhost:8001/api/stock/600519"
echo ""
echo "按 Ctrl+C 停止服务"

# 等待用户中断
trap "echo ''; echo '🛑 正在停止服务...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
wait
