#!/bin/bash

echo "===================================="
echo "  国潮音乐生成应用 - 启动脚本"
echo "===================================="
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

check_python() {
    if command -v python3 &> /dev/null; then
        echo "✓ Python 3 已安装"
        return 0
    elif command -v python &> /dev/null; then
        echo "✓ Python 已安装"
        return 0
    else
        echo "✗ Python 未安装，请先安装 Python 3.8+"
        return 1
    fi
}

check_node() {
    if command -v node &> /dev/null; then
        echo "✓ Node.js 已安装"
        return 0
    else
        echo "✗ Node.js 未安装，请先安装 Node.js 16+"
        return 1
    fi
}

setup_backend() {
    echo ""
    echo "正在设置后端..."
    cd "$BACKEND_DIR"
    
    if [ ! -d "venv" ]; then
        echo "创建虚拟环境..."
        python3 -m venv venv || python -m venv venv
    fi
    
    echo "激活虚拟环境..."
    source venv/bin/activate
    
    echo "安装依赖..."
    pip install -r requirements.txt -q
    
    echo "✓ 后端设置完成"
}

setup_frontend() {
    echo ""
    echo "正在设置前端..."
    cd "$FRONTEND_DIR"
    
    if [ ! -d "node_modules" ]; then
        echo "安装依赖..."
        npm install
    fi
    
    echo "✓ 前端设置完成"
}

start_backend() {
    echo ""
    echo "启动后端服务 (端口 8000)..."
    cd "$BACKEND_DIR"
    source venv/bin/activate
    python run.py
}

start_frontend() {
    echo ""
    echo "启动前端服务 (端口 3000)..."
    cd "$FRONTEND_DIR"
    npm run dev
}

echo "检查环境..."
check_python
check_node

echo ""
echo "选择操作:"
echo "1. 完整设置并启动 (首次使用)"
echo "2. 仅启动后端"
echo "3. 仅启动前端"
echo "4. 退出"

read -p "请输入选项 (1-4): " choice

case $choice in
    1)
        setup_backend
        setup_frontend
        echo ""
        echo "===================================="
        echo "  启动完成！"
        echo "===================================="
        echo "后端地址: http://localhost:8000"
        echo "前端地址: http://localhost:3000"
        echo "API 文档: http://localhost:8000/docs"
        echo ""
        
        echo "请在两个不同的终端窗口分别运行:"
        echo ""
        echo "终端 1 (后端):"
        echo "  cd $BACKEND_DIR"
        echo "  source venv/bin/activate"
        echo "  python run.py"
        echo ""
        echo "终端 2 (前端):"
        echo "  cd $FRONTEND_DIR"
        echo "  npm run dev"
        echo ""
        ;;
    2)
        setup_backend
        start_backend
        ;;
    3)
        setup_frontend
        start_frontend
        ;;
    4)
        echo "退出..."
        exit 0
        ;;
    *)
        echo "无效选项，退出..."
        exit 1
        ;;
esac
