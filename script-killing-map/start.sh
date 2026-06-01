#!/bin/bash

echo "=========================================="
echo "  剧本杀门店空间分布分析系统"
echo "=========================================="
echo ""

echo "检查 Python 环境..."
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 未安装，请先安装 Python3"
    exit 1
fi

echo "✅ Python3 已安装"
echo ""

echo "检查依赖..."
if [ ! -d "venv" ]; then
    echo "创建虚拟环境..."
    python3 -m venv venv
fi

source venv/bin/activate

echo "安装 Python 依赖..."
pip install -r requirements.txt -q

echo ""
echo "启动服务..."
echo "访问地址: http://localhost:8000"
echo ""

python main.py
