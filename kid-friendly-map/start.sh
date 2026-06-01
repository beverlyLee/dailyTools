#!/bin/bash

cd "$(dirname "$0")"

echo "========================================="
echo "  亲子出行地图 - 启动脚本"
echo "========================================="

echo ""
echo "检查 Python 环境..."
if ! command -v python3 &> /dev/null; then
    echo "❌ 未找到 Python3，请先安装 Python 3.9+"
    exit 1
fi

PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
echo "✅ Python 版本: $PYTHON_VERSION"

echo ""
echo "检查虚拟环境..."
if [ ! -d ".venv" ]; then
    echo "🔧 创建虚拟环境..."
    python3 -m venv .venv
fi

echo "✅ 激活虚拟环境..."
source .venv/bin/activate

echo ""
echo "📦 安装依赖..."
pip install -r requirements.txt

echo ""
echo "🚀 启动服务..."
echo "📍 默认中心: 上海迪士尼 (31.1416, 121.6570)"
echo "🌐 访问地址: http://localhost:8000"
echo "📋 API 文档:"
echo "   - GET /api/config - 获取配置"
echo "   - GET /api/pois - 获取POI列表"
echo "   - GET /api/poi/{id} - 获取POI详情"
echo "   - GET /api/score/{id} - 获取评分详情"
echo ""
echo "按 Ctrl+C 停止服务"
echo "========================================="
echo ""

python src/main.py
