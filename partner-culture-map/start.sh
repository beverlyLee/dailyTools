#!/bin/bash

cd "$(dirname "$0")"

echo "=========================================="
echo "  搭子文化地图分析平台 - 启动脚本"
echo "=========================================="

VENV_DIR="venv"
VENV_PYTHON="$VENV_DIR/bin/python"
VENV_PIP="$VENV_DIR/bin/pip"

if ! command -v python3 &> /dev/null; then
    echo "错误: 未检测到 Python3，请先安装 Python3"
    exit 1
fi

echo ""
echo "[1/3] 检查虚拟环境..."
if [ ! -d "$VENV_DIR" ]; then
    echo "创建虚拟环境..."
    python3 -m venv "$VENV_DIR"
else
    echo "虚拟环境已存在"
fi

echo ""
echo "[2/3] 检查依赖..."
if ! $VENV_PYTHON -c "import fastapi" 2>/dev/null; then
    echo "安装依赖包..."
    $VENV_PIP install -r requirements.txt
else
    echo "依赖已安装"
fi

echo ""
echo "[3/3] 启动 FastAPI 服务器..."
echo "访问地址: http://localhost:8000"
echo "API文档:   http://localhost:8000/docs"
echo ""

$VENV_PYTHON -m uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload