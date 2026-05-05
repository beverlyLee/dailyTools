#!/bin/bash

echo "======================================"
echo "数据工程调度平台 - 本地启动脚本"
echo "======================================"

# 检查 Python 是否安装
if ! command -v python3 &> /dev/null; then
    echo "错误: Python 3 未安装，请先安装 Python 3.9+"
    exit 1
fi

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "错误: Node.js 未安装，请先安装 Node.js 18+"
    exit 1
fi

# 检查 npm 是否安装
if ! command -v npm &> /dev/null; then
    echo "错误: npm 未安装"
    exit 1
fi

# 进入项目目录
PROJECT_DIR="$(dirname "$0")"
cd "$PROJECT_DIR"

# 检查 macOS 上的 AirPlay Receiver（端口 5000 冲突的常见原因）
if [[ "$OSTYPE" == "darwin"* ]]; then
    # 检查端口 5000 是否被占用
    if lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo ""
        echo "⚠️  检测到端口 5000 已被占用"
        echo ""
        echo "在 macOS 上，这通常是因为 'AirPlay Receiver' 服务"
        echo "您可以通过以下方式解决："
        echo ""
        echo "方式一: 禁用 AirPlay Receiver（推荐）"
        echo "  1. 打开 系统设置 (System Settings)"
        echo "  2. 前往 通用 (General) > AirDrop & Handoff"
        echo "  3. 关闭 'AirPlay Receiver'"
        echo ""
        echo "方式二: 本脚本会自动尝试使用其他端口（5001, 5002...）"
        echo ""
        read -p "是否继续？(y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 0
        fi
    fi
fi

echo ""
echo "======================================"
echo "步骤 1: 安装后端依赖..."
echo "======================================"
cd "$PROJECT_DIR/backend"

# 检查是否已有虚拟环境
if [ ! -d "venv" ]; then
    echo "创建 Python 虚拟环境..."
    python3 -m venv venv
fi

# 激活虚拟环境
source venv/bin/activate

# 安装依赖
echo "安装 Python 依赖..."
pip install -r requirements-local.txt

# 复制环境变量配置（如果不存在）
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "已创建 .env 配置文件"
fi

echo ""
echo "======================================"
echo "步骤 2: 安装前端依赖..."
echo "======================================"
cd "$PROJECT_DIR/frontend"

if [ ! -d "node_modules" ]; then
    echo "安装 Node.js 依赖..."
    npm install
fi

# 复制环境变量配置（如果不存在）
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "已创建 .env 配置文件"
fi

echo ""
echo "======================================"
echo "步骤 3: 启动后端服务..."
echo "======================================"
cd "$PROJECT_DIR/backend"
source venv/bin/activate

# 清理旧的端口文件
rm -f .port

# 在后台启动后端
echo "启动后端服务（将自动查找可用端口）..."
python run-local.py &
BACKEND_PID=$!

# 等待后端启动并保存端口配置
echo "等待后端启动..."
for i in {1..30}; do
    if [ -f ".port" ]; then
        BACKEND_PORT=$(cat .port)
        if [ -n "$BACKEND_PORT" ] && [ "$BACKEND_PORT" -gt 0 ]; then
            break
        fi
    fi
    sleep 1
    echo -n "."
done
echo ""

# 检查后端是否启动成功
if ps -p $BACKEND_PID > /dev/null 2>&1; then
    if [ -n "$BACKEND_PORT" ] && [ "$BACKEND_PORT" -gt 0 ]; then
        echo "✅ 后端服务启动成功，端口: $BACKEND_PORT"
    else
        echo "✅ 后端服务启动成功"
        BACKEND_PORT=5000
    fi
else
    echo "❌ 后端服务启动失败"
    exit 1
fi

echo ""
echo "======================================"
echo "步骤 4: 启动前端服务..."
echo "======================================"
cd "$PROJECT_DIR/frontend"

echo "前端将自动连接到后端端口: $BACKEND_PORT"
echo "启动前端服务 (端口: 3000)..."
npm start &
FRONTEND_PID=$!

# 等待前端启动
echo "等待前端启动..."
sleep 8

echo ""
echo "======================================"
echo "✅ 服务启动完成！"
echo "======================================"
echo ""
echo "访问地址:"
echo "  - 前端界面: http://localhost:3000"
echo "  - 后端 API: http://localhost:$BACKEND_PORT"
echo ""
echo "进程信息:"
echo "  - 后端 PID: $BACKEND_PID"
echo "  - 前端 PID: $FRONTEND_PID"
echo ""
echo "======================================"
echo "常用命令:"
echo "======================================"
echo ""
echo "停止所有服务:"
echo "  kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "或者按 Ctrl+C 后运行:"
echo "  pkill -f 'python run-local.py'"
echo "  pkill -f 'npm start'"
echo ""
echo "单独启动后端:"
echo "  cd backend && source venv/bin/activate && python run-local.py"
echo ""
echo "单独启动前端:"
echo "  cd frontend && npm start"
echo ""
echo "======================================"
echo "提示: 请保持此终端窗口打开"
echo "======================================"
echo ""

# 等待用户中断
trap 'echo ""; echo "正在停止服务..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; rm -f "$PROJECT_DIR/backend/.port"; echo "服务已停止"; exit 0' SIGINT SIGTERM

# 保持脚本运行
wait
