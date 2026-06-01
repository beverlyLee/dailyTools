#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "========================================"
echo "  新能源汽车市场趋势分析系统"
echo "  Streamlit Web 应用"
echo "========================================"
echo ""

if [ ! -d "venv" ]; then
    echo "创建虚拟环境..."
    python3 -m venv venv
fi

echo "激活虚拟环境..."
source venv/bin/activate

echo "安装依赖..."
pip install -q -r requirements.txt

echo ""
echo "启动 Web 应用..."
echo "访问地址: http://localhost:8501"
echo "按 Ctrl+C 停止服务"
echo ""

streamlit run app.py --server.port=8501
