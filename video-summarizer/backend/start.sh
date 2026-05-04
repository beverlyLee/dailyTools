#!/bin/bash

echo "=== 启动视频关键帧摘要应用后端 ==="

# 检查是否存在虚拟环境
if [ -d "venv" ]; then
    echo "检测到虚拟环境，正在激活..."
    source venv/bin/activate
else
    echo "未检测到虚拟环境，将使用系统 Python"
fi

# 检查依赖是否安装
echo "检查依赖..."
pip list | grep -q "fastapi" || {
    echo "正在安装依赖..."
    pip install -r requirements.txt
}

# 创建必要的目录
mkdir -p uploads
mkdir -p outputs

echo "启动 FastAPI 服务器 (端口 8000)..."
python run.py
