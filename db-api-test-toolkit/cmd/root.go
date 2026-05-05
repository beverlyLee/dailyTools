package cmd

import (
	"github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
	Use:   "db-api-test-toolkit",
	Short: "数据库与 API 测试工具集",
	Long: `一个功能强大的数据库迁移助手和 API 接口压力测试工具集。

主要功能：
1. 数据库迁移助手：自动检测模型定义与数据库 schema 的差异，生成迁移脚本
2. API 接口压力测试工具：支持并发请求，实时显示性能指标`,
}

func Execute() error {
	return rootCmd.Execute()
}
