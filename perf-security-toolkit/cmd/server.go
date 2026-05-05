package cmd

import (
	"fmt"
	"log"

	"perf-security-toolkit/pkg/web/server"

	"github.com/spf13/cobra"
)

var serverCmd = &cobra.Command{
	Use:   "server",
	Short: "启动Web服务器",
	Long: `启动Web界面服务器，提供可视化的性能分析和安全扫描功能。
支持通过浏览器访问和操作所有工具功能。`,
	RunE: runServer,
}

var (
	serverPort int
	serverHost string
)

func init() {
	rootCmd.AddCommand(serverCmd)

	serverCmd.Flags().IntVarP(&serverPort, "port", "p", 8080, "服务器端口")
	serverCmd.Flags().StringVarP(&serverHost, "host", "H", "127.0.0.1", "服务器绑定地址")
}

func runServer(cmd *cobra.Command, args []string) error {
	fmt.Println("=== Web服务器 ===")
	fmt.Printf("地址: http://%s:%d\n", serverHost, serverPort)
	fmt.Println("按 Ctrl+C 停止服务器")
	fmt.Println()

	config := server.Config{
		Host: serverHost,
		Port: serverPort,
	}

	srv := server.New(config)
	log.Printf("服务器启动在 %s:%d", serverHost, serverPort)
	
	return srv.Start()
}
