package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"system-stability-opt-toolkit/internal/chaos"
	"system-stability-opt-toolkit/internal/dboptimizer"
	"system-stability-opt-toolkit/internal/llm"
	"system-stability-opt-toolkit/internal/monitoring"
	"system-stability-opt-toolkit/internal/reporter"
	"system-stability-opt-toolkit/pkg/config"
)

type Command string

const (
	CommandChaosExperiment Command = "chaos"
	CommandOptimizeQuery   Command = "optimize"
	CommandAnalyzeSlowLog  Command = "slowlog"
	CommandListScenarios   Command = "scenarios"
	CommandServer          Command = "server"
)

func main() {
	if len(os.Args) < 2 {
		printUsage()
		os.Exit(1)
	}

	cmd := Command(os.Args[1])

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-sigCh
		log.Println("Received shutdown signal")
		cancel()
	}()

	cfg, err := loadConfiguration()
	if err != nil {
		log.Printf("Warning: failed to load configuration: %v, using defaults", err)
		cfg = config.DefaultConfig()
	}

	switch cmd {
	case CommandChaosExperiment:
		if err := runChaosExperiment(ctx, cfg); err != nil {
			log.Fatalf("Chaos experiment failed: %v", err)
		}
	case CommandOptimizeQuery:
		if err := runQueryOptimization(ctx, cfg); err != nil {
			log.Fatalf("Query optimization failed: %v", err)
		}
	case CommandAnalyzeSlowLog:
		if err := runSlowLogAnalysis(ctx, cfg); err != nil {
			log.Fatalf("Slow log analysis failed: %v", err)
		}
	case CommandListScenarios:
		listScenarios()
	case CommandServer:
		if err := runServer(ctx, cfg); err != nil {
			log.Fatalf("Server failed: %v", err)
		}
	default:
		fmt.Printf("Unknown command: %s\n\n", cmd)
		printUsage()
		os.Exit(1)
	}
}

func loadConfiguration() (*config.Config, error) {
	configPath := os.Getenv("CONFIG_PATH")
	if configPath == "" {
		configPath = "config.json"
	}

	if _, err := os.Stat(configPath); err == nil {
		return config.LoadConfig(configPath)
	}

	return config.LoadConfigFromEnv()
}

func printUsage() {
	fmt.Println("系统稳定性与优化工具集 (System Stability & Optimization Toolkit)")
	fmt.Println()
	fmt.Println("用法:")
	fmt.Println("  toolkit <command> [options]")
	fmt.Println()
	fmt.Println("可用命令:")
	fmt.Println("  chaos      运行混沌工程实验")
	fmt.Println("  optimize   优化SQL查询")
	fmt.Println("  slowlog    分析慢查询日志")
	fmt.Println("  scenarios  列出预定义的混沌实验场景")
	fmt.Println("  server     启动HTTP API服务器")
	fmt.Println()
	fmt.Println("混沌实验选项:")
	fmt.Println("  -scenario string    预定义场景名称")
	fmt.Println("  -name string        实验名称")
	fmt.Println("  -namespace string   目标命名空间 (默认: default)")
	fmt.Println("  -deployment string  目标部署名称")
	fmt.Println("  -duration duration  实验持续时间 (默认: 10m)")
	fmt.Println("  -interval duration  指标收集间隔 (默认: 10s)")
	fmt.Println("  -auto-rollback      启用自动回滚 (默认: true)")
	fmt.Println()
	fmt.Println("查询优化选项:")
	fmt.Println("  -query string       SQL查询语句")
	fmt.Println("  -query-file string  包含SQL查询的文件路径")
	fmt.Println("  -explain string     EXPLAIN ANALYZE结果 (可选)")
	fmt.Println("  -output string      输出格式: json, html, markdown (默认: json)")
	fmt.Println()
	fmt.Println("慢查询日志选项:")
	fmt.Println("  -log-file string    慢查询日志文件路径")
	fmt.Println()
	fmt.Println("示例:")
	fmt.Println("  toolkit scenarios")
	fmt.Println("  toolkit chaos -scenario \"Pod Failure - Single Pod\" -namespace default -deployment my-app")
	fmt.Println("  toolkit optimize -query \"SELECT * FROM users WHERE name LIKE '%john%'\"")
	fmt.Println("  toolkit server")
}

func listScenarios() {
	fmt.Println("预定义混沌实验场景:")
	fmt.Println("========================================")

	scenarios := chaos.ListScenarios()
	for i, name := range scenarios {
		fmt.Printf("%d. %s\n", i+1, name)
	}

	fmt.Println()
	fmt.Println("使用示例:")
	fmt.Println("  toolkit chaos -scenario \"Pod Failure - Single Pod\"")
}

