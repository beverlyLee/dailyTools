package cmd

import (
	"os"

	"github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
	Use:   "file-viz-toolkit",
	Short: "文件与可视化工具集",
	Long:  `一个功能强大的文件管理与可视化工具集，包含文件去重和Mermaid终端渲染功能。`,
}

func Execute() error {
	return rootCmd.Execute()
}

func init() {
	rootCmd.CompletionOptions.DisableDefaultCmd = true
	rootCmd.SetOut(os.Stdout)
	rootCmd.SetErr(os.Stderr)
}
