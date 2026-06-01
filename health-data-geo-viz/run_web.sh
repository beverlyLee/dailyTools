#!/bin/bash

cd "$(dirname "$0")"

echo "=" * 60
echo "疫情时空分析系统 - Web服务"
echo "=" * 60

if [ ! -d "venv" ]; then
    echo "创建虚拟环境..."
    python3 -m venv venv
fi

source venv/bin/activate

echo "检查并安装依赖..."
pip install flask requests beautifulsoup4 pdfplumber pyecharts pandas -q

echo ""
echo "启动Web服务..."
echo "访问地址: http://localhost:8000"
echo "按 Ctrl+C 停止服务"
echo ""

python app.py
