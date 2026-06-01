#!/bin/bash

cd "$(dirname "$0")"

echo "📦 检查Python环境..."
python3 --version

echo "🔍 检查依赖包..."
pip3 list | grep -E "Flask|jieba|wordcloud|matplotlib|numpy|pandas" || echo "部分依赖未安装，正在安装..."

echo "📚 安装依赖包..."
pip3 install -r requirements.txt

echo "🚀 启动Flask应用..."
python3 app.py
