#!/bin/bash

echo "=== 智能账单分析系统 ==="
echo ""

if [ -d "venv" ]; then
    echo "激活 Python 虚拟环境..."
    source venv/bin/activate
else
    echo "创建 Python 虚拟环境..."
    python3 -m venv venv
    source venv/bin/activate
    
    echo "安装 Python 依赖..."
    pip install -r requirements.txt
fi

echo "启动后端服务 (端口 8000)..."
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
