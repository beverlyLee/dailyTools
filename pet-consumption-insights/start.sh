#!/bin/bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m'

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
MAX_RETRIES=3
RETRY_DELAY=2
BACKEND_PORT=${FLASK_PORT:-8003}
FRONTEND_PORT=5173
BACKEND_PID=""
FRONTEND_PID=""

PROJECT_NAME="🐾 宠物消费洞察分析平台"

print_header() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║  $PROJECT_NAME                                                ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_step() {
    echo -e "\n${MAGENTA}[$(date '+%H:%M:%S')]${NC} $1"
}

print_success() {
    echo -e "   ${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "   ${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "   ${RED}❌ $1${NC}"
}

print_info() {
    echo -e "   ${BLUE}ℹ️  $1${NC}"
}

check_command() {
    if ! command -v "$1" &> /dev/null; then
        return 1
    fi
    return 0
}

get_version() {
    if check_command "$1"; then
        echo "$($1 --version 2>&1 | head -1)"
    else
        echo "未安装"
    fi
}

check_port_available() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 1
    fi
    return 0
}

kill_port_process() {
    local port=$1
    local pids=$(lsof -Pi :$port -sTCP:LISTEN -t 2>/dev/null)
    if [ -n "$pids" ]; then
        echo "$pids" | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
}

check_environment() {
    print_step "检查运行环境"
    
    local python_ok=false
    local node_ok=false
    
    if check_command python3; then
        PYTHON_CMD=python3
        python_ok=true
    elif check_command python; then
        PYTHON_CMD=python
        python_ok=true
    fi
    
    if check_command node; then
        NODE_CMD=node
        NPM_CMD=npm
        node_ok=true
    fi
    
    print_info "Python: $(get_version $PYTHON_CMD)"
    print_info "Node.js: $(get_version node)"
    print_info "npm: $(get_version npm)"
    
    if [ "$python_ok" = false ]; then
        print_error "未检测到 Python，请先安装 Python 3.8+"
        print_info "下载地址: https://www.python.org/downloads/"
        exit 1
    fi
    
    if [ "$node_ok" = false ]; then
        print_error "未检测到 Node.js，请先安装 Node.js 16+"
        print_info "下载地址: https://nodejs.org/"
        exit 1
    fi
    
    print_success "环境检查通过"
}

install_with_retry() {
    local package_manager="$1"
    local install_cmd="$2"
    local description="$3"
    local retries=0
    
    print_step "安装 $description"
    
    while [ $retries -lt $MAX_RETRIES ]; do
        print_info "尝试安装 (第 $((retries + 1))/$MAX_RETRIES 次)..."
        if eval "$install_cmd"; then
            print_success "$description 安装完成"
            return 0
        fi
        retries=$((retries + 1))
        if [ $retries -lt $MAX_RETRIES ]; then
            print_warning "安装失败，$RETRY_DELAY 秒后重试..."
            sleep $RETRY_DELAY
        fi
    done
    
    print_error "$description 安装失败"
    return 1
}

setup_backend() {
    print_step "配置后端环境"
    cd "$BACKEND_DIR"
    
    if [ ! -d "venv" ]; then
        print_info "创建 Python 虚拟环境..."
        if ! $PYTHON_CMD -m venv venv; then
            print_error "创建虚拟环境失败"
            exit 1
        fi
        print_success "虚拟环境创建完成"
    else
        print_info "虚拟环境已存在"
    fi
    
    source venv/bin/activate
    
    if ! install_with_retry "pip" "pip install -q --upgrade pip && pip install -q -r requirements.txt" "后端依赖"; then
        print_info "可能的解决方案："
        echo "      1. 检查网络连接"
        echo "      2. 使用国内镜像源: pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple"
        echo "      3. 手动执行: cd backend && source venv/bin/activate && pip install -r requirements.txt"
        exit 1
    fi
    
    cd "$PROJECT_DIR"
}

setup_frontend() {
    print_step "配置前端环境"
    cd "$FRONTEND_DIR"
    
    if [ -d "node_modules" ]; then
        print_info "依赖已存在，跳过安装"
    else
        print_info "尝试使用国内镜像源..."
        if ! install_with_retry "npm" "npm install --silent --registry https://registry.npmmirror.com" "前端依赖"; then
            print_warning "国内镜像源安装失败，尝试使用官方源..."
            if ! install_with_retry "npm" "npm install --silent" "前端依赖"; then
                print_info "可能的解决方案："
                echo "      1. 检查网络连接"
                echo "      2. 清除缓存: npm cache clean --force"
                echo "      3. 手动执行: cd frontend && npm install"
                exit 1
            fi
        fi
    fi
    
    cd "$PROJECT_DIR"
}

