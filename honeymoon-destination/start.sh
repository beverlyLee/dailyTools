#!/bin/bash

cd "$(dirname "$0")"

echo "🚀 正在启动蜜月目的地可视化项目..."

PORT=8000
MAX_PORT=8010

check_port() {
    lsof -ti:$1 > /dev/null 2>&1
    return $?
}

kill_port() {
    local pids=$(lsof -ti:$1 2>/dev/null)
    if [ -n "$pids" ]; then
        echo "🔪 正在杀死端口 $1 上的进程..."
        kill -9 $pids 2>/dev/null
        sleep 1
    fi
}

find_available_port() {
    local start_port=$1
    for port in $(seq $start_port $MAX_PORT); do
        if ! check_port $port; then
            echo $port
            return
        fi
    done
    echo ""
}

echo "🔍 检查端口 $PORT..."
if check_port $PORT; then
    echo "⚠️  端口 $PORT 已被占用"
    echo ""
    echo "请选择操作:"
    echo "1) 杀死占用进程并继续使用端口 $PORT"
    echo "2) 自动寻找可用端口 ($PORT-$MAX_PORT)"
    echo "3) 手动指定端口"
    echo "4) 退出"
    read -p "请输入选项 [1-4]: " choice
    
    case $choice in
        1)
            kill_port $PORT
            ;;
        2)
            NEW_PORT=$(find_available_port $((PORT + 1)))
            if [ -z "$NEW_PORT" ]; then
                echo "❌ 端口 $PORT-$MAX_PORT 都被占用，请手动释放端口后重试"
                exit 1
            fi
            PORT=$NEW_PORT
            echo "✅ 使用端口 $PORT"
            ;;
        3)
            read -p "请输入端口号: " custom_port
            if check_port $custom_port; then
                echo "⚠️  端口 $custom_port 也被占用"
                kill_port $custom_port
            fi
            PORT=$custom_port
            ;;
        *)
            echo "❌ 退出"
            exit 1
            ;;
    esac
fi

if ! command -v python3 &> /dev/null; then
    echo "❌ 请先安装 Python 3"
    exit 1
fi

VENV_DIR="venv"
if [ ! -d "$VENV_DIR" ]; then
    echo "📦 创建 Python 虚拟环境..."
    python3 -m venv "$VENV_DIR"
fi

source "$VENV_DIR/bin/activate"

echo "📦 安装 Python 依赖..."
pip install -q -r requirements.txt

echo "🌐 检查前端依赖..."
cd frontend
if [ ! -d "node_modules" ]; then
    if ! command -v npm &> /dev/null; then
        echo "⚠️  未找到 npm，跳过前端构建"
        echo "💡 如需开发模式，请安装 Node.js 并运行 npm install"
    else
        echo "📦 安装前端依赖..."
        npm install 2>/dev/null || echo "⚠️  前端依赖安装可能不完整"
    fi
fi

if command -v npm &> /dev/null; then
    if [ ! -d "dist" ] || [ "$(ls -A dist 2>/dev/null | wc -l)" -eq 0 ]; then
        echo "🔨 构建前端..."
        npm run build 2>/dev/null || echo "⚠️  前端构建可能不完整"
    fi
fi

cd ..

echo ""
echo "✅ 准备完成！"
echo "🌐 访问地址: http://localhost:$PORT"
echo "📊 API 统计: http://localhost:$PORT/api/statistics"
echo "📍 API 路由: http://localhost:$PORT/api/routes"
echo ""
echo "💡 提示: 按 Ctrl+C 停止服务"
echo ""

export HONEYMOON_PORT=$PORT
python3 app.py
