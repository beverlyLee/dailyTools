package main

import (
	"bufio"
	"flag"
	"fmt"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/security-monitoring-toolkit/internal/common"
	"github.com/security-monitoring-toolkit/internal/dashboard"
	"github.com/security-monitoring-toolkit/internal/detector"
	"github.com/security-monitoring-toolkit/internal/scanner"
)

var dashboardServer *dashboard.DashboardServer

func main() {
	if len(os.Args) < 2 {
		printUsage()
		os.Exit(1)
	}

	command := os.Args[1]

	switch command {
	case "scan":
		handleScanCommand()
	case "detect":
		handleDetectCommand()
	case "dashboard":
		handleDashboardCommand()
	case "help", "--help", "-h":
		printUsage()
	default:
		fmt.Printf("Unknown command: %s\n", command)
		printUsage()
		os.Exit(1)
	}
}

func printUsage() {
	fmt.Println()
	fmt.Println("═══════════════════════════════════════════════════════════════")
	fmt.Println("  SECURITY MONITORING TOOLKIT")
	fmt.Println("═══════════════════════════════════════════════════════════════")
	fmt.Println()
	fmt.Println("  A comprehensive security monitoring tool for detecting")
	fmt.Println("  sensitive information in code and anomalies in logs.")
	fmt.Println()
	fmt.Println("  USAGE:")
	fmt.Println("    secmon <command> [options]")
	fmt.Println()
	fmt.Println("  COMMANDS:")
	fmt.Println("    scan       Scan for sensitive information in code")
	fmt.Println("    detect     Detect anomalies in log streams")
	fmt.Println("    dashboard  Start web dashboard for monitoring")
	fmt.Println("    help       Show this help message")
	fmt.Println()
	fmt.Println("  EXAMPLES:")
	fmt.Println("    secmon scan --path ./src --detailed")
	fmt.Println("    secmon detect --file app.log")
	fmt.Println("    secmon detect --stdin < app.log")
	fmt.Println("    secmon dashboard --port 8080")
	fmt.Println()
	fmt.Println("═══════════════════════════════════════════════════════════════")
	fmt.Println()
}

func handleScanCommand() {
	fs := flag.NewFlagSet("scan", flag.ExitOnError)

	var (
		targetPath   string
		outputFormat string
		outputPath   string
		detailed     bool
		includeTests bool
		workers      int
		ignore       string
	)

	fs.StringVar(&targetPath, "path", ".", "Target directory or file to scan")
	fs.StringVar(&outputFormat, "format", "console", "Output format: console, json, csv")
	fs.StringVar(&outputPath, "output", "", "Output file path (for json/csv formats)")
	fs.BoolVar(&detailed, "detailed", false, "Show detailed findings with remediation advice")
	fs.BoolVar(&includeTests, "include-tests", false, "Include test files in scan")
	fs.IntVar(&workers, "workers", 4, "Number of parallel workers")
	fs.StringVar(&ignore, "ignore", "", "Additional ignore patterns (comma-separated)")

	fs.Parse(os.Args[2:])

	config := scanner.DefaultConfig()
	config.Workers = workers
	config.IncludeTests = includeTests

	if ignore != "" {
		for _, p := range strings.Split(ignore, ",") {
			config.AddIgnorePattern(strings.TrimSpace(p))
		}
	}

	s := scanner.NewScanner(config)

	fmt.Printf("\n  🔍 Scanning: %s\n", targetPath)
	fmt.Printf("  📊 Using %d workers...\n\n", workers)

	startTime := time.Now()
	report, err := s.Scan(targetPath)
	if err != nil {
		fmt.Printf("  ❌ Error: %v\n", err)
		os.Exit(1)
	}

	duration := time.Since(startTime)
	fmt.Printf("  ✅ Scan completed in %s\n", common.FormatDuration(duration))

	gen := scanner.NewReportGenerator(config.Rules)

	switch strings.ToLower(outputFormat) {
	case "json":
		if outputPath == "" {
			outputPath = "scan-report.json"
		}
		if err := gen.GenerateJSON(report, outputPath); err != nil {
			fmt.Printf("  ❌ Error writing report: %v\n", err)
			os.Exit(1)
		}
		fmt.Printf("  📄 Report saved to: %s\n", outputPath)
	case "csv":
		if outputPath == "" {
			outputPath = "scan-report.csv"
		}
		if err := gen.GenerateCSV(report, outputPath); err != nil {
			fmt.Printf("  ❌ Error writing report: %v\n", err)
			os.Exit(1)
		}
		fmt.Printf("  📄 Report saved to: %s\n", outputPath)
	default:
		gen.GenerateConsole(report, detailed)
	}

	if len(report.Findings) > 0 {
		os.Exit(1)
	}
}

