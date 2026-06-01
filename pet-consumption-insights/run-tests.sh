#!/bin/bash

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$PROJECT_DIR/frontend"
IMG_DIR="$PROJECT_DIR/img"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════╗"
echo "║   🐾  宠物消费洞察分析平台 - 自动化测试             ║"
echo "╚══════════════════════════════════════════════════╝"
echo -e "${NC}"

mkdir -p "$IMG_DIR"

echo -e "${YELLOW}📸 截图保存目录: $IMG_DIR${NC}"
echo ""

echo -e "${BLUE}🔍 检查 Playwright 浏览器...${NC}"
cd "$FRONTEND_DIR"

if ! npx playwright --version > /dev/null 2>&1; then
    echo -e "${YELLOW}安装 Playwright...${NC}"
    npm install --save-dev @playwright/test
fi

if [ ! -d "$HOME/Library/Caches/ms-playwright/chromium-1140" ] && [ ! -d "$HOME/Library/Caches/ms-playwright/chromium-1208" ]; then
    echo -e "${YELLOW}安装 Chromium 浏览器...${NC}"
    npx playwright install chromium
fi

echo ""
echo -e "${BLUE}🚀 启动自动化测试...${NC}"
echo ""

npx playwright test auto-test.spec.js --headed --workers=1

TEST_EXIT_CODE=$?

echo ""
echo -e "${BLUE}📊 测试结果统计...${NC}"
echo ""

IMG_COUNT=$(ls -1 "$IMG_DIR"/*.png 2>/dev/null | wc -l)
echo -e "${GREEN}📸 生成截图数量: $IMG_COUNT${NC}"

echo ""
echo -e "${BLUE}📁 截图文件列表:${NC}"
ls -lh "$IMG_DIR"/*.png 2>/dev/null || echo "  (无PNG截图)"

echo ""
echo -e "${BLUE}📋 JSON测试结果:${NC}"
ls -lh "$IMG_DIR"/*.json 2>/dev/null || echo "  (无JSON结果)"

echo ""
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ 测试执行完成!${NC}"
else
    echo -e "${RED}❌ 测试执行完成 (有失败项)${NC}"
fi
echo ""
echo -e "${YELLOW}📍 所有截图已保存至: $IMG_DIR${NC}"
echo ""