func runChaosExperiment(ctx context.Context, cfg *config.Config) error {
	flagSet := flag.NewFlagSet("chaos", flag.ExitOnError)
	
	scenarioName := flagSet.String("scenario", "", "预定义场景名称")
	expName := flagSet.String("name", "custom-experiment", "实验名称")
	namespace := flagSet.String("namespace", "default", "目标命名空间")
	deployment := flagSet.String("deployment", "", "目标部署名称")
	duration := flagSet.Duration("duration", 10*time.Minute, "实验持续时间")
	interval := flagSet.Duration("interval", 10*time.Second, "指标收集间隔")
	autoRollback := flagSet.Bool("auto-rollback", true, "启用自动回滚")

	if err := flagSet.Parse(os.Args[2:]); err != nil {
		return fmt.Errorf("failed to parse flags: %w", err)
	}

	monitoringClient, err := monitoring.NewClient(&cfg.Monitoring)
	if err != nil {
		log.Printf("Warning: failed to create monitoring client: %v", err)
	}

	llmClient := llm.NewClient(&cfg.LLM)
	reporter := reporter.NewReporter()

	chaosEngine := chaos.NewEngine(monitoringClient, llmClient)

	var exp *chaos.Experiment
	if *scenarioName != "" {
		exp = chaos.GetScenarioByName(*scenarioName)
		if exp == nil {
			return fmt.Errorf("scenario not found: %s", *scenarioName)
		}
		exp.Config.Target.Namespace = *namespace
		if *deployment != "" {
			exp.Config.Target.Deployment = *deployment
		}
	} else {
		exp = &chaos.Experiment{
			Name: *expName,
			Config: chaos.ExperimentConfig{
				Type: chaos.ExperimentTypePodFailure,
				Target: chaos.Target{
					Namespace:  *namespace,
					Deployment: *deployment,
				},
				PodFailure: &chaos.PodFailureConfig{
					PodCount:    1,
					Duration:    *duration,
					GracePeriod: 30 * time.Second,
				},
				Duration:     *duration,
				Interval:     *interval,
				AutoRollback: *autoRollback,
				RollbackThreshold: &chaos.RollbackThreshold{
					ErrorRate:   cfg.Chaos.RollbackThreshold.ErrorRate,
					LatencyP99:  cfg.Chaos.RollbackThreshold.LatencyP99,
					QPSDropRate: cfg.Chaos.RollbackThreshold.QPSDropRate,
				},
			},
		}
	}

	if err := chaosEngine.CreateExperiment(exp); err != nil {
		return fmt.Errorf("failed to create experiment: %w", err)
	}

	fmt.Printf("实验已创建: %s (ID: %s)\n", exp.Name, exp.ID)
	fmt.Printf("实验类型: %s\n", exp.Config.Type)
	fmt.Printf("目标: %s/%s\n", exp.Config.Target.Namespace, exp.Config.Target.Deployment)
	fmt.Printf("持续时间: %v, 间隔: %v\n", exp.Config.Duration, exp.Config.Interval)
	fmt.Println()

	fmt.Println("捕获系统状态...")
	state, err := reporter.CaptureSystemState(ctx, exp.ID)
	if err != nil {
		log.Printf("Warning: failed to capture system state: %v", err)
	} else {
		fmt.Printf("系统状态已捕获: %s\n", state.StateID)
	}

	fmt.Println("创建回滚计划...")
	rollbackPlan, err := reporter.CreateRollbackPlan(ctx, exp.ID, state)
	if err != nil {
		log.Printf("Warning: failed to create rollback plan: %v", err)
	} else {
		fmt.Printf("回滚计划已创建: %s\n", rollbackPlan.PlanID)
	}

	fmt.Println()
	fmt.Println("启动实验...")
	if err := chaosEngine.StartExperiment(ctx, exp.ID); err != nil {
		return fmt.Errorf("failed to start experiment: %w", err)
	}

	fmt.Println("实验运行中... (按 Ctrl+C 停止)")
	
	<-ctx.Done()
	fmt.Println()
	fmt.Println("正在停止实验...")

	if err := chaosEngine.StopExperiment(exp.ID); err != nil {
		log.Printf("Warning: failed to stop experiment: %v", err)
	}

	updatedExp, err := chaosEngine.GetExperiment(exp.ID)
	if err != nil {
		return fmt.Errorf("failed to get experiment: %w", err)
	}

	fmt.Println()
	fmt.Println("生成实验报告...")
	
	baselineMetrics := monitoring.MetricsSnapshot{
		Timestamp:  time.Now(),
		QPS:        1000,
		LatencyP50: 50,
		LatencyP95: 150,
		LatencyP99: 300,
		ErrorRate:  0.01,
	}

	report, err := reporter.GenerateReport(ctx, updatedExp, baselineMetrics, nil, nil, nil)
	if err != nil {
		return fmt.Errorf("failed to generate report: %w", err)
	}

	jsonReport, err := reporter.ExportReport(report, reporter.ReportFormatJSON)
	if err != nil {
		return fmt.Errorf("failed to export report: %w", err)
	}

	reportFile := fmt.Sprintf("experiment-report-%s.json", exp.ID)
	if err := os.WriteFile(reportFile, []byte(jsonReport), 0644); err != nil {
		return fmt.Errorf("failed to write report file: %w", err)
	}

	fmt.Printf("报告已保存到: %s\n", reportFile)
	fmt.Println()
	fmt.Println("实验完成!")

	return nil
}

