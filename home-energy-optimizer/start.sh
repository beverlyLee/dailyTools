#!/bin/bash

echo "🏠 家庭用电优化器"
echo "=================="
echo ""

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

if [ ! -d "venv" ]; then
    echo "📦 创建虚拟环境..."
    python3 -m venv venv
fi

echo "🔧 激活虚拟环境..."
source venv/bin/activate

echo "📚 安装依赖 (使用预编译wheel包)..."
pip install --quiet --upgrade pip
pip install --quiet --prefer-binary -r requirements.txt

echo ""
echo "✅ 依赖安装完成"
echo ""
echo "🚀 启动应用服务..."
echo "🌐 请在浏览器中打开: http://localhost:8050"
echo ""
echo "📊 示例数据已准备好: data/sample_energy_data.csv"
echo "🤖 火山大模型已配置完成"
echo ""

python app.py
