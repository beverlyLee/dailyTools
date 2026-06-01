#!/bin/bash

cd "$(dirname "$0")"

echo "======================================"
echo "  🍶 白酒市场监控 - 后端启动脚本"
echo "======================================"
echo ""

# 检查Python版本
python_version=$(python3 --version 2>&1)
echo "🔍 Python版本: $python_version"
echo ""

# 创建虚拟环境（如果不存在）
if [ ! -d "venv" ]; then
    echo "📦 创建虚拟环境..."
    python3 -m venv venv
fi

# 激活虚拟环境
echo "🔧 激活虚拟环境..."
source venv/bin/activate

# 升级pip
pip install --upgrade pip -q

# 安装依赖（跳过需要编译的包，使用预编译版本）
echo "📦 安装Python依赖..."
pip install "pydantic>=2.7.0,<3.0.0" "pydantic-core>=2.18.0,<3.0.0" -q
pip install "fastapi==0.104.1" "uvicorn==0.24.0" -q
pip install "requests==2.31.0" "schedule==1.2.0" -q
pip install "typing-extensions>=4.8.0" -q

# 尝试安装Scrapy，如果失败则跳过
pip install "scrapy==2.11.2" -q 2>/dev/null || echo "⚠️  Scrapy安装可能需要额外依赖，爬虫功能将受限制"

echo ""
echo "✅ 依赖安装完成"
echo ""

# 启动服务
echo "🚀 启动白酒市场监控系统..."
echo ""
echo "📊 前端仪表盘: http://localhost:8000/index.html"
echo "📚 API文档: http://localhost:8000/docs"
echo "🔧 健康检查: http://localhost:8000/api/health"
echo ""
echo "按 Ctrl+C 停止服务"
echo ""

# 使用server.py启动
python server.py
