#!/bin/bash

echo "=== 启动后端服务 ==="

cd "$(dirname "$0")/backend"

if [ -f "start.sh" ]; then
    chmod +x start.sh
    ./start.sh
else
    echo "未找到 start.sh，直接运行 Python..."
    python run.py
fi
