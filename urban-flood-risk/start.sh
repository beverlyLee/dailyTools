#!/bin/bash

# 城市内涝风险评估系统启动脚本

set -e

echo "启动城市内涝风险评估系统..."

# 检查虚拟环境
if [ ! -d "venv" ]; then
    echo "创建虚拟环境..."
    python3 -m venv venv
fi

# 激活虚拟环境
source venv/bin/activate

# 安装依赖
echo "安装依赖..."
pip install -r requirements.txt -q

# 创建数据目录
mkdir -p data

# 启动服务
echo "启动FastAPI服务..."
python -m uvicorn app:app --host 0.0.0.0 --port 8000 --reload