#!/bin/bash

echo "========================================"
echo "   滑雪场最佳时机预测系统 - 启动脚本"
echo "========================================"

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo "📁 项目目录: $PROJECT_DIR"
echo ""

if [ ! -d "venv" ]; then
    echo "🔧 创建Python虚拟环境..."
    python3 -m venv venv
fi

echo "🔧 激活虚拟环境..."
source venv/bin/activate

echo "📦 升级 pip 和 setuptools..."
pip install --upgrade pip setuptools wheel --quiet

echo "📦 安装依赖包..."
pip install -r requirements.txt --quiet

echo ""
echo "🚀 启动Flask服务器..."
echo "📍 访问地址: http://0.0.0.0:8000"
echo "📋 按 Ctrl+C 停止服务"
echo ""

flask run --host=0.0.0.0 --port=8000
