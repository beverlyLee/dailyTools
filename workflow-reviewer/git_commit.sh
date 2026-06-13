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
cd "$PROJECT_PATH" 2>&1 || {
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

# 3. 检查 git 配置
echo "🔍 检查 git 配置..."
GIT_USER_NAME=$(git config user.name 2>&1)
GIT_USER_EMAIL=$(git config user.email 2>&1)
if [ -z "$GIT_USER_NAME" ] || [ -z "$GIT_USER_EMAIL" ]; then
    echo "❌ Git 用户配置未设置"
    echo "请先执行以下命令配置 Git 用户："
    echo "  git config --global user.name \"你的名字\""
    echo "  git config --global user.email \"你的邮箱\""
    exit 1
fi
echo "✅ 用户: $GIT_USER_NAME <$GIT_USER_EMAIL>"
echo ""

# 4. 检查是否有更改
echo "🔍 检查文件更改..."
CHANGED_FILES=$(git status --porcelain 2>&1)
if [ -z "$CHANGED_FILES" ]; then
    echo "ℹ️  没有需要提交的更改"
    exit 0
fi
echo "✅ 检测到更改:"
echo "$CHANGED_FILES" | while read -r line; do
    echo "   $line"
done
echo ""

# 5. 执行 git add .
echo "➕ 执行 git add . ..."
git add . 2>&1 || {
    echo "❌ git add 失败"
    exit 1
}
echo "✅ 已添加所有文件到暂存区"
echo ""

# 6. 执行 git commit
echo "📝 执行 git commit ..."
COMMIT_OUTPUT=$(git commit -m "$COMMIT_MESSAGE" 2>&1)
COMMIT_EXIT_CODE=$?
if [ $COMMIT_EXIT_CODE -ne 0 ]; then
    echo "❌ git commit 失败 (退出码: $COMMIT_EXIT_CODE)"
    echo "📋 错误输出:"
    echo "$COMMIT_OUTPUT"
    exit $COMMIT_EXIT_CODE
fi
echo "$COMMIT_OUTPUT"
echo ""

# 7. 获取 commit id
COMMIT_ID=$(git rev-parse HEAD 2>&1)
echo "🎉 提交成功！"
echo "✅ Commit ID: $COMMIT_ID"
echo ""
echo "📋 提交信息:"
git log -1 --oneline 2>&1