func handleDetectCommand() {
	fs := flag.NewFlagSet("detect", flag.ExitOnError)

	var (
		logFile      string
		useStdin     bool
		slackWebhook string
		webhookURL   string
		learningTime time.Duration
		alertThresh  float64
		verbose      bool
	)

	fs.StringVar(&logFile, "file", "", "Log file to process")
	fs.BoolVar(&useStdin, "stdin", false, "Read from stdin")
	fs.StringVar(&slackWebhook, "slack-webhook", "", "Slack webhook URL for alerts")
	fs.StringVar(&webhookURL, "webhook", "", "Custom webhook URL for alerts")
	fs.DurationVar(&learningTime, "learn-time", 5*time.Minute, "Learning phase duration")
	fs.Float64Var(&alertThresh, "alert-threshold", 0.8, "Alert threshold (0.0-1.0)")
	fs.BoolVar(&verbose, "verbose", false, "Show verbose output")

	fs.Parse(os.Args[2:])

	config := detector.DefaultConfig()
	config.LearningPhaseDuration = learningTime
	config.AlertThreshold = alertThresh
	config.SlackWebhook = slackWebhook
	config.WebhookURL = webhookURL
	config.Verbose = verbose

	d := detector.NewDetector(config)

	fmt.Println()
	fmt.Println("  📊 Log Anomaly Detector")
	fmt.Printf("  📚 Learning phase: %s\n", learningTime)
	fmt.Printf("  ⚠️  Alert threshold: %.2f\n", alertThresh)
	fmt.Println()

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	stopChan := make(chan struct{})
	alertChan := make(chan *common.AnomalyAlert, 100)

	go func() {
		if logFile != "" {
			fmt.Printf("  📂 Processing file: %s\n\n", logFile)
			alerts, err := d.ProcessFile(logFile)
			if err != nil {
				fmt.Printf("  ❌ Error: %v\n", err)
				return
			}
			for _, alert := range alerts {
				alertChan <- alert
			}
			d.PrintStats()
		} else if useStdin {
			fmt.Println("  📥 Reading from stdin... (Press Ctrl+C to stop)")
			fmt.Println()
			reader := bufio.NewReader(os.Stdin)
			streamAlerts := d.ProcessStream(reader, stopChan)
			for alert := range streamAlerts {
				alertChan <- alert
			}
		} else {
			fmt.Println("  ❌ Please specify --file or --stdin")
			os.Exit(1)
		}
	}()

	go func() {
		for alert := range alertChan {
			fmt.Println("  ════════════════════════════════════════════════════")
			fmt.Printf("  ⚠️  ANOMALY ALERT: %s\n", alert.Title)
			fmt.Printf("       Severity: %s\n", strings.ToUpper(string(alert.Severity)))
			fmt.Printf("       Type:     %s\n", alert.Type)
			fmt.Printf("       Time:     %s\n", alert.Timestamp.Format(time.RFC3339))
			fmt.Printf("       Reason:   %s\n", alert.Description)
			if len(alert.Scores) > 0 {
				fmt.Printf("       Score:    %.2f\n", alert.Scores[0].Score)
			}
			fmt.Println("  ════════════════════════════════════════════════════")
			fmt.Println()
		}
	}()

	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-sigChan:
			fmt.Println("\n\n  🛑 Stopping detector...")
			close(stopChan)
			time.Sleep(500 * time.Millisecond)
			d.PrintStats()
			return
		case <-ticker.C:
			if verbose {
				d.PrintStats()
			}
		}
	}
}

func handleDashboardCommand() {
	fs := flag.NewFlagSet("dashboard", flag.ExitOnError)

	var (
		port       int
		enableAuth bool
		username   string
		password   string
	)

	fs.IntVar(&port, "port", 8080, "Dashboard port")
	fs.BoolVar(&enableAuth, "auth", false, "Enable basic authentication")
	fs.StringVar(&username, "user", "admin", "Username for auth")
	fs.StringVar(&password, "pass", "", "Password for auth")

	fs.Parse(os.Args[2:])

	config := &common.DashboardConfig{
		Port:       port,
		EnableAuth: enableAuth,
		Username:   username,
		Password:   password,
	}

	scanConfig := scanner.DefaultConfig()
	detectConfig := detector.DefaultConfig()

	s := scanner.NewScanner(scanConfig)
	d := detector.NewDetector(detectConfig)

	dashboardServer = dashboard.NewDashboardServer(config, s, d)

	fmt.Println()
	fmt.Println("  ════════════════════════════════════════════════════════")
	fmt.Println("  🖥️  SECURITY MONITORING DASHBOARD")
	fmt.Println("  ════════════════════════════════════════════════════════")
	fmt.Println()
	fmt.Printf("  📡 Server starting on: http://localhost:%d\n", port)
	fmt.Println()
	fmt.Println("  Available endpoints:")
	fmt.Printf("    GET /              Dashboard UI\n")
	fmt.Printf("    GET /api/stats     Statistics JSON\n")
	fmt.Printf("    GET /api/scans     Recent scans\n")
	fmt.Printf("    GET /api/alerts    Recent alerts\n")
	fmt.Printf("    GET /api/patterns  Log patterns\n")
	fmt.Println()
	fmt.Println("  Press Ctrl+C to stop the server.")
	fmt.Println()

	go func() {
		if err := dashboardServer.Start(); err != nil {
			fmt.Printf("  ❌ Server error: %v\n", err)
			os.Exit(1)
		}
	}()

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	<-sigChan

	fmt.Println("\n  🛑 Stopping dashboard server...")
	dashboardServer.Stop()
	fmt.Println("  ✅ Server stopped.")
}
