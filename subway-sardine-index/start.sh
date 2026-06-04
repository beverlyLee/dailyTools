#!/bin/bash

set -e

echo "🐟 地铁沙丁鱼指数 - 启动脚本"
echo "=========================="

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

if [ ! -f .env ]; then
    echo "⚠️  未找到 .env 文件，正在从 .env.example 创建..."
    cp .env.example .env
    echo "请编辑 .env 文件，配置 GAODE_TRAFFIC_KEY"
fi

if [ ! -d .venv ] && [ ! -d venv ]; then
    echo "📦 创建虚拟环境..."
    python3 -m venv .venv
fi

if [ -d .venv ]; then
    source .venv/bin/activate
elif [ -d venv ]; then
    source venv/bin/activate
fi

echo "📦 安装依赖..."
pip install -r requirements.txt

echo ""
echo "🚀 启动 Streamlit 可视化界面..."
echo "访问地址: http://localhost:8501"
echo ""

streamlit run app.py
