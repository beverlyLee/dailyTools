#!/bin/bash

echo "========================================"
echo "  智能周报生成器 - 后端服务启动脚本"
echo "========================================"
echo ""

cd "$(dirname "$0")"

if [ ! -d "venv" ]; then
    echo "📦 创建虚拟环境..."
    python3 -m venv venv
    if [ $? -ne 0 ]; then
        echo "❌ 创建虚拟环境失败"
        exit 1
    fi
    echo "✅ 虚拟环境创建成功"
fi

echo ""
echo "🔧 激活虚拟环境..."
source venv/bin/activate

echo ""
echo "📥 安装/更新依赖..."
pip install -r requirements.txt -q

if [ $? -ne 0 ]; then
    echo "❌ 依赖安装失败"
    exit 1
fi
echo "✅ 依赖安装完成"

if [ ! -f ".env" ]; then
    echo ""
    echo "⚠️  未找到 .env 配置文件"
    echo "   正在从 .env.example 创建..."
    cp .env.example .env
    echo ""
    echo "ℹ️  请编辑 .env 文件，配置您的 OpenAI API Key"
    echo "   API Key 可在 https://platform.openai.com/api-keys 获取"
fi

echo ""
echo "🚀 启动后端服务..."
echo "   服务地址: http://localhost:5000"
echo "   健康检查: http://localhost:5000/api/health"
echo ""
echo "按 Ctrl+C 停止服务"
echo "========================================"
echo ""

python app.py
