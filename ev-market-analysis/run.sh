#!/bin/bash

cd "$(dirname "$0")"

echo "========================================"
echo "  新能源汽车市场趋势分析系统"
echo "========================================"
echo ""

echo "检查R环境..."
if ! command -v Rscript &> /dev/null; then
    echo "错误: 未找到Rscript，请先安装R语言"
    exit 1
fi
echo "R环境已就绪"
echo ""

mkdir -p output

echo "开始运行分析..."
echo ""

Rscript main.R