wait_for_service() {
    local port=$1
    local name=$2
    local max_wait=15
    local wait_count=0
    
    while [ $wait_count -lt $max_wait ]; do
        if ! check_port_available $port; then
            return 0
        fi
        sleep 1
        wait_count=$((wait_count + 1))
    done
    
    return 1
}

start_backend() {
    print_step "启动后端服务"
    cd "$BACKEND_DIR"
    source venv/bin/activate
    
    if ! check_port_available $BACKEND_PORT; then
        print_warning "端口 $BACKEND_PORT 已被占用，正在清理..."
        kill_port_process $BACKEND_PORT
    fi
    
    BACKEND_LOG="$PROJECT_DIR/logs/backend.log"
    mkdir -p "$(dirname "$BACKEND_LOG")"
    
    nohup python app.py > "$BACKEND_LOG" 2>&1 &
    BACKEND_PID=$!
    
    print_info "等待服务启动..."
    if wait_for_service $BACKEND_PORT "后端"; then
        print_success "后端服务启动成功 (PID: $BACKEND_PID)"
        print_info "监听端口: http://localhost:$BACKEND_PORT"
        print_info "日志文件: $BACKEND_LOG"
    else
        print_error "后端服务启动超时"
        print_info "查看日志: tail -f $BACKEND_LOG"
        cleanup
        exit 1
    fi
    
    cd "$PROJECT_DIR"
}

start_frontend() {
    print_step "启动前端服务"
    cd "$FRONTEND_DIR"
    
    if ! check_port_available $FRONTEND_PORT; then
        print_warning "端口 $FRONTEND_PORT 已被占用，正在清理..."
        kill_port_process $FRONTEND_PORT
    fi
    
    FRONTEND_LOG="$PROJECT_DIR/logs/frontend.log"
    mkdir -p "$(dirname "$FRONTEND_LOG")"
    
    if grep -q '"dev"' package.json; then
        NPM_SCRIPT="dev"
    else
        NPM_SCRIPT="serve"
    fi
    
    nohup npm run $NPM_SCRIPT > "$FRONTEND_LOG" 2>&1 &
    FRONTEND_PID=$!
    
    print_info "等待服务启动..."
    if wait_for_service $FRONTEND_PORT "前端"; then
        print_success "前端服务启动成功 (PID: $FRONTEND_PID)"
        print_info "访问地址: http://localhost:$FRONTEND_PORT"
        print_info "日志文件: $FRONTEND_LOG"
    else
        print_error "前端服务启动超时"
        print_info "查看日志: tail -f $FRONTEND_LOG"
        cleanup
        exit 1
    fi
    
    cd "$PROJECT_DIR"
}

cleanup() {
    echo ""
    print_step "正在停止所有服务..."
    
    if [ -n "$BACKEND_PID" ] && kill -0 $BACKEND_PID 2>/dev/null; then
        kill $BACKEND_PID 2>/dev/null
        print_info "后端服务已停止 (PID: $BACKEND_PID)"
    fi
    
    if [ -n "$FRONTEND_PID" ] && kill -0 $FRONTEND_PID 2>/dev/null; then
        kill $FRONTEND_PID 2>/dev/null
        print_info "前端服务已停止 (PID: $FRONTEND_PID)"
    fi
    
    kill_port_process $BACKEND_PORT
    kill_port_process $FRONTEND_PORT
    
    print_success "所有服务已安全停止"
    exit 0
}

print_complete() {
    echo ""
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                     🎉  启动成功!                             ║"
    echo "╠══════════════════════════════════════════════════════════════╣"
    echo "║  🌐  前端地址: http://localhost:$FRONTEND_PORT                      ║"
    echo "║  🔌  后端API:  http://localhost:$BACKEND_PORT                      ║"
    echo "║  📊  数据源: 支持多数据源切换                                   ║"
    echo "╠══════════════════════════════════════════════════════════════╣"
    echo "║  按 Ctrl+C 停止所有服务                                       ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""
}

verify_backend_api() {
    print_step "验证后端 API"
    
    local max_retries=5
    local count=0
    
    while [ $count -lt $max_retries ]; do
        if curl -s "http://localhost:$BACKEND_PORT/api/consumption-structure" > /dev/null 2>&1; then
            print_success "后端 API 验证通过"
            return 0
        fi
        sleep 1
        count=$((count + 1))
    done
    
    print_warning "API 验证超时，但服务可能仍在启动中"
    return 0
}

main() {
    print_header
    
    trap cleanup SIGINT SIGTERM
    
    check_environment
    setup_backend
    setup_frontend
    start_backend
    verify_backend_api
    start_frontend
    print_complete
    
    print_step "服务运行中，按 Ctrl+C 停止..."
    while true; do
        sleep 1
    done
}

main "$@"