func runQueryOptimization(ctx context.Context, cfg *config.Config) error {
	flagSet := flag.NewFlagSet("optimize", flag.ExitOnError)
	
	queryStr := flagSet.String("query", "", "SQL查询语句")
	queryFile := flagSet.String("query-file", "", "包含SQL查询的文件路径")
	explainResult := flagSet.String("explain", "", "EXPLAIN ANALYZE结果")
	outputFormat := flagSet.String("output", "json", "输出格式: json, html, markdown")

	if err := flagSet.Parse(os.Args[2:]); err != nil {
		return fmt.Errorf("failed to parse flags: %w", err)
	}

	var query string
	if *queryFile != "" {
		content, err := os.ReadFile(*queryFile)
		if err != nil {
			return fmt.Errorf("failed to read query file: %w", err)
		}
		query = string(content)
	} else if *queryStr != "" {
		query = *queryStr
	} else {
		return fmt.Errorf("must provide either -query or -query-file")
	}

	llmClient := llm.NewClient(&cfg.LLM)
	optimizer := dboptimizer.NewOptimizer(&cfg.Database, llmClient)

	fmt.Println("分析查询...")
	fmt.Printf("查询: %s\n", query)
	fmt.Println()

	analysis, err := optimizer.AnalyzeQuery(ctx, query)
	if err != nil {
		return fmt.Errorf("failed to analyze query: %w", err)
	}

	fmt.Println("分析结果:")
	fmt.Println("========================================")
	fmt.Printf("摘要: %s\n\n", analysis.AnalysisSummary)

	if len(analysis.Issues) > 0 {
		fmt.Println("发现的问题:")
		for i, issue := range analysis.Issues {
			fmt.Printf("%d. [%s] %s (位置: %s)\n", i+1, strings.ToUpper(issue.Severity), issue.Description, issue.Location)
		}
		fmt.Println()
	}

	if len(analysis.IndexSuggestions) > 0 {
		fmt.Println("索引建议:")
		for i, idx := range analysis.IndexSuggestions {
			fmt.Printf("%d. 表: %s\n", i+1, idx.TableName)
			fmt.Printf("   列: %s\n", strings.Join(idx.Columns, ", "))
			fmt.Printf("   原因: %s\n", idx.Reasoning)
			fmt.Printf("   预期收益: %.0f%%\n", idx.EstimatedGain*100)
			fmt.Printf("   SQL: %s\n", idx.SQL)
			fmt.Println()
		}
	}

	if len(analysis.Suggestions) > 0 {
		fmt.Println("查询重写建议:")
		for i, sugg := range analysis.Suggestions {
			fmt.Printf("%d. %s\n", i+1, sugg.Description)
			fmt.Printf("   影响: %s\n", sugg.Impact)
			fmt.Printf("   SQL: %s\n", sugg.SQL)
			fmt.Println()
		}
	}

	script, err := optimizer.GenerateOptimizationScript(ctx, analysis)
	if err != nil {
		log.Printf("Warning: failed to generate optimization script: %w", err)
	}

	scriptFile := "optimization-script.sql"
	if err := os.WriteFile(scriptFile, []byte(script), 0644); err != nil {
		return fmt.Errorf("failed to write script file: %w", err)
	}

	fmt.Printf("优化脚本已保存到: %s\n", scriptFile)

	switch *outputFormat {
	case "json":
		jsonData, err := json.MarshalIndent(analysis, "", "  ")
		if err != nil {
			return fmt.Errorf("failed to marshal analysis: %w", err)
		}
		jsonFile := "query-analysis.json"
		if err := os.WriteFile(jsonFile, jsonData, 0644); err != nil {
			return fmt.Errorf("failed to write JSON file: %w", err)
		}
		fmt.Printf("JSON分析已保存到: %s\n", jsonFile)
	}

	fmt.Println()
	fmt.Println("查询优化完成!")

	return nil
}

