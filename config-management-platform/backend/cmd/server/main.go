package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"config-management-platform/backend/api"
)

func main() {
	var port int
	var dataDir string
	var help bool

	flag.IntVar(&port, "port", 8080, "服务器监听端口")
	flag.IntVar(&port, "p", 8080, "服务器监听端口 (简写)")
	flag.StringVar(&dataDir, "data", "./data", "数据存储目录")
	flag.StringVar(&dataDir, "d", "./data", "数据存储目录 (简写)")
	flag.BoolVar(&help, "help", false, "显示帮助信息")
	flag.BoolVar(&help, "h", false, "显示帮助信息 (简写)")

	flag.Parse()

	if help {
		printHelp()
		return
	}

	absDataDir, err := filepath.Abs(dataDir)
	if err != nil {
		log.Fatalf("无效的数据目录: %v", err)
	}

	log.Println("========================================")
	log.Println("配置管理与差异对比平台 - 后端服务")
	log.Println("========================================")
	log.Printf("端口: %d", port)
	log.Printf("数据目录: %s", absDataDir)
	log.Println("========================================")

	server, err := api.NewServer(port, absDataDir)
	if err != nil {
		log.Fatalf("初始化服务器失败: %v", err)
	}

	log.Printf("服务器启动中...")
	if err := server.Start(); err != nil {
		log.Fatalf("服务器启动失败: %v", err)
	}
}

func printHelp() {
	fmt.Println("配置管理与差异对比平台 - 后端服务")
	fmt.Println()
	fmt.Println("用法:")
	fmt.Println("  server [选项]")
	fmt.Println()
	fmt.Println("选项:")
	fmt.Println("  -p, --port <端口>    服务器监听端口 (默认: 8080)")
	fmt.Println("  -d, --data <目录>    数据存储目录 (默认: ./data)")
	fmt.Println("  -h, --help           显示帮助信息")
	fmt.Println()
	fmt.Println("环境变量:")
	fmt.Println("  MASTER_KEY           AES-256 加密主密钥 (32字节十六进制字符串)")
	fmt.Println("                       如果未设置，将使用临时生成的密钥")
	fmt.Println()
	fmt.Println("API 端点:")
	fmt.Println("  GET    /health                      健康检查")
	fmt.Println("  GET    /api/v1/configs              列出所有配置")
	fmt.Println("  POST   /api/v1/configs              创建新配置")
	fmt.Println("  GET    /api/v1/configs/{env}/{id}  获取配置")
	fmt.Println("  POST   /api/v1/configs/{env}/{id}/rollback  回滚配置")
	fmt.Println("  GET    /api/v1/configs/{env}/{id}/versions    获取版本历史")
	fmt.Println("  POST   /api/v1/diff/text            文本差异对比")
	fmt.Println("  POST   /api/v1/diff/folder          文件夹差异对比")
	fmt.Println("  POST   /api/v1/merge/text           文本合并")
	fmt.Println("  POST   /api/v1/tools/format/convert 格式转换")
	fmt.Println("  POST   /api/v1/tools/encrypt        加密值")
	fmt.Println("  POST   /api/v1/tools/decrypt        解密值")
	fmt.Println("  GET    /api/v1/environments         列出环境")
	fmt.Println()
	os.Exit(0)
}
