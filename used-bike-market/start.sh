#!/bin/bash

set -e

cd "$(dirname "$0")"

MIN_PYTHON_VERSION="3.8"
MAX_PYTHON_VERSION="3.13"

check_python_version() {
    local python_cmd=$1
    if ! command -v "$python_cmd" &> /dev/null; then
        return 1
    fi
    
    local version=$("$python_cmd" -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
    local version_ok=$("$python_cmd" -c 'import sys; print(int(sys.version_info >= (3,8) and sys.version_info < (3,13)))')
    
    if [ "$version_ok" -eq 1 ]; then
        return 0
    else
        return 1
    fi
}

echo "检查 Python 环境..."

PYTHON_CMD=""
for cmd in python3.12 python3.11 python3.10 python3.9 python3.8 python3; do
    if check_python_version "$cmd"; then
        PYTHON_CMD="$cmd"
        echo "找到兼容的 Python: $cmd"
        break
    fi
done

if [ -z "$PYTHON_CMD" ]; then
    echo "错误: 未找到兼容的 Python 版本"
    echo "需要 Python >= $MIN_PYTHON_VERSION 且 < $MAX_PYTHON_VERSION"
    exit 1
fi

if [ ! -d "venv" ]; then
    echo "创建虚拟环境..."
    $PYTHON_CMD -m venv venv || {
        echo "虚拟环境创建失败，尝试使用系统临时目录..."
        TMPDIR=/tmp $PYTHON_CMD -m venv venv
    }
fi

if [ -f "venv/Scripts/activate" ]; then
    source venv/Scripts/activate
else
    source venv/bin/activate
fi

echo "安装依赖..."
pip install --upgrade pip
pip install -r requirements.txt

echo "检查环境变量..."
if [ -f ".env" ]; then
    echo "找到 .env 文件"
else
    echo "警告: 未找到 .env 文件"
fi

echo "启动服务..."
echo "访问地址: http://localhost:8000"
echo "按 Ctrl+C 停止服务"
echo ""

python src/main.py
