#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR"

echo "🏕️  露营地舒适度评估系统启动"
echo "================================"

cd "$PROJECT_DIR"

if [ ! -d "venv" ]; then
    echo "📦 创建 Python 虚拟环境..."
    python3 -m venv venv
fi

source venv/bin/activate

echo "🔧 安装 Python 依赖..."
pip install -r requirements.txt -q

echo "📦 构建前端..."
cd "$PROJECT_DIR/frontend"
if [ ! -d "node_modules" ]; then
    npm install
fi
npm run build

cd "$PROJECT_DIR"

echo "🚀 启动服务..."
echo "📊 服务地址: http://localhost:8000"
echo ""

cd "$PROJECT_DIR/src"
python main.py
