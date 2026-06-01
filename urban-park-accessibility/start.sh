#!/bin/bash

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
VENV_DIR="$PROJECT_DIR/venv"
SRC_DIR="$PROJECT_DIR/src"
DATA_DIR="$PROJECT_DIR/data"
DEFAULT_PORT=5000

echo "🏞️  城市公园可达性分析系统"
echo "================================"
echo

check_database() {
    echo "💾 数据库配置:"
    echo "   ✅ 使用 JSON 文件存储（无需 PostgreSQL）"
    echo "   ✅ 数据目录: $DATA_DIR"
    echo
}

check_venv() {
    echo "🔍 检查 Python 环境..."
    
    if ! command -v python3 &> /dev/null; then
        echo "❌ 未找到 python3，请先安装 Python 3"
        exit 1
    fi
    
    PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
    echo "   ✅ Python 版本: $PYTHON_VERSION"
    
    if [ ! -d "$VENV_DIR" ]; then
        echo "   📦 创建虚拟环境..."
        python3 -m venv "$VENV_DIR"
        echo "   ✅ 虚拟环境创建完成"
    else
        echo "   ✅ 虚拟环境已存在"
    fi
}

install_dependencies() {
    echo "📦 安装依赖包..."
    
    source "$VENV_DIR/bin/activate"
    
    if ! pip show flask &> /dev/null; then
        pip install --upgrade pip -q
        pip install -r "$PROJECT_DIR/requirements.txt" -q
        echo "   ✅ 依赖安装完成"
    else
        echo "   ✅ 依赖已存在"
    fi
    echo
}

check_port_available() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t &> /dev/null; then
        return 1
    else
        return 0
    fi
}

find_available_port() {
    local start_port=$1
    local current_port=$start_port
    
    while ! check_port_available $current_port; do
        echo "   ⚠️  端口 $current_port 被占用，尝试下一个..." >&2
        current_port=$((current_port + 1))
    done
    
    echo "$current_port"
}

get_final_port() {
    local port=$DEFAULT_PORT
    
    if [ -f "$PROJECT_DIR/.env" ]; then
        local env_port=$(grep -E "^FLASK_PORT=" "$PROJECT_DIR/.env" 2>/dev/null | cut -d'=' -f2 | tr -d '"' | tr -d "'" | tr -d ' ')
        if [ -n "$env_port" ]; then
            port=$env_port
        fi
    fi
    
    if [ -n "$FLASK_PORT" ]; then
        port=$FLASK_PORT
    fi
    
    if ! check_port_available $port; then
        local new_port=$(find_available_port $((port + 1)))
        echo "   ⚠️  端口 $port 被占用，自动使用端口 $new_port" >&2
        port=$new_port
    fi
    
    echo "$port"
}

open_browser() {
    local port=$1
    local url="http://localhost:$port"
    
    echo ""
    echo "🌐 正在打开浏览器..."
    echo "   $url"
    echo ""
    
    sleep 3
    
    if command -v open &> /dev/null; then
        open "$url" &
    elif command -v xdg-open &> /dev/null; then
        xdg-open "$url" &
    elif command -v start &> /dev/null; then
        start "$url" &
    fi
}

load_demo_data() {
    echo "📊 检查数据..."
    source "$VENV_DIR/bin/activate"
    cd "$SRC_DIR"
    
    if [ ! -f "$DATA_DIR/parks.json" ] || [ ! -f "$DATA_DIR/residential.json" ]; then
        echo "   📥 自动加载演示数据..."
        python -c "
from network.osm_loader import loader
result = loader.load_sample_data_shenzhen()
print(f'   ✅ 加载完成: {result[\"parks\"]} 个公园, {result[\"residential\"]} 个居住区')
" 2>/dev/null || echo "   ⚠️  演示数据加载中，请稍后在页面操作"
    else
        echo "   ✅ 数据文件已存在"
    fi
    echo
}

start_server() {
    echo "🚀 启动服务..."
    
    PORT=$(get_final_port)
    
    export FLASK_PORT=$PORT
    
    source "$VENV_DIR/bin/activate"
    cd "$SRC_DIR"
    
    echo "================================"
    echo "📝 服务地址: http://localhost:$PORT"
    echo "🌐 访问地址: http://127.0.0.1:$PORT"
    echo "⏹️  按 Ctrl+C 停止服务"
    echo "================================"
    echo
    
    open_browser $PORT &
    
    python api.py
}

main() {
    check_database
    check_venv
    install_dependencies
    load_demo_data
    start_server
}

main "$@"
