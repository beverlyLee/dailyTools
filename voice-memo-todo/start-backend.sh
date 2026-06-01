#!/bin/bash

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}  语音笔记待办 - 后端启动脚本${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"

echo -e "${YELLOW}[1/5] 检查后端目录...${NC}"
if [ ! -d "$BACKEND_DIR" ]; then
    echo -e "${RED}✗ 错误: 后端目录不存在: $BACKEND_DIR${NC}"
    exit 1
fi
echo -e "${GREEN}✓ 后端目录存在${NC}"
cd "$BACKEND_DIR"

echo ""
echo -e "${YELLOW}[2/5] 检查 Python 环境...${NC}"
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
else
    echo -e "${RED}✗ 错误: 未检测到 Python，请先安装 Python 3.8+${NC}"
    exit 1
fi

PYTHON_VERSION=$($PYTHON_CMD --version 2>&1 | awk '{print $2}')
echo -e "${GREEN}✓ Python 版本: $PYTHON_VERSION${NC}"

PYTHON_MAJOR=$(echo $PYTHON_VERSION | cut -d. -f1)
PYTHON_MINOR=$(echo $PYTHON_VERSION | cut -d. -f2)
if [ "$PYTHON_MAJOR" -lt 3 ] || ([ "$PYTHON_MAJOR" -eq 3 ] && [ "$PYTHON_MINOR" -lt 8 ]); then
    echo -e "${RED}✗ 错误: 需要 Python 3.8 或更高版本${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}[3/5] 检查 pip 环境...${NC}"
if command -v pip3 &> /dev/null; then
    PIP_CMD="pip3"
elif command -v pip &> /dev/null; then
    PIP_CMD="pip"
else
    echo -e "${RED}✗ 错误: 未检测到 pip${NC}"
    exit 1
fi
PIP_VERSION=$($PIP_CMD --version 2>&1 | awk '{print $2}')
echo -e "${GREEN}✓ pip 版本: $PIP_VERSION${NC}"

echo ""
echo -e "${YELLOW}[4/5] 检查并安装 Python 依赖...${NC}"
if [ ! -f "requirements.txt" ]; then
    echo -e "${RED}✗ 错误: requirements.txt 不存在${NC}"
    exit 1
fi

echo -e "${YELLOW}  验证依赖包...${NC}"
DEPENDENCIES_OK=true
for pkg in fastapi uvicorn sqlalchemy pydantic; do
    if ! $PYTHON_CMD -c "import $pkg" 2>/dev/null; then
        DEPENDENCIES_OK=false
        break
    fi
done

if [ "$DEPENDENCIES_OK" = false ]; then
    echo -e "${YELLOW}  依赖未安装，正在执行 pip install...${NC}"
    if $PIP_CMD install -r requirements.txt; then
        echo -e "${GREEN}✓ Python 依赖安装成功${NC}"
    else
        echo -e "${RED}✗ Python 依赖安装失败${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ Python 依赖已安装且完整${NC}"
fi

echo ""
echo -e "${YELLOW}[5/5] 启动后端服务...${NC}"
echo -e "${GREEN}✓ 后端 API 将在 http://localhost:8000 启动${NC}"
echo -e "${GREEN}✓ API 文档: http://localhost:8000/docs${NC}"
echo ""
echo -e "${YELLOW}========================================${NC}"
echo ""

$PYTHON_CMD main.py
