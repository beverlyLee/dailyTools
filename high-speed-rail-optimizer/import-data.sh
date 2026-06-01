#!/bin/bash

echo "="
echo "  高铁优化器 - 数据导入脚本"
echo "="

echo ""
echo "正在从12306获取最新数据..."
cd "$(dirname "$0")"

python3 scripts/import_data.py

echo ""
echo "数据导入完成！"
