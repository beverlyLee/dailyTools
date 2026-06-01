#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${SCRIPT_DIR}/backend"
VENV_DIR="${BACKEND_DIR}/venv"
VENV_ACTIVATE="${VENV_DIR}/bin/activate"
SETUP_SCRIPT="${BACKEND_DIR}/setup-venv.sh"
REQUIREMENTS_FILE="${BACKEND_DIR}/requirements.txt"
MAIN_PY="${BACKEND_DIR}/main.py"

MIN_PYTHON_VERSION="3.9"
MAX_PYTHON_VERSION="3.11"

echo "========================================="
echo "  🚀 播客剪辑工具 - 后端服务启动器"
echo "========================================="

version_gte() {
    [ "$(printf '%s\n' "$1" "$2" | sort -V | head -n 1)" = "$2" ]
}

version_lte() {
    [ "$(printf '%s\n' "$1" "$2" | sort -V | head -n 1)" = "$1" ]
}

check_python() {
    echo ""
    echo "🔍 检查 Python 环境..."
    
    local found_python=""
    
    for py_cmd in python3.11 python3.10 python3.9 python3 python; do
        if command -v "$py_cmd" &> /dev/null; then
            local full_version=$($py_cmd --version 2>&1 | awk '{print $2}')
            local short_version=$(echo "$full_version" | cut -d. -f1,2)
            
            if version_gte "$short_version" "$MIN_PYTHON_VERSION" && version_lte "$short_version" "$MAX_PYTHON_VERSION"; then
                echo "   找到 $py_cmd: $full_version ✓"
                PYTHON_CMD="$py_cmd"
                PYTHON_VERSION="$full_version"
                found_python="yes"
                break
            else
                echo "   找到 $py_cmd: $full_version ✗ (版本不兼容)"
            fi
        fi
    done
    
    if [ -z "$found_python" ]; then
        echo ""
        echo "❌ 错误：未找到兼容的 Python 版本"
        echo "   需要 Python ${MIN_PYTHON_VERSION} 到 ${MAX_PYTHON_VERSION} 之间的版本"
        echo ""
        echo "   安装方法："
        echo "   - macOS (Homebrew): brew install python@3.11"
        echo "   - Ubuntu/Debian: sudo apt install python3.11 python3.11-venv"
        echo "   - 官网下载: https://www.python.org/downloads/"
        echo ""
        exit 1
    fi
    
    echo "   ✅ 使用 Python: $PYTHON_VERSION"
}

check_venv() {
    echo ""
    echo "🔍 检查虚拟环境状态..."
    
    if [ ! -d "${VENV_DIR}" ]; then
        echo "   ⚠️  未检测到虚拟环境，需要初始化"
        return 1
    fi
    
    if [ ! -f "${VENV_ACTIVATE}" ]; then
        echo "   ⚠️  虚拟环境不完整，需要重新创建"
        return 1
    fi
    
    echo "   ✅ 虚拟环境已存在"
    return 0
}

check_dependencies() {
    echo ""
    echo "🔍 检查依赖包完整性..."
    
    source "${VENV_ACTIVATE}"
    
    local packages=("fastapi" "uvicorn" "ffmpeg" "pydantic")
    local missing=0
    
    for pkg in "${packages[@]}"; do
        if ! python -c "import ${pkg}" 2>/dev/null; then
            echo "   ⚠️  缺少依赖: ${pkg}"
            missing=1
        fi
    done
    
    if [ $missing -eq 1 ]; then
        echo "   需要重新安装依赖"
        return 1
    fi
    
    echo "   ✅ 所有依赖已就绪"
    return 0
}

check_ffmpeg_system() {
    echo ""
    echo "🔍 检查系统 FFmpeg..."
    
    if command -v ffmpeg &> /dev/null; then
        FFMPEG_VERSION=$(ffmpeg -version 2>&1 | head -n 1 | awk '{print $3}')
        echo "   ✅ 系统 FFmpeg 已安装 (版本: ${FFMPEG_VERSION})"
        return 0
    else
        echo "   ⚠️  系统未安装 FFmpeg"
        echo ""
        echo "   请安装 FFmpeg 才能进行音频处理："
        echo "   - macOS:   brew install ffmpeg"
        echo "   - Ubuntu:  sudo apt install ffmpeg"
        echo "   - CentOS:  sudo yum install ffmpeg"
        echo ""
        read -p "   没有 FFmpeg 也可以继续启动服务，但音频处理功能将不可用。是否继续？(y/N) " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

setup_environment() {
    echo ""
    echo "🛠️  初始化环境..."
    
    if [ -x "${SETUP_SCRIPT}" ]; then
        echo "   运行 setup-venv.sh..."
        chmod +x "${SETUP_SCRIPT}"
        "${SETUP_SCRIPT}"
    else
        echo "   ⚠️  setup-venv.sh 不存在或不可执行，尝试手动安装..."
        cd "${BACKEND_DIR}"
        $PYTHON_CMD -m venv venv
        source venv/bin/activate
        pip install --upgrade pip
        pip install -r requirements.txt
    fi
}

start_server() {
    echo ""
    echo "🚀 启动 FastAPI 服务..."
    echo "   服务地址: http://0.0.0.0:8000"
    echo "   API 文档: http://0.0.0.0:8000/docs"
    echo ""
    echo "   按 Ctrl+C 停止服务"
    echo "========================================="
    echo ""
    
    cd "${BACKEND_DIR}"
    source "${VENV_ACTIVATE}"
    python main.py
}

main() {
    check_python
    check_ffmpeg_system
    
    if ! check_venv || ! check_dependencies; then
        setup_environment
    fi
    
    start_server
}

main "$@"
