#!/bin/bash

echo "=== 启动前端服务 ==="

cd "$(dirname "$0")/frontend"

if [ -f "start.sh" ]; then
    chmod +x start.sh
    ./start.sh
else
    echo "未找到 start.sh，直接运行 npm..."
    npm run dev
fi
