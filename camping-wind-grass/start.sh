#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR"

echo "🏕️  露营地舒适度评估系统启动"
echo "================================"

cd "$PROJECT_DIR"

if [ ! -d "venv" ]; then
    echo "📦 创建 Python 虚拟环境..."
    if ! python3 -m venv venv; then
        echo "❌ 创建虚拟环境失败，使用系统 Python"
    fi
fi

echo "🔧 激活虚拟环境..."
source venv/bin/activate

echo "🔧 检查 Python 依赖..."
if [ -f "requirements.txt" ]; then
    echo "   正在安装依赖（进度请耐心等待）..."
    pip install --upgrade pip -q
    pip install -r requirements.txt 2>&1 | tail -5
    echo "   ✅ Python 依赖安装完成"
else
    echo "   ⚠️  requirements.txt 不存在，跳过依赖安装"
fi

echo "📦 检查前端构建..."
cd "$PROJECT_DIR/frontend"
if [ ! -d "dist" ] || [ ! -f "dist/index.html" ]; then
    if [ ! -d "node_modules" ]; then
        echo "   安装 npm 依赖（这可能需要几分钟）..."
        npm install --no-audit --no-fund 2>&1 | tail -3
    fi
    echo "   构建前端..."
    npm run build 2>&1 | tail -3
    echo "   ✅ 前端构建完成"
else
    echo "   ✅ 前端已构建，跳过"
fi

cd "$PROJECT_DIR"

echo ""
echo "🚀 启动服务..."
echo "📊 服务地址: http://localhost:8000"
echo "   按 Ctrl+C 停止服务"
echo ""

cd "$PROJECT_DIR/src"
python main.py
