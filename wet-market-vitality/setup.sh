#!/usr/bin/env bash
set -e

echo "=========================================="
echo "  菜市场烟火气分析 - 环境初始化脚本"
echo "=========================================="
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "[1/4] 检查 Python 环境..."
python3 --version
echo ""

echo "[2/4] 安装 Python 依赖..."
pip install -r requirements.txt
echo ""

echo "[3/4] 安装 Playwright 浏览器..."
python -m playwright install chromium
echo ""

echo "[4/4] 生成 Mock 演示数据..."
python -m src.generate_mock
echo ""

echo "=========================================="
echo "  ✅ 环境初始化完成！"
echo "=========================================="
echo ""
echo "启动服务："
echo "  flask run --port 5001"
echo ""
echo "运行爬虫（需要能访问大众点评）："
echo "  python -m src.crawler.market_spider"
echo ""
echo "查看数据："
echo "  打开浏览器访问 http://127.0.0.1:5001"
echo ""
