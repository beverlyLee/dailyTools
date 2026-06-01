#!/bin/bash

cd "$(dirname "$0")"

if [ ! -d "venv" ]; then
    echo "创建虚拟环境..."
    python3 -m venv venv
fi

source venv/bin/activate

echo "检查并安装依赖..."
pip install pdfplumber pyecharts pandas -q

echo ""
echo "正在运行疫情时空分析..."
python main.py

echo ""
echo "提示: 用浏览器打开 output/flu_heatmap.html 查看热力图"
