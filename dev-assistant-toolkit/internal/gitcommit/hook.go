package gitcommit

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

const preCommitHookContent = `#!/bin/sh

# Dev Assistant Toolkit pre-commit hook
# 检查提交信息是否符合规范

# 检查是否有暂存的文件
if git diff --cached --quiet; then
    echo "⚠️  暂存区没有文件，跳过提交"
    exit 0
fi

# 使用 dat 工具分析 diff 并建议提交类型
if command -v dat &> /dev/null; then
    echo "📋 正在分析暂存区改动..."
    dat git analyze
    echo ""
    echo "💡 提示: 使用 'dat git commit' 进行交互式提交"
else
    echo "⚠️  未找到 dat 命令，跳过智能分析"
fi

# 可以在这里添加其他检查，比如：
# - 代码风格检查
# - 单元测试
# - 敏感信息检查

exit 0
`

const commitMsgHookContent = `#!/bin/sh

# Dev Assistant Toolkit commit-msg hook
# 验证提交信息是否符合 Conventional Commits 规范

COMMIT_MSG_FILE=$1
COMMIT_MSG=$(cat "$COMMIT_MSG_FILE")

# 跳过空提交信息
if [ -z "$COMMIT_MSG" ]; then
    exit 0
fi

# 跳过以 Merge 开头的提交
if echo "$COMMIT_MSG" | grep -q "^Merge"; then
    exit 0
fi

# 检查是否符合 Conventional Commits 格式
# 格式: type(scope): subject
# type 必须是: feat, fix, docs, style, refactor, perf, test, chore, build, ci
VALID_TYPES="feat|fix|docs|style|refactor|perf|test|chore|build|ci"

if echo "$COMMIT_MSG" | grep -qE "^($VALID_TYPES)(\([a-zA-Z0-9_-]+\))?!?: .+"; then
    exit 0
fi

echo ""
echo "❌ 提交信息格式不符合 Conventional Commits 规范"
echo ""
echo "正确的格式: <type>(<scope>): <subject>"
echo ""
echo "有效的 type:"
echo "  feat:     新功能"
echo "  fix:      修复 bug"
echo "  docs:     文档更新"
echo "  style:    代码格式"
echo "  refactor: 代码重构"
echo "  perf:     性能优化"
echo "  test:     测试相关"
echo "  chore:    构建/工具"
echo "  build:    构建系统"
echo "  ci:       CI/CD"
echo ""
echo "示例:"
echo "  feat(auth): 添加用户登录功能"
echo "  fix(api): 修复空指针异常"
echo "  docs: 更新 README"
echo ""
echo "💡 提示: 使用 'dat git commit' 进行交互式提交，自动生成规范的提交信息"
echo ""

exit 1
`

func InstallHooks() error {
	gitRoot, err := getGitRoot()
	if err != nil {
		return err
	}
	
	hookDir := filepath.Join(gitRoot, ".git", "hooks")
	
	if err := os.MkdirAll(hookDir, 0755); err != nil {
		return fmt.Errorf("创建 hooks 目录失败: %w", err)
	}
	
	preCommitPath := filepath.Join(hookDir, "pre-commit")
	if err := writeHook(preCommitPath, preCommitHookContent); err != nil {
		return err
	}
	
	commitMsgPath := filepath.Join(hookDir, "commit-msg")
	if err := writeHook(commitMsgPath, commitMsgHookContent); err != nil {
		return err
	}
	
	fmt.Println("✅ Git hooks 安装成功!")
	fmt.Println("   - pre-commit: 提交前分析改动")
	fmt.Println("   - commit-msg: 验证提交信息格式")
	
	return nil
}

func getGitRoot() (string, error) {
	cmd := exec.Command("git", "rev-parse", "--show-toplevel")
	output, err := cmd.Output()
	if err != nil {
		return "", fmt.Errorf("获取 git 仓库根目录失败: %w", err)
	}
	return strings.TrimSpace(string(output)), nil
}

func writeHook(path string, content string) error {
	if _, err := os.Stat(path); err == nil {
		fmt.Printf("⚠️  %s 已存在，是否覆盖? [y/N] ", path)
		var response string
		fmt.Scanln(&response)
		if strings.ToLower(response) != "y" {
			fmt.Printf("跳过 %s\n", path)
			return nil
		}
	}
	
	if err := os.WriteFile(path, []byte(content), 0755); err != nil {
		return fmt.Errorf("写入 %s 失败: %w", path, err)
	}
	
	return nil
}
