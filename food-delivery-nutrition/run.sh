#!/bin/bash
cd "$(dirname "$0")"

echo "=== 外卖营养分析器 ==="
echo

# 优先使用conda的Python（已确认包含所有依赖）
if [ -f "/opt/anaconda3/bin/python" ]; then
    PYTHON="/opt/anaconda3/bin/python"
    echo "使用 Anaconda Python: $PYTHON"
else
    PYTHON="python3"
    echo "使用系统 Python: $(which python3)"
fi

echo
echo "检查依赖..."
$PYTHON -c "
import sys
sys.path.insert(0, '.')
try:
    import PyQt5, matplotlib, fuzzywuzzy, dotenv
    print('✓ 所有依赖已安装')
except ImportError as e:
    print(f'✗ 缺少依赖: {e}')
    sys.exit(1)
"

if [ $? -ne 0 ]; then
    echo
    echo "安装依赖命令:"
    echo "  $PYTHON -m pip install PyQt5 matplotlib fuzzywuzzy python-Levenshtein python-dotenv pytesseract pillow"
    exit 1
fi

echo
echo "正在启动应用..."
echo "提示：点击 '生成示例数据' 按钮体验完整功能"
echo
$PYTHON main.py
