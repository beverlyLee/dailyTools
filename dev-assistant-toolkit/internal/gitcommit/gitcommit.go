package gitcommit

import (
	"fmt"
	"os/exec"
	"strings"

	"github.com/spf13/cobra"
)

var GitCommitCmd = &cobra.Command{
	Use:   "git",
	Short: "Git 相关工具",
	Long:  "智能 Git 提交助手，提供 diff 分析、交互式提交、AI 集成和 Hook 管理",
}

var analyzeCmd = &cobra.Command{
	Use:   "analyze",
	Short: "分析暂存区改动",
	Long:  "分析暂存区的文件改动，自动建议提交类型和检测破坏性变更",
	RunE: func(cmd *cobra.Command, args []string) error {
		analysis, err := AnalyzeDiff()
		if err != nil {
			return err
		}
		
		fmt.Println("=== 暂存区分析结果 ===")
		fmt.Println()
		fmt.Println("📁 暂存文件:")
		for _, f := range analysis.Files {
			fmt.Printf("  - %s\n", f)
		}
		fmt.Println()
		fmt.Printf("📌 建议提交类型: %s\n", analysis.CommitType)
		if analysis.IsBreaking {
			fmt.Println("⚠️  检测到可能的破坏性变更")
		}
		fmt.Println()
		fmt.Println("💡 使用 'dat git commit' 进行交互式提交")
		
		return nil
	},
}

var commitCmd = &cobra.Command{
	Use:   "commit",
	Short: "交互式提交",
	Long:  "使用交互式向导生成符合 Conventional Commits 规范的提交信息",
	RunE: func(cmd *cobra.Command, args []string) error {
		analysis, err := AnalyzeDiff()
		if err != nil {
			return err
		}
		
		return RunInteractive(analysis)
	},
}

var aiCmd = &cobra.Command{
	Use:   "ai",
	Short: "使用 AI 生成提交信息",
	Long:  "使用本地 LLM（如 Ollama）根据 diff 自动生成提交信息",
	RunE: func(cmd *cobra.Command, args []string) error {
		client := NewOllamaClient()
		
		if !client.IsAvailable() {
			return fmt.Errorf("Ollama 服务不可用，请确保:\n" +
				"1. Ollama 已安装并运行\n" +
				"2. 模型已下载 (ollama pull llama3)\n" +
				"3. 服务端口 11434 可访问")
		}
		
		fmt.Printf("🤖 使用模型: %s\n", client.Model)
		fmt.Println("📋 正在分析 diff 并生成提交信息...")
		fmt.Println()
		
		diff, err := getFullDiff()
		if err != nil {
			return fmt.Errorf("获取 diff 失败: %w", err)
		}
		
		msg, err := client.GenerateCommitMessage(diff)
		if err != nil {
			return err
		}
		
		fmt.Println("✅ 生成的提交信息:")
		fmt.Println("-----------------")
		fmt.Println(msg)
		fmt.Println("-----------------")
		fmt.Println()
		fmt.Println("💡 使用 'dat git commit' 进行交互式确认并提交")
		
		return nil
	},
}

var hookCmd = &cobra.Command{
	Use:   "hook",
	Short: "Git Hook 管理",
	Long:  "安装、管理 Git hooks 以强制提交规范",
}

var installHookCmd = &cobra.Command{
	Use:   "install",
	Short: "安装 Git hooks",
	Long:  "在当前 Git 仓库安装 pre-commit 和 commit-msg hooks",
	RunE: func(cmd *cobra.Command, args []string) error {
		return InstallHooks()
	},
}

func getFullDiff() (string, error) {
	cmd := exec.Command("git", "diff", "--cached")
	output, err := cmd.Output()
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(output)), nil
}

func init() {
	GitCommitCmd.AddCommand(analyzeCmd)
	GitCommitCmd.AddCommand(commitCmd)
	GitCommitCmd.AddCommand(aiCmd)
	GitCommitCmd.AddCommand(hookCmd)
	hookCmd.AddCommand(installHookCmd)
}
