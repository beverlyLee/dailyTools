#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="${SCRIPT_DIR}/venv"
REQUIREMENTS_FILE="${SCRIPT_DIR}/requirements.txt"

MIN_PYTHON_VERSION="3.9"
MAX_PYTHON_VERSION="3.11"

echo "========================================="
echo "  🐍 播客剪辑工具 - 虚拟环境初始化脚本"
echo "========================================="

version_gte() {
    [ "$(printf '%s\n' "$1" "$2" | sort -V | head -n 1)" = "$2" ]
}

version_lte() {
    [ "$(printf '%s\n' "$1" "$2" | sort -V | head -n 1)" = "$1" ]
}

check_python_version() {
    local python_cmd=$1
    local python_version=$($python_cmd -c 'import sys; print(".".join(map(str, sys.version_info[:2])))' 2>/dev/null)
    
    if version_gte "$python_version" "$MIN_PYTHON_VERSION" && version_lte "$python_version" "$MAX_PYTHON_VERSION"; then
        echo "   ✅ Python $python_version 符合要求 (${MIN_PYTHON_VERSION}-${MAX_PYTHON_VERSION})"
        return 0
    else
        echo "   ⚠️  Python $python_version 不在兼容范围内 (需要 ${MIN_PYTHON_VERSION}-${MAX_PYTHON_VERSION})"
        return 1
    fi
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

check_venv_exists() {
    if [ -d "${VENV_DIR}" ]; then
        echo ""
        echo "📦 检测到现有虚拟环境..."
        
        if [ -f "${VENV_DIR}/bin/activate" ]; then
            echo "   ✅ 虚拟环境结构完整"
            return 0
        else
            echo "   ⚠️  虚拟环境结构不完整，将重新创建"
            rm -rf "${VENV_DIR}"
            return 1
        fi
    fi
    return 1
}

create_venv() {
    echo ""
    echo "🌱 创建 Python 虚拟环境..."
    echo "   目录: ${VENV_DIR}"
    echo "   Python: ${PYTHON_CMD} (${PYTHON_VERSION})"
    
    $PYTHON_CMD -m venv "${VENV_DIR}"
    
    if [ $? -eq 0 ]; then
        echo "   ✅ 虚拟环境创建成功"
    else
        echo "   ❌ 虚拟环境创建失败"
        exit 1
    fi
}

upgrade_pip() {
    echo ""
    echo "📈 升级 pip..."
    source "${VENV_DIR}/bin/activate"
    pip install --upgrade pip -q
    local pip_version=$(pip --version | awk '{print $2}')
    echo "   ✅ pip 已升级到 ${pip_version}"
}

install_dependencies() {
    echo ""
    echo "📦 安装项目依赖..."
    
    if [ ! -f "${REQUIREMENTS_FILE}" ]; then
        echo "   ❌ 未找到 requirements.txt"
        exit 1
    fi
    
    source "${VENV_DIR}/bin/activate"
    
    echo "   正在安装依赖包，请稍候..."
    echo ""
    
    if pip install -r "${REQUIREMENTS_FILE}"; then
        echo ""
        echo "   ✅ 所有依赖安装成功"
    else
        echo ""
        echo "   ❌ 依赖安装失败"
        echo ""
        echo "   排错建议："
        echo "   1. 确认 Python 版本为 3.9-3.11"
        echo "   2. 删除 venv 目录后重试：rm -rf venv"
        echo "   3. 检查网络连接，或使用国内镜像源"
        exit 1
    fi
}

verify_installation() {
    echo ""
    echo "🔍 验证依赖安装..."
    
    source "${VENV_DIR}/bin/activate"
    
    local packages=("fastapi" "uvicorn" "ffmpeg" "pydantic")
    local all_ok=true
    
    for pkg in "${packages[@]}"; do
        if python -c "import ${pkg}; print(f'${pkg}: OK')" 2>&1; then
            echo "   ✅ ${pkg} 导入成功"
        else
            echo "   ❌ ${pkg} 导入失败"
            all_ok=false
        fi
    done
    
    if [ "$all_ok" = false ]; then
        echo ""
        echo "   ⚠️  部分依赖验证失败，请检查安装日志"
        exit 1
    fi
    
    echo ""
    echo "✅ 所有依赖验证通过！"
}

print_usage() {
    echo ""
    echo "========================================="
    echo "  🚀 使用方法"
    echo "========================================="
    echo ""
    echo "激活虚拟环境："
    echo "   source ${VENV_DIR}/bin/activate"
    echo ""
    echo "启动后端服务："
    echo "   cd ${SCRIPT_DIR}"
    echo "   source venv/bin/activate"
    echo "   python main.py"
    echo ""
    echo "或者直接运行上级目录的启动脚本："
    echo "   cd $(dirname "${SCRIPT_DIR}")"
    echo "   ./start-backend.sh"
    echo ""
}

main() {
    check_python
    
    if ! check_venv_exists; then
        create_venv
    fi
    
    upgrade_pip
    install_dependencies
    verify_installation
    print_usage
}

main "$@"
