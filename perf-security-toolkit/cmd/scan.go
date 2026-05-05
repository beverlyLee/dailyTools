package cmd

import (
	"fmt"
	"time"

	"perf-security-toolkit/pkg/reporter"
	"perf-security-toolkit/pkg/security/configcheck"
	"perf-security-toolkit/pkg/security/llm"
	"perf-security-toolkit/pkg/security/scanner"

	"github.com/spf13/cobra"
)

var scanCmd = &cobra.Command{
	Use:   "scan",
	Short: "智能容器安全扫描器",
	Long: `扫描容器镜像中的漏洞和安全配置问题。
支持操作系统包漏洞、应用依赖漏洞扫描，
以及镜像配置安全最佳实践检查。`,
	RunE: runContainerScan,
}

var (
	scanImage     string
	scanOutput    string
	scanFormat    string
	scanOSPackages bool
	scanAppDeps   bool
	scanConfig    bool
	scanUseLLM    bool
	scanLLMProvider string
	scanLLMModel   string
	scanLLMAPIKey  string
)

func init() {
	rootCmd.AddCommand(scanCmd)

	scanCmd.Flags().StringVarP(&scanImage, "image", "i", "", "目标容器镜像（如: nginx:latest 或 my-image:v1）")
	scanCmd.Flags().StringVarP(&scanOutput, "output", "o", "", "输出文件路径")
	scanCmd.Flags().StringVarP(&scanFormat, "format", "f", "table", "输出格式：table, json, sarif")
	scanCmd.Flags().BoolVar(&scanOSPackages, "os-packages", true, "扫描操作系统包漏洞")
	scanCmd.Flags().BoolVar(&scanAppDeps, "app-deps", true, "扫描应用依赖漏洞")
	scanCmd.Flags().BoolVar(&scanConfig, "config", true, "检查镜像配置安全性")
	scanCmd.Flags().BoolVar(&scanUseLLM, "llm", false, "使用LLM解释漏洞风险和提供修复建议")
	scanCmd.Flags().StringVar(&scanLLMProvider, "llm-provider", "openai", "LLM提供商：openai, claude")
	scanCmd.Flags().StringVar(&scanLLMModel, "llm-model", "gpt-4", "LLM模型名称")
	scanCmd.Flags().StringVar(&scanLLMAPIKey, "llm-api-key", "", "LLM API密钥（也可通过环境变量 LLM_API_KEY 设置）")

	scanCmd.MarkFlagRequired("image")
}

func runContainerScan(cmd *cobra.Command, args []string) error {
	fmt.Println("=== 容器安全扫描器 ===")
	fmt.Printf("目标镜像: %s\n", scanImage)
	fmt.Printf("扫描类型: OS包=%v, 应用依赖=%v, 配置检查=%v\n", scanOSPackages, scanAppDeps, scanConfig)
	fmt.Printf("LLM分析: %v\n", scanUseLLM)
	fmt.Println()

	config := scanner.Config{
		ImageName:       scanImage,
		ScanOSPackages:  scanOSPackages,
		ScanAppDeps:     scanAppDeps,
		CheckConfig:     scanConfig,
	}

	fmt.Println("正在拉取并分析容器镜像...")
	containerScanner := scanner.New(config)
	scanResult, err := containerScanner.Scan()
	if err != nil {
		return fmt.Errorf("扫描失败: %w", err)
	}
	fmt.Printf("✓ 扫描完成: 发现 %d 个OS包漏洞, %d 个应用依赖漏洞\n",
		len(scanResult.OSVulnerabilities), len(scanResult.AppVulnerabilities))

	var configIssues []configcheck.ConfigIssue
	if scanConfig {
		fmt.Println("正在检查镜像配置安全性...")
		configChecker := configcheck.New()
		configIssues, err = configChecker.Check(scanImage)
		if err != nil {
			fmt.Printf("警告: 配置检查失败: %v\n", err)
		} else {
			fmt.Printf("✓ 配置检查完成: 发现 %d 个配置问题\n", len(configIssues))
		}
	}

	var llmExplanations []llm.Explanation
	if scanUseLLM {
		fmt.Println("正在调用LLM进行漏洞分析...")
		llmConfig := llm.Config{
			Provider: scanLLMProvider,
			Model:    scanLLMModel,
			APIKey:   scanLLMAPIKey,
		}
		llmClient := llm.New(llmConfig)
		llmExplanations, err = llmClient.ExplainVulnerabilities(
			scanResult.OSVulnerabilities,
			scanResult.AppVulnerabilities,
			configIssues,
		)
		if err != nil {
			fmt.Printf("警告: LLM分析失败: %v\n", err)
		} else {
			fmt.Printf("✓ LLM分析完成: 生成 %d 条解释\n", len(llmExplanations))
		}
	}

	report := reporter.SecurityReport{
		ImageName:         scanImage,
		ScanResult:        scanResult,
		ConfigIssues:      configIssues,
		LLMExplanations:   llmExplanations,
		GeneratedAt:       time.Now(),
	}

	fmt.Println("\n=== 生成报告 ===")
	rep := reporter.New()
	var output string

	switch scanFormat {
	case "json":
		output, err = rep.GenerateSecurityJSON(&report)
	case "sarif":
		output, err = rep.GenerateSecuritySARIF(&report)
	default:
		output, err = rep.GenerateSecurityTable(&report)
	}

	if err != nil {
		return fmt.Errorf("报告生成失败: %w", err)
	}

	if scanOutput != "" {
		err = rep.SaveToFile(output, scanOutput)
		if err != nil {
			return fmt.Errorf("保存报告失败: %w", err)
		}
		fmt.Printf("报告已保存到: %s\n", scanOutput)
	} else {
		fmt.Println(output)
	}

	return nil
}
