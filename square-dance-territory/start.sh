#!/bin/bash

BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$BASE_DIR"

echo "🚀 正在启动广场舞领地分析系统..."

if [ ! -f "data/square_dance_videos.json" ]; then
    echo "📊 未找到数据文件，正在生成模拟数据..."
    python src/generate_mock.py
fi

echo "🌐 启动 Web 服务..."
echo "📌 访问地址: http://localhost:5001"

cd src && python main.py
