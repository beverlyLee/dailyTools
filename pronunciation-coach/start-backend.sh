#!/bin/bash

cd "$(dirname "$0")/backend"

if [ ! -d "venv" ]; then
    echo "创建虚拟环境..."
    python3 -m venv venv
fi

source venv/bin/activate

echo "安装依赖..."
pip install -r requirements.txt

echo "启动后端服务 (端口 8002)..."
python run.py
