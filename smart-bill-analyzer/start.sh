#!/bin/bash

echo "========================================"
echo "  智能账单分析系统"
echo "  Smart Bill Analyzer"
echo "========================================"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "项目目录: $SCRIPT_DIR"
echo ""

if [ ! -d "backend/venv" ]; then
    echo "=== 首次运行: 设置 Python 环境 ==="
    cd backend
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    cd ..
    echo ""
fi

echo "=== 检查前端依赖 ==="
cd frontend
if [ ! -d "node_modules" ]; then
    echo "安装前端依赖..."
    npm install
fi
cd ..
echo ""

echo "=== 启动服务 ==="
echo "注意: 需要两个终端窗口分别运行后端和前端"
echo ""
echo "后端启动命令:"
echo "  cd $SCRIPT_DIR/backend"
echo "  source venv/bin/activate"
echo "  uvicorn app.main:app --reload --port 8000"
echo ""
echo "前端启动命令:"
echo "  cd $SCRIPT_DIR/frontend"
echo "  npm run dev"
echo ""
echo "访问地址:"
echo "  前端: http://localhost:3000"
echo "  后端 API: http://localhost:8000"
echo "  API 文档: http://localhost:8000/docs"
echo ""

echo "正在启动后端服务..."
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
