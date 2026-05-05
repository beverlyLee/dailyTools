package stress

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"os"
	"sort"
	"time"
)

type ExportResult struct {
	Timestamp     time.Time              `json:"timestamp"`
	TotalRequests int64                  `json:"total_requests"`
	SuccessRequests int64                `json:"success_requests"`
	ErrorRequests int64                  `json:"error_requests"`
	ErrorRate     float64                `json:"error_rate_percent"`
	QPS           float64                `json:"qps"`
	ThroughputKB  float64                `json:"throughput_kb_per_sec"`
	AverageLatency float64               `json:"average_latency_ms"`
	MinLatency    float64                `json:"min_latency_ms"`
	MaxLatency    float64                `json:"max_latency_ms"`
	P50Latency    float64                `json:"p50_latency_ms"`
	P95Latency    float64                `json:"p95_latency_ms"`
	P99Latency    float64                `json:"p99_latency_ms"`
	StatusCodes   map[string]int64       `json:"status_codes"`
	Config        *StressTestConfig      `json:"config"`
}

type Exporter struct {
	stats  *Statistics
	config *StressTestConfig
}

func NewExporter(stats *Statistics, config *StressTestConfig) *Exporter {
	return &Exporter{
		stats:  stats,
		config: config,
	}
}

func (e *Exporter) generateExportResult() *ExportResult {
	statusCodes := make(map[string]int64)
	for code, count := range e.stats.GetStatusCodes() {
		statusCodes[fmt.Sprintf("%d", code)] = count
	}

	return &ExportResult{
		Timestamp:      time.Now(),
		TotalRequests:  e.stats.GetTotalRequests(),
		SuccessRequests: e.stats.GetSuccessRequests(),
		ErrorRequests:  e.stats.GetErrorRequests(),
		ErrorRate:      e.stats.GetErrorRate(),
		QPS:            e.stats.GetQPS(),
		ThroughputKB:   e.stats.GetThroughput(),
		AverageLatency: e.stats.GetAverageLatency(),
		MinLatency:     e.stats.GetMinLatency(),
		MaxLatency:     e.stats.GetMaxLatency(),
		P50Latency:     e.stats.GetLatencyPercentile(50),
		P95Latency:     e.stats.GetLatencyPercentile(95),
		P99Latency:     e.stats.GetLatencyPercentile(99),
		StatusCodes:    statusCodes,
		Config:         e.config,
	}
}

func (e *Exporter) ExportToJSON(filePath string) error {
	result := e.generateExportResult()

	data, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal JSON: %v", err)
	}

	if filePath == "" {
		fmt.Println(string(data))
		return nil
	}

	err = os.WriteFile(filePath, data, 0644)
	if err != nil {
		return fmt.Errorf("failed to write JSON file: %v", err)
	}

	fmt.Printf("结果已导出到: %s\n", filePath)
	return nil
}

func (e *Exporter) ExportToCSV(filePath string) error {
	result := e.generateExportResult()

	var records [][]string

	records = append(records, []string{"指标", "值"})
	records = append(records, []string{"时间戳", result.Timestamp.Format(time.RFC3339)})
	records = append(records, []string{"总请求数", fmt.Sprintf("%d", result.TotalRequests)})
	records = append(records, []string{"成功请求", fmt.Sprintf("%d", result.SuccessRequests)})
	records = append(records, []string{"失败请求", fmt.Sprintf("%d", result.ErrorRequests)})
	records = append(records, []string{"错误率(%)", fmt.Sprintf("%.2f", result.ErrorRate)})
	records = append(records, []string{"QPS", fmt.Sprintf("%.2f", result.QPS)})
	records = append(records, []string{"吞吐量(KB/s)", fmt.Sprintf("%.2f", result.ThroughputKB)})
	records = append(records, []string{"平均延迟(ms)", fmt.Sprintf("%.2f", result.AverageLatency)})
	records = append(records, []string{"最小延迟(ms)", fmt.Sprintf("%.2f", result.MinLatency)})
	records = append(records, []string{"最大延迟(ms)", fmt.Sprintf("%.2f", result.MaxLatency)})
	records = append(records, []string{"P50延迟(ms)", fmt.Sprintf("%.2f", result.P50Latency)})
	records = append(records, []string{"P95延迟(ms)", fmt.Sprintf("%.2f", result.P95Latency)})
	records = append(records, []string{"P99延迟(ms)", fmt.Sprintf("%.2f", result.P99Latency)})

	if len(result.StatusCodes) > 0 {
		records = append(records, []string{""})
		records = append(records, []string{"HTTP状态码分布"})
		records = append(records, []string{"状态码", "数量"})

		var codes []string
		for code := range result.StatusCodes {
			codes = append(codes, code)
		}
		sort.Strings(codes)

		for _, code := range codes {
			records = append(records, []string{code, fmt.Sprintf("%d", result.StatusCodes[code])})
		}
	}

	if filePath == "" {
		for _, record := range records {
			fmt.Println(record)
		}
		return nil
	}

	file, err := os.Create(filePath)
	if err != nil {
		return fmt.Errorf("failed to create CSV file: %v", err)
	}
	defer file.Close()

	writer := csv.NewWriter(file)
	defer writer.Flush()

	for _, record := range records {
		if err := writer.Write(record); err != nil {
			return fmt.Errorf("failed to write CSV record: %v", err)
		}
	}

	fmt.Printf("结果已导出到: %s\n", filePath)
	return nil
}

func (e *Exporter) Export(format string, filePath string) error {
	switch format {
	case "json":
		return e.ExportToJSON(filePath)
	case "csv":
		return e.ExportToCSV(filePath)
	default:
		return fmt.Errorf("unsupported export format: %s", format)
	}
}
