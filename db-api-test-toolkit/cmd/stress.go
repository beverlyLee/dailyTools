package cmd

import (
	"encoding/json"
	"fmt"
	"os"

	"db-api-test-toolkit/pkg/stress"

	"github.com/spf13/cobra"
)

var (
	stressURL         string
	stressMethod      string
	stressHeaders     string
	stressBody        string
	stressConcurrency int
	stressRequests    int
	stressDuration    int
	stressTimeout     int
	stressThinkTime   int
	stressOutput      string
	stressOutputFile  string
	stressConfigFile  string
)

var stressCmd = &cobra.Command{
	Use:   "stress",
	Short: "API 接口压力测试工具",
	Long: `支持定义 HTTP 请求，配置并发数和请求总数，实时显示 QPS、延迟分布和错误率。

支持的 HTTP 方法: GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS`,
	Run: func(cmd *cobra.Command, args []string) {
		runStressTest()
	},
}

func init() {
	rootCmd.AddCommand(stressCmd)

	stressCmd.Flags().StringVarP(&stressURL, "url", "u", "", "目标 URL")
	stressCmd.Flags().StringVarP(&stressMethod, "method", "X", "GET", "HTTP 方法 (GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS)")
	stressCmd.Flags().StringVarP(&stressHeaders, "headers", "H", "", "HTTP 请求头 (JSON 格式)")
	stressCmd.Flags().StringVarP(&stressBody, "body", "d", "", "HTTP 请求体")
	stressCmd.Flags().IntVarP(&stressConcurrency, "concurrency", "c", 10, "并发数")
	stressCmd.Flags().IntVarP(&stressRequests, "requests", "n", 1000, "总请求数 (与 -t 二选一)")
	stressCmd.Flags().IntVarP(&stressDuration, "duration", "t", 0, "持续时间 (秒，与 -n 二选一)")
	stressCmd.Flags().IntVar(&stressTimeout, "timeout", 10, "请求超时时间 (秒)")
	stressCmd.Flags().IntVar(&stressThinkTime, "think-time", 0, "请求间隔时间 (毫秒)")
	stressCmd.Flags().StringVarP(&stressOutput, "output", "o", "json", "输出格式 (json, csv)")
	stressCmd.Flags().StringVarP(&stressOutputFile, "output-file", "O", "", "输出文件路径 (不指定则输出到控制台)")
	stressCmd.Flags().StringVarP(&stressConfigFile, "config", "f", "", "配置文件路径 (JSON 格式)")
}

func runStressTest() {
	var config *stress.StressTestConfig
	var err error

	if stressConfigFile != "" {
		config, err = stress.LoadConfigFromFile(stressConfigFile)
		if err != nil {
			fmt.Printf("错误: 无法加载配置文件: %v\n", err)
			os.Exit(1)
		}
	} else {
		config = stress.DefaultStressTestConfig()
	}

	if stressURL != "" {
		config.Request.URL = stressURL
	}

	if stressMethod != "" {
		config.Request.Method = stress.HTTPMethod(stressMethod)
	}

	if stressHeaders != "" {
		var headers map[string]string
		if err := json.Unmarshal([]byte(stressHeaders), &headers); err != nil {
			fmt.Printf("错误: 无法解析请求头 JSON: %v\n", err)
			os.Exit(1)
		}
		for k, v := range headers {
			config.Request.Headers[k] = v
		}
	}

	if stressBody != "" {
		config.Request.Body = stressBody
	}

	if stressConcurrency > 0 {
		config.Concurrency = stressConcurrency
	}

	if stressRequests > 0 {
		config.TotalRequests = stressRequests
	}

	if stressDuration > 0 {
		config.Duration = stressDuration
	}

	if stressTimeout > 0 {
		config.Timeout = stressTimeout
	}

	if stressThinkTime >= 0 {
		config.ThinkTime = stressThinkTime
	}

	if stressOutput != "" {
		config.OutputFormat = stressOutput
	}

	if stressOutputFile != "" {
		config.OutputFile = stressOutputFile
	}

	if config.Request.URL == "" {
		fmt.Println("错误: 必须指定目标 URL (-u 或 --url)")
		os.Exit(1)
	}

	if config.Duration <= 0 && config.TotalRequests <= 0 {
		fmt.Println("错误: 必须指定总请求数 (-n) 或持续时间 (-t)")
		os.Exit(1)
	}

	runner := stress.NewStressTestRunner(config)

	if err := runner.Run(); err != nil {
		fmt.Printf("错误: 压力测试执行失败: %v\n", err)
		os.Exit(1)
	}

	if config.OutputFile != "" || config.OutputFormat != "" {
		exporter := stress.NewExporter(runner.GetStatistics(), config)
		if err := exporter.Export(config.OutputFormat, config.OutputFile); err != nil {
			fmt.Printf("错误: 导出结果失败: %v\n", err)
			os.Exit(1)
		}
	}
}
