#!/bin/bash

# 开发者发际线焦虑分析器 - 一键启动脚本

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo "=============================================="
echo "  💇‍♂️  开发者发际线焦虑分析器启动中..."
echo "=============================================="
echo ""

# 检查并复制环境变量配置
if [ ! -f .env ]; then
    echo "📝 创建环境变量配置文件..."
    cp .env.example .env
    echo "   ⚠️  如需使用真实AI功能，请编辑 .env 文件配置 ARK_API_KEY"
    echo ""
fi

# 检查Python环境
echo "🐍 检查Python环境..."
if ! command -v python3 &> /dev/null; then
    echo "   ❌ 未找到Python3，请先安装Python"
    exit 1
fi
echo "   ✓ Python3 已就绪"

# 创建并激活虚拟环境
echo ""
echo "📦 设置Python虚拟环境..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "   ✓ 虚拟环境已创建"
fi
source venv/bin/activate
echo "   ✓ 虚拟环境已激活"

# 安装后端依赖
echo ""
echo "📦 安装后端依赖..."
pip install -q -r requirements.txt
echo "   ✓ 后端依赖安装完成"

# 检查Node.js环境
echo ""
echo "📦 检查Node.js环境..."
if ! command -v npm &> /dev/null; then
    echo "   ❌ 未找到npm，请先安装Node.js"
    exit 1
fi
echo "   ✓ Node.js 已就绪"

# 安装前端依赖
echo ""
echo "📦 安装前端依赖..."
cd "$PROJECT_DIR/frontend"
npm install --silent 2>/dev/null || true
echo "   ✓ 前端依赖安装完成"

# 返回项目根目录
cd "$PROJECT_DIR"

echo ""
echo "=============================================="
echo "  🚀 启动服务"
echo "=============================================="

# 定义清理函数
cleanup() {
    echo ""
    echo "🛑 正在停止服务..."
    if [ -n "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    if [ -n "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    echo "✅ 服务已停止"
    exit 0
}

# 捕获退出信号
trap cleanup INT TERM

# 启动后端服务
echo ""
echo "🌐 启动后端服务 (端口: 8000)..."
uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
echo "   ✓ 后端服务已启动 (PID: $BACKEND_PID)"

# 等待后端启动
sleep 5

# 启动前端服务
echo ""
echo "🎨 启动前端服务 (端口: 3000)..."
cd "$PROJECT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!
echo "   ✓ 前端服务已启动 (PID: $FRONTEND_PID)"

echo ""
echo "=============================================="
echo "  ✅ 所有服务启动成功！"
echo "=============================================="
echo ""
echo "  🌐 前端页面:    http://localhost:3000"
echo "  📊 后端API:     http://localhost:8000"
echo "  📖 API文档:     http://localhost:8000/docs"
echo "  🏥 健康检查:    http://localhost:8000/api/health"
echo ""
echo "  按 Ctrl+C 停止所有服务"
echo "=============================================="
echo ""

# 等待所有进程
wait
