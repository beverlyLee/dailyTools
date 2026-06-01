#!/bin/bash

echo "=========================================="
echo "广场舞噪音监测系统"
echo "=========================================="

echo ""
echo "安装依赖..."
pip install -r requirements.txt

echo ""
echo "启动FastAPI后端服务 (端口: 8000)..."
echo "API文档: http://localhost:8000/docs"
echo ""

uvicorn main:app --reload --host 0.0.0.0 --port 8000
