#!/bin/bash

echo "=== 启动视频关键帧摘要应用前端 ==="

# 检查 node_modules 是否存在
if [ ! -d "node_modules" ]; then
    echo "检测到未安装依赖，正在安装..."
    npm install
fi

echo "启动 Next.js 开发服务器 (端口 3000)..."
npm run dev
