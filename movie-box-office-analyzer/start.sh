#!/bin/bash

echo "🎬 电影票房分析系统"
echo "====================="

if [ ! -d "venv" ]; then
    echo "📦 创建虚拟环境..."
    python3 -m venv venv
fi

echo "🔧 激活虚拟环境..."
source venv/bin/activate

echo "📚 安装依赖..."
pip install -r requirements.txt -q

echo "🚀 启动应用..."
echo "📱 请在浏览器中打开: http://localhost:8050"
echo ""

python app.py
