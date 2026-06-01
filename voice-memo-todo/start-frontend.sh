#!/bin/bash

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}  语音笔记待办 - 前端启动脚本${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

echo -e "${YELLOW}[1/5] 检查前端目录...${NC}"
if [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}✗ 错误: 前端目录不存在: $FRONTEND_DIR${NC}"
    exit 1
fi
echo -e "${GREEN}✓ 前端目录存在${NC}"
cd "$FRONTEND_DIR"

echo ""
echo -e "${YELLOW}[2/5] 检查 Node.js 环境...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ 错误: 未检测到 Node.js，请先安装 Node.js${NC}"
    exit 1
fi
NODE_VERSION=$(node --version)
echo -e "${GREEN}✓ Node.js 版本: $NODE_VERSION${NC}"

if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ 错误: 未检测到 npm${NC}"
    exit 1
fi
NPM_VERSION=$(npm --version)
echo -e "${GREEN}✓ npm 版本: $NPM_VERSION${NC}"

echo ""
echo -e "${YELLOW}[3/5] 检查 package.json...${NC}"
if [ ! -f "package.json" ]; then
    echo -e "${RED}✗ 错误: package.json 不存在${NC}"
    exit 1
fi
echo -e "${GREEN}✓ package.json 存在${NC}"

echo ""
echo -e "${YELLOW}[4/5] 检查并安装依赖...${NC}"
if [ ! -d "node_modules" ] || [ ! -f "package-lock.json" ]; then
    echo -e "${YELLOW}  依赖未安装，正在执行 npm install...${NC}"
    if npm install; then
        echo -e "${GREEN}✓ 依赖安装成功${NC}"
    else
        echo -e "${RED}✗ 依赖安装失败${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}  验证依赖完整性...${NC}"
    if npm run check-deps 2>/dev/null; then
        echo -e "${GREEN}✓ 依赖已安装且完整${NC}"
    else
        echo -e "${YELLOW}  依赖不完整，重新安装...${NC}"
        if npm install; then
            echo -e "${GREEN}✓ 依赖重新安装成功${NC}"
        else
            echo -e "${RED}✗ 依赖安装失败${NC}"
            exit 1
        fi
    fi
fi

echo ""
echo -e "${YELLOW}[5/5] 启动前端开发服务器...${NC}"
echo -e "${GREEN}✓ 前端将在 http://localhost:3000 启动${NC}"
echo ""
echo -e "${YELLOW}========================================${NC}"
echo ""

npm run dev
