package cmd

import (
	"os"

	"github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
	Use:   "perf-security-toolkit",
	Short: "性能与安全分析工具集",
	Long: `一个功能强大的性能与安全分析工具集，包含：
- 智能性能瓶颈分析器
- 智能容器安全扫描器
- Web界面支持`,
}

func Execute() error {
	return rootCmd.Execute()
}

func init() {
	rootCmd.CompletionOptions.DisableDefaultCmd = true
	rootCmd.SetOut(os.Stdout)
	rootCmd.SetErr(os.Stderr)
}
