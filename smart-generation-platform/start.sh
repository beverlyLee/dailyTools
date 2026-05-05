#!/bin/bash

echo "========================================"
echo "智能图像与生成式AI平台 - 启动脚本"
echo "========================================"

# 检查是否在正确的目录
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "错误: 请在 smart-generation-platform 目录下运行此脚本"
    exit 1
fi

# 后端配置
echo ""
echo "1. 配置后端环境..."

cd backend

# 检查Python环境
if ! command -v python3 &> /dev/null; then
    echo "错误: 未找到 python3，请先安装 Python 3.8+"
    exit 1
fi

# 创建虚拟环境（如果不存在）
if [ ! -d "venv" ]; then
    echo "   创建 Python 虚拟环境..."
    python3 -m venv venv
fi

# 激活虚拟环境
echo "   激活虚拟环境..."
source venv/bin/activate

# 安装依赖
echo "   安装 Python 依赖..."
pip install -r requirements.txt -q

# 复制环境变量文件
if [ ! -f ".env" ]; then
    echo "   复制环境变量配置文件..."
    cp .env.example .env
    echo "   提示: 请编辑 backend/.env 文件配置您的 API 密钥"
fi

# 前端配置
echo ""
echo "2. 配置前端环境..."

cd ../frontend

# 检查Node.js环境
if ! command -v node &> /dev/null; then
    echo "错误: 未找到 node，请先安装 Node.js 18+"
    exit 1
fi

# 安装依赖
echo "   安装 Node.js 依赖..."
npm install --silent

echo ""
echo "========================================"
echo "配置完成！"
echo ""
echo "启动方式："
echo ""
echo "方式1: 分别启动前后端"
echo "  后端: cd backend && source venv/bin/activate && python run.py"
echo "  前端: cd frontend && npm run dev"
echo ""
echo "方式2: 使用 tmux 或新终端窗口"
echo "  终端1: cd backend && source venv/bin/activate && python run.py"
echo "  终端2: cd frontend && npm run dev"
echo ""
echo "访问地址："
echo "  前端: http://localhost:3000"
echo "  后端 API: http://localhost:8000"
echo "  后端文档: http://localhost:8000/docs"
echo "========================================"
