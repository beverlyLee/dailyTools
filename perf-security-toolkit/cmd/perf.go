package cmd

import (
	"fmt"
	"time"

	"perf-security-toolkit/pkg/perf/analyzer"
	"perf-security-toolkit/pkg/perf/bottleneck"
	"perf-security-toolkit/pkg/perf/collector"
	"perf-security-toolkit/pkg/perf/flamegraph"
	"perf-security-toolkit/pkg/perf/optimizer"
	"perf-security-toolkit/pkg/reporter"

	"github.com/spf13/cobra"
)

var perfCmd = &cobra.Command{
	Use:   "perf",
	Short: "智能性能瓶颈分析器",
	Long: `收集系统运行时数据，分析性能瓶颈，提供优化建议。
支持CPU、内存、I/O、锁竞争等多维度分析。`,
	RunE: runPerfAnalysis,
}

var (
	perfDuration  int
	perfOutput    string
	perfFormat    string
	perfProcess   string
	perfCPU       bool
	perfMemory    bool
	perfIO        bool
	perfLock      bool
	perfFlamegraph bool
)

func init() {
	rootCmd.AddCommand(perfCmd)

	perfCmd.Flags().IntVarP(&perfDuration, "duration", "d", 30, "数据收集时长（秒）")
	perfCmd.Flags().StringVarP(&perfOutput, "output", "o", "", "输出文件路径")
	perfCmd.Flags().StringVarP(&perfFormat, "format", "f", "table", "输出格式：table, json, sarif")
	perfCmd.Flags().StringVarP(&perfProcess, "process", "p", "", "目标进程名称或PID（为空则监控整个系统）")
	perfCmd.Flags().BoolVar(&perfCPU, "cpu", true, "监控CPU使用率")
	perfCmd.Flags().BoolVar(&perfMemory, "memory", true, "监控内存使用")
	perfCmd.Flags().BoolVar(&perfIO, "io", true, "监控I/O活动")
	perfCmd.Flags().BoolVar(&perfLock, "lock", false, "监控锁竞争（需要root权限）")
	perfCmd.Flags().BoolVar(&perfFlamegraph, "flamegraph", true, "生成性能火焰图")
}

func runPerfAnalysis(cmd *cobra.Command, args []string) error {
	fmt.Println("=== 性能分析工具 ===")
	fmt.Printf("数据收集时长: %d秒\n", perfDuration)
	fmt.Printf("监控目标: %s\n", map[bool]string{true: perfProcess, false: "整个系统"}[perfProcess != ""])
	fmt.Println()

	config := collector.Config{
		Duration:     time.Duration(perfDuration) * time.Second,
		ProcessName:  perfProcess,
		MonitorCPU:   perfCPU,
		MonitorMemory: perfMemory,
		MonitorIO:    perfIO,
		MonitorLock:  perfLock,
	}

	fmt.Println("正在收集系统性能数据...")
	dataCollector := collector.New(config)
	data, err := dataCollector.Collect()
	if err != nil {
		return fmt.Errorf("数据收集失败: %w", err)
	}
	fmt.Println("✓ 数据收集完成")

	fmt.Println("正在分析性能数据...")
	perfAnalyzer := analyzer.New()
	analysisResult, err := perfAnalyzer.Analyze(data)
	if err != nil {
		return fmt.Errorf("性能分析失败: %w", err)
	}
	fmt.Println("✓ 性能分析完成")

	var flamegraphResult *flamegraph.FlamegraphResult
	if perfFlamegraph {
		fmt.Println("正在生成性能火焰图...")
		flameGen := flamegraph.New()
		flamegraphResult, err = flameGen.Generate(data)
		if err != nil {
			fmt.Printf("警告: 火焰图生成失败: %v\n", err)
		} else {
			fmt.Println("✓ 火焰图生成完成")
		}
	}

	fmt.Println("正在识别性能瓶颈...")
	bottleneckDetector := bottleneck.New()
	bottlenecks, err := bottleneckDetector.Detect(analysisResult, data)
	if err != nil {
		return fmt.Errorf("瓶颈识别失败: %w", err)
	}
	fmt.Printf("✓ 识别到 %d 个潜在瓶颈\n", len(bottlenecks))

	fmt.Println("正在生成优化建议...")
	optGenerator := optimizer.New()
	suggestions, err := optGenerator.Generate(bottlenecks, analysisResult)
	if err != nil {
		return fmt.Errorf("优化建议生成失败: %w", err)
	}
	fmt.Printf("✓ 生成 %d 条优化建议\n", len(suggestions))

	report := reporter.PerformanceReport{
		CollectedData:    data,
		AnalysisResult:   analysisResult,
		FlamegraphResult: flamegraphResult,
		Bottlenecks:      bottlenecks,
		Suggestions:      suggestions,
		GeneratedAt:      time.Now(),
	}

	fmt.Println("\n=== 生成报告 ===")
	rep := reporter.New()
	var output string

	switch perfFormat {
	case "json":
		output, err = rep.GenerateJSON(&report)
	case "sarif":
		output, err = rep.GenerateSARIF(&report)
	default:
		output, err = rep.GenerateTable(&report)
	}

	if err != nil {
		return fmt.Errorf("报告生成失败: %w", err)
	}

	if perfOutput != "" {
		err = rep.SaveToFile(output, perfOutput)
		if err != nil {
			return fmt.Errorf("保存报告失败: %w", err)
		}
		fmt.Printf("报告已保存到: %s\n", perfOutput)
	} else {
		fmt.Println(output)
	}

	return nil
}
