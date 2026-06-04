#!/bin/bash
# Git 提交脚本
# 用法: ./git_commit.sh <工程名称> <提交信息>

PROJECT_NAME="$1"
COMMIT_MESSAGE="$2"
BASE_DIR="/Users/liboyang/trae/dailyTools"

if [ -z "$PROJECT_NAME" ]; then
    echo "❌ 请指定工程名称"
    echo "用法: $0 <工程名称> <提交信息>"
    exit 1
fi

if [ -z "$COMMIT_MESSAGE" ]; then
    echo "❌ 请指定提交信息"
    echo "用法: $0 <工程名称> <提交信息>"
    exit 1
fi

PROJECT_PATH="$BASE_DIR/$PROJECT_NAME"

echo "📦 开始提交代码..."
echo "工程路径: $PROJECT_PATH"
echo "提交信息: $COMMIT_MESSAGE"
echo ""

# 1. 移动到工程目录
echo "➡️  切换到工程目录..."
cd "$PROJECT_PATH" || {
    echo "❌ 工程目录不存在: $PROJECT_PATH"
    exit 1
}
echo "✅ 当前目录: $(pwd)"
echo ""

# 2. 检查是否是 git 仓库
echo "🔍 检查 git 仓库..."
if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
    echo "❌ 当前目录不是 git 仓库"
    exit 1
fi
echo "✅ 确认是 git 仓库"
echo ""

# 3. 检查是否有更改
echo "🔍 检查文件更改..."
CHANGED_FILES=$(git status --porcelain)
if [ -z "$CHANGED_FILES" ]; then
    echo "ℹ️  没有需要提交的更改"
    exit 0
fi
echo "✅ 检测到更改:"
echo "$CHANGED_FILES" | while read -r line; do
    echo "   $line"
done
echo ""

# 4. 执行 git add .
echo "➕ 执行 git add . ..."
git add . || {
    echo "❌ git add 失败"
    exit 1
}
echo "✅ 已添加所有文件到暂存区"
echo ""

# 5. 执行 git commit
echo "📝 执行 git commit ..."
git commit -m "$COMMIT_MESSAGE" || {
    echo "❌ git commit 失败"
    exit 1
}
echo ""

# 6. 获取 commit id
COMMIT_ID=$(git rev-parse HEAD)
echo "🎉 提交成功！"
echo "✅ Commit ID: $COMMIT_ID"
echo ""
echo "📋 提交信息:"
git log -1 --oneline
