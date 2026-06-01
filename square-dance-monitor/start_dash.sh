#!/bin/bash

echo "=========================================="
echo "广场舞噪音监测系统 - Dash可视化"
echo "=========================================="

echo ""
echo "安装依赖..."
pip install -r requirements.txt

echo ""
echo "启动Dash可视化服务 (端口: 8050)..."
echo "访问地址: http://localhost:8050"
echo ""

python app.py
