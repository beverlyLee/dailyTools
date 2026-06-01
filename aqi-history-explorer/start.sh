#!/bin/bash

# AQI历史数据探索器启动脚本

echo "🌫️  AQI历史数据探索器"
echo "====================="

# 检查Python环境
if ! command -v python3 &> /dev/null; then
    echo "❌ 错误: 未找到Python3，请先安装Python"
    exit 1
fi

echo "✅ Python环境检测通过"

# 检查是否安装依赖
if [ ! -d "venv" ]; then
    echo "📦 创建虚拟环境..."
    python3 -m venv venv
fi

# 激活虚拟环境
source venv/bin/activate

# 安装依赖
echo "📦 检查依赖包..."
pip install -q -r requirements.txt

echo "✅ 依赖检查完成"

# 检查.env文件
if [ ! -f ".env" ]; then
    echo "⚠️  未找到.env文件，将使用示例配置"
    echo "   如需配置真实API，请复制 .env.example 为 .env 并填写相关信息"
fi

echo ""
echo "🚀 启动Streamlit应用..."
echo "   应用地址: http://localhost:8501"
echo "   按 Ctrl+C 停止应用"
echo ""

streamlit run app.py --server.address=0.0.0.0
