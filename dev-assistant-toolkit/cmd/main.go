package main

import (
	"fmt"
	"os"

	"dev-assistant-toolkit/internal/gitcommit"
	"dev-assistant-toolkit/internal/logparser"

	"github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
	Use:   "dat",
	Short: "Dev Assistant Toolkit - 开发辅助工具集",
	Long: `Dev Assistant Toolkit 是一个多功能的开发辅助工具集，
包含智能 Git 提交助手和高性能日志分析器。`,
}

func init() {
	rootCmd.AddCommand(gitcommit.GitCommitCmd)
	rootCmd.AddCommand(logparser.LogParserCmd)
}

func main() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}