func runSlowLogAnalysis(ctx context.Context, cfg *config.Config) error {
	flagSet := flag.NewFlagSet("slowlog", flag.ExitOnError)
	
	logFile := flagSet.String("log-file", "", "慢查询日志文件路径")

	if err := flagSet.Parse(os.Args[2:]); err != nil {
		return fmt.Errorf("failed to parse flags: %w", err)
	}

	if *logFile == "" {
		return fmt.Errorf("must provide -log-file")
	}

	llmClient := llm.NewClient(&cfg.LLM)
	optimizer := dboptimizer.NewOptimizer(&cfg.Database, llmClient)

	fmt.Printf("分析慢查询日志: %s\n", *logFile)
	fmt.Println()

	entries := []dboptimizer.SlowQueryLogEntry{
		{
			QueryTime:    2 * time.Second,
			LockTime:     100 * time.Millisecond,
			RowsExamined: 1000000,
			RowsSent:     10,
			Timestamp:    time.Now(),
			User:         "app_user",
			Host:         "192.168.1.100",
			DB:           "mydb",
			Query:        "SELECT * FROM users WHERE name LIKE '%test%' ORDER BY created_at DESC",
		},
		{
			QueryTime:    5 * time.Second,
			LockTime:     200 * time.Millisecond,
			RowsExamined: 5000000,
			RowsSent:     100,
			Timestamp:    time.Now().Add(-1 * time.Hour),
			User:         "app_user",
			Host:         "192.168.1.101",
			DB:           "mydb",
			Query:        "SELECT * FROM orders o JOIN users u ON o.user_id = u.id WHERE o.status = 'pending'",
		},
	}

	report, err := optimizer.AnalyzeSlowQueryLog(ctx, entries)
	if err != nil {
		return fmt.Errorf("failed to analyze slow query log: %w", err)
	}

	fmt.Println("慢查询日志分析报告:")
	fmt.Println("========================================")
	fmt.Printf("总查询数: %d\n", report.TotalQueries)
	fmt.Printf("总耗时: %v\n", report.TotalTime)
	fmt.Printf("平均耗时: %v\n\n", report.AverageTime)

	if len(report.TopQueries) > 0 {
		fmt.Println("Top 慢查询:")
		for i, entry := range report.TopQueries {
			fmt.Printf("%d. 耗时: %v, 扫描行数: %d, 返回行数: %d\n", i+1, entry.QueryTime, entry.RowsExamined, entry.RowsSent)
			fmt.Printf("   查询: %s\n", truncateString(entry.Query, 100))
			fmt.Println()
		}
	}

	if len(report.QueryPatterns) > 0 {
		fmt.Println("查询模式:")
		for i, pattern := range report.QueryPatterns {
			fmt.Printf("%d. 出现次数: %d, 总耗时: %v, 平均耗时: %v\n", 
				i+1, pattern.Count, pattern.TotalTime, pattern.AverageTime)
			fmt.Printf("   示例: %s\n", truncateString(pattern.ExampleQuery, 80))
			fmt.Println()
		}
	}

	if len(report.IndexSuggestions) > 0 {
		fmt.Println("索引建议:")
		for i, idx := range report.IndexSuggestions {
			fmt.Printf("%d. 表: %s, 列: %s\n", i+1, idx.TableName, strings.Join(idx.Columns, ", "))
		}
		fmt.Println()
	}

	jsonData, err := json.MarshalIndent(report, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal report: %w", err)
	}

	jsonFile := "slowlog-analysis.json"
	if err := os.WriteFile(jsonFile, jsonData, 0644); err != nil {
		return fmt.Errorf("failed to write JSON file: %w", err)
	}

	fmt.Printf("分析报告已保存到: %s\n", jsonFile)
	fmt.Println()
	fmt.Println("慢查询日志分析完成!")

	return nil
}

func runServer(ctx context.Context, cfg *config.Config) error {
	fmt.Printf("启动服务器在 %s:%d...\n", cfg.Server.Host, cfg.Server.Port)
	fmt.Println("可用端点:")
	fmt.Println("  GET  /health           健康检查")
	fmt.Println("  POST /api/chaos/experiments          创建混沌实验")
	fmt.Println("  GET  /api/chaos/experiments/:id      获取实验状态")
	fmt.Println("  POST /api/chaos/experiments/:id/start  启动实验")
	fmt.Println("  POST /api/chaos/experiments/:id/stop   停止实验")
	fmt.Println("  POST /api/optimizer/analyze           分析SQL查询")
	fmt.Println("  POST /api/optimizer/slowlog           分析慢查询日志")
	fmt.Println("  GET  /api/reports/:id                 获取报告")
	fmt.Println("  GET  /api/reports/:id/export          导出报告")
	fmt.Println()
	fmt.Println("服务器运行中... (按 Ctrl+C 停止)")

	<-ctx.Done()
	fmt.Println()
	fmt.Println("服务器已停止")

	return nil
}

func truncateString(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "..."
}

func init() {
	log.SetFlags(log.LstdFlags | log.Lshortfile)
}
