#!/bin/bash
# 论文引用网络分析器 - 代码质量检查脚本
# 使用方法: ./check_code.sh

echo "🚀 开始代码质量检查..."
echo "========================================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERROR_COUNT=0
WARNING_COUNT=0

# 1. Python 语法检查
echo ""
echo "📝 1/3 Python 语法检查..."
echo "----------------------------------------"

PYTHON_FILES=$(find . -name "*.py" -type f \
    -not -path "./venv/*" \
    -not -path "./env/*" \
    -not -path "*/__pycache__/*" \
    -not -name "*.pyc")

for file in $PYTHON_FILES; do
    python -m py_compile "$file" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ ${file}${NC}"
    else
        echo -e "${RED}❌ ${file} - 语法错误！${NC}"
        python -m py_compile "$file" 2>&1
        ERROR_COUNT=$((ERROR_COUNT + 1))
    fi
done

# 清理 .pyc 文件
find . -name "*.pyc" -delete
find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null

# 2. 检查常见问题
echo ""
echo "🔍 2/3 检查常见代码问题..."
echo "----------------------------------------"

# 检查 print 语句（建议使用 logging）- 只检查项目源代码
PRINT_COUNT=$(grep -r "print(" --include="*.py" . \
    --exclude-dir=venv --exclude-dir=env \
    --exclude-dir=__pycache__ 2>/dev/null | wc -l)
if [ $PRINT_COUNT -gt 0 ]; then
    echo -e "${YELLOW}⚠️  发现 ${PRINT_COUNT} 个 print 语句，建议使用 logging 模块${NC}"
    WARNING_COUNT=$((WARNING_COUNT + 1))
else
    echo -e "${GREEN}✅ 未发现 print 语句${NC}"
fi

# 检查 TODO/FIXME 标记 - 只检查项目源代码
TODO_COUNT=$(grep -r -i "TODO\|FIXME" --include="*.py" . \
    --exclude-dir=venv --exclude-dir=env \
    --exclude-dir=__pycache__ 2>/dev/null | wc -l)
if [ $TODO_COUNT -gt 0 ]; then
    echo -e "${YELLOW}⚠️  发现 ${TODO_COUNT} 个 TODO/FIXME 标记${NC}"
    WARNING_COUNT=$((WARNING_COUNT + 1))
else
    echo -e "${GREEN}✅ 代码中无 TODO/FIXME 标记${NC}"
fi

# 3. 检查导入语句
echo ""
echo "📦 3/3 检查模块导入..."
echo "----------------------------------------"

# 尝试导入主模块
if python -c "import sys; sys.path.insert(0, '.'); import app" 2>/dev/null; then
    echo -e "${GREEN}✅ app.py 模块导入成功${NC}"
else
    echo -e "${RED}❌ app.py 模块导入失败！${NC}"
    python -c "import sys; sys.path.insert(0, '.'); import app" 2>&1
    ERROR_COUNT=$((ERROR_COUNT + 1))
fi

# 尝试导入数据模块
if python -c "import sys; sys.path.insert(0, '.'); from data_sources.crossref_api import CrossRefAPI; from data_sources.custom_data import CustomDataImporter" 2>/dev/null; then
    echo -e "${GREEN}✅ data_sources 模块导入成功${NC}"
else
    echo -e "${RED}❌ data_sources 模块导入失败！${NC}"
    ERROR_COUNT=$((ERROR_COUNT + 1))
fi

# 检查 requirements.txt
echo ""
echo "📋 检查 requirements.txt..."
echo "----------------------------------------"
if [ -f "requirements.txt" ]; then
    REQUIRED_PACKAGES=("flask" "networkx" "scipy" "numpy")
    MISSING_PACKAGES=()
    
    for pkg in "${REQUIRED_PACKAGES[@]}"; do
        if grep -qi "^$pkg" requirements.txt; then
            echo -e "${GREEN}✅ ${pkg} 在 requirements.txt 中${NC}"
        else
            echo -e "${YELLOW}⚠️  ${pkg} 不在 requirements.txt 中${NC}"
            WARNING_COUNT=$((WARNING_COUNT + 1))
        fi
    done
else
    echo -e "${RED}❌ 未找到 requirements.txt${NC}"
    ERROR_COUNT=$((ERROR_COUNT + 1))
fi

# 总结
echo ""
echo "========================================"
echo "📊 检查结果总结"
echo "========================================"

if [ $ERROR_COUNT -eq 0 ]; then
    echo -e "${GREEN}✅ 所有关键检查通过！${NC}"
else
    echo -e "${RED}❌ 发现 ${ERROR_COUNT} 个错误${NC}"
fi

if [ $WARNING_COUNT -gt 0 ]; then
    echo -e "${YELLOW}⚠️  发现 ${WARNING_COUNT} 个警告${NC}"
fi

echo ""
echo "💡 建议："
echo "   - 提交代码前请运行此脚本"
echo "   - 修复所有错误后再提交"
echo "   - 警告项可以逐步优化"
echo ""

if [ $ERROR_COUNT -eq 0 ]; then
    echo -e "${GREEN}🎉 可以提交代码了！${NC}"
    exit 0
else
    echo -e "${RED}❌ 请修复错误后再提交${NC}"
    exit 1
fi
