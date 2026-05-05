package reporter

import (
	"encoding/json"
	"fmt"
	"os"
	"sort"
	"strings"
	"time"

	"github.com/olekukonko/tablewriter"

	"perf-security-toolkit/pkg/perf/analyzer"
	"perf-security-toolkit/pkg/perf/bottleneck"
	"perf-security-toolkit/pkg/perf/collector"
	"perf-security-toolkit/pkg/perf/flamegraph"
	"perf-security-toolkit/pkg/perf/optimizer"
	"perf-security-toolkit/pkg/security/configcheck"
	"perf-security-toolkit/pkg/security/llm"
	"perf-security-toolkit/pkg/security/scanner"
)

type PerformanceReport struct {
	CollectedData    *collector.CollectedData   `json:"collected_data,omitempty"`
	AnalysisResult   *analyzer.AnalysisResult   `json:"analysis_result,omitempty"`
	FlamegraphResult *flamegraph.FlamegraphResult `json:"flamegraph_result,omitempty"`
	Bottlenecks      []bottleneck.Bottleneck     `json:"bottlenecks,omitempty"`
	Suggestions      []optimizer.Suggestion       `json:"suggestions,omitempty"`
	GeneratedAt      time.Time                    `json:"generated_at"`
}

type SecurityReport struct {
	ImageName        string                         `json:"image_name"`
	ScanResult       *scanner.ScanResult            `json:"scan_result,omitempty"`
	ConfigIssues     []configcheck.ConfigIssue       `json:"config_issues,omitempty"`
	LLMExplanations  []llm.Explanation               `json:"llm_explanations,omitempty"`
	GeneratedAt      time.Time                       `json:"generated_at"`
}

type SARIFReport struct {
	Schema  string  `json:"$schema"`
	Version string  `json:"version"`
	Runs    []SARIFRun `json:"runs"`
}

type SARIFRun struct {
	Tool    SARIFTool    `json:"tool"`
	Results []SARIFResult `json:"results"`
}

type SARIFTool struct {
	Driver SARIFDriver `json:"driver"`
}

type SARIFDriver struct {
	Name           string `json:"name"`
	Version        string `json:"version"`
	InformationURI string `json:"informationUri"`
}

type SARIFResult struct {
	RuleID      string            `json:"ruleId"`
	Level       string            `json:"level"`
	Message     SARIFMessage      `json:"message"`
	Locations   []SARIFLocation   `json:"locations,omitempty"`
	Properties  map[string]interface{} `json:"properties,omitempty"`
}

type SARIFMessage struct {
	Text string `json:"text"`
}

type SARIFLocation struct {
	PhysicalLocation SARIFPhysicalLocation `json:"physicalLocation,omitempty"`
}

type SARIFPhysicalLocation struct {
	ArtifactLocation SARIFArtifactLocation `json:"artifactLocation"`
	Region           SARIFRegion           `json:"region,omitempty"`
}

type SARIFArtifactLocation struct {
	URI string `json:"uri"`
}

type SARIFRegion struct {
	StartLine   int `json:"startLine,omitempty"`
	StartColumn int `json:"startColumn,omitempty"`
}

type Reporter struct{}

func New() *Reporter {
	return &Reporter{}
}

func (r *Reporter) GenerateJSON(report *PerformanceReport) (string, error) {
	data, err := json.MarshalIndent(report, "", "  ")
	if err != nil {
		return "", err
	}
	return string(data), nil
}

func (r *Reporter) GenerateSecurityJSON(report *SecurityReport) (string, error) {
	data, err := json.MarshalIndent(report, "", "  ")
	if err != nil {
		return "", err
	}
	return string(data), nil
}

func (r *Reporter) GenerateSARIF(report *PerformanceReport) (string, error) {
	sarif := SARIFReport{
		Schema:  "https://json.schemastore.org/sarif-2.1.0.json",
		Version: "2.1.0",
		Runs: []SARIFRun{
			{
				Tool: SARIFTool{
					Driver: SARIFDriver{
						Name:           "Performance Analyzer",
						Version:        "1.0.0",
						InformationURI: "https://github.com/perf-security-toolkit",
					},
				},
				Results: []SARIFResult{},
			},
		},
	}

	for _, bn := range report.Bottlenecks {
		level := r.severityToSARIFLevel(bn.Severity)
		result := SARIFResult{
			RuleID: string(bn.Type),
			Level:  level,
			Message: SARIFMessage{
				Text: fmt.Sprintf("%s: %s\nImpact: %s", bn.Description, bn.Details, bn.Impact),
			},
			Properties: map[string]interface{}{
				"severity":      bn.Severity,
				"current_value": bn.Metrics.CurrentValue,
				"threshold":     bn.Metrics.Threshold,
			},
		}
		sarif.Runs[0].Results = append(sarif.Runs[0].Results, result)
	}

	data, err := json.MarshalIndent(sarif, "", "  ")
	if err != nil {
		return "", err
	}
	return string(data), nil
}

func (r *Reporter) GenerateSecuritySARIF(report *SecurityReport) (string, error) {
	sarif := SARIFReport{
		Schema:  "https://json.schemastore.org/sarif-2.1.0.json",
		Version: "2.1.0",
		Runs: []SARIFRun{
			{
				Tool: SARIFTool{
					Driver: SARIFDriver{
						Name:           "Container Security Scanner",
						Version:        "1.0.0",
						InformationURI: "https://github.com/perf-security-toolkit",
					},
				},
				Results: []SARIFResult{},
			},
		},
	}

	for _, vuln := range report.ScanResult.OSVulnerabilities {
		level := r.vulnSeverityToSARIFLevel(vuln.Severity)
		result := SARIFResult{
			RuleID: vuln.VulnerabilityID,
			Level:  level,
			Message: SARIFMessage{
				Text: fmt.Sprintf("[%s] %s\nPackage: %s %s\nFixed Version: %s\nDescription: %s",
					vuln.Severity, vuln.Title, vuln.PackageName, vuln.InstalledVersion,
					vuln.FixedVersion, vuln.Description),
			},
			Properties: map[string]interface{}{
				"package":           vuln.PackageName,
				"installed_version": vuln.InstalledVersion,
				"fixed_version":     vuln.FixedVersion,
			},
		}
		if vuln.CVSS != nil {
			result.Properties["cvss_score"] = vuln.CVSS.Score
		}
		sarif.Runs[0].Results = append(sarif.Runs[0].Results, result)
	}

	for _, vuln := range report.ScanResult.AppVulnerabilities {
		level := r.vulnSeverityToSARIFLevel(vuln.Severity)
		result := SARIFResult{
			RuleID: vuln.VulnerabilityID,
			Level:  level,
			Message: SARIFMessage{
				Text: fmt.Sprintf("[%s] %s\nPackage: %s %s (%s)\nFixed Version: %s\nDescription: %s",
					vuln.Severity, vuln.Title, vuln.PackageName, vuln.InstalledVersion,
					vuln.Ecosystem, vuln.FixedVersion, vuln.Description),
			},
			Properties: map[string]interface{}{
				"package":           vuln.PackageName,
				"ecosystem":         vuln.Ecosystem,
				"installed_version": vuln.InstalledVersion,
				"fixed_version":     vuln.FixedVersion,
				"file_path":         vuln.FilePath,
			},
		}
		sarif.Runs[0].Results = append(sarif.Runs[0].Results, result)
	}

	for _, issue := range report.ConfigIssues {
		level := r.configSeverityToSARIFLevel(issue.Severity)
		result := SARIFResult{
			RuleID: issue.RuleID,
			Level:  level,
			Message: SARIFMessage{
				Text: fmt.Sprintf("[%s] %s\nCategory: %s\nDescription: %s\nEvidence: %s\nRemediation: %s",
					issue.Severity, issue.Title, issue.Category, issue.Description,
					issue.Evidence, issue.Remediation),
			},
			Properties: map[string]interface{}{
				"category":   issue.Category,
				"evidence":   issue.Evidence,
				"severity":   issue.Severity,
			},
		}
		sarif.Runs[0].Results = append(sarif.Runs[0].Results, result)
	}

	data, err := json.MarshalIndent(sarif, "", "  ")
	if err != nil {
		return "", err
	}
	return string(data), nil
}

func (r *Reporter) GenerateTable(report *PerformanceReport) (string, error) {
	var output strings.Builder

	output.WriteString("==================================================\n")
	output.WriteString("         性能分析报告\n")
	output.WriteString(fmt.Sprintf("生成时间: %s\n", report.GeneratedAt.Format("2006-01-02 15:04:05")))
	output.WriteString("==================================================\n\n")

	if report.AnalysisResult != nil {
		output.WriteString("【系统概览】\n")
		output.WriteString(fmt.Sprintf("  整体健康状态: %s\n", report.AnalysisResult.Summary.OverallHealth))
		output.WriteString(fmt.Sprintf("  主要问题: %s\n\n", report.AnalysisResult.Summary.MainIssues))

		output.WriteString("【CPU分析】\n")
		cpuTable := tablewriter.NewWriter(&output)
		cpuTable.SetHeader([]string{"指标", "值"})
		cpuTable.Append([]string{"平均使用率", fmt.Sprintf("%.2f%%", report.AnalysisResult.CPUAnalysis.AverageUsage)})
		cpuTable.Append([]string{"峰值使用率", fmt.Sprintf("%.2f%%", report.AnalysisResult.CPUAnalysis.PeakUsage)})
		cpuTable.Append([]string{"最低使用率", fmt.Sprintf("%.2f%%", report.AnalysisResult.CPUAnalysis.MinUsage)})
		cpuTable.Append([]string{"标准差", fmt.Sprintf("%.2f%%", report.AnalysisResult.CPUAnalysis.StdDev)})
		cpuTable.Append([]string{"高负载时段", fmt.Sprintf("%d 个", len(report.AnalysisResult.CPUAnalysis.HighUsagePeriods))})
		cpuTable.Append([]string{"是否CPU受限", fmt.Sprintf("%v", report.AnalysisResult.CPUAnalysis.IsCPUConstrained)})
		cpuTable.Render()
		output.WriteString("\n")

		output.WriteString("【内存分析】\n")
		memTable := tablewriter.NewWriter(&output)
		memTable.SetHeader([]string{"指标", "值"})
		memTable.Append([]string{"平均使用率", fmt.Sprintf("%.2f%%", report.AnalysisResult.MemoryAnalysis.AverageUsagePercent)})
		memTable.Append([]string{"峰值使用率", fmt.Sprintf("%.2f%%", report.AnalysisResult.MemoryAnalysis.PeakUsagePercent)})
		memTable.Append([]string{"使用趋势", report.AnalysisResult.MemoryAnalysis.UsageTrend})
		memTable.Append([]string{"是否内存受限", fmt.Sprintf("%v", report.AnalysisResult.MemoryAnalysis.IsMemoryConstrained)})
		memTable.Append([]string{"是否使用Swap", fmt.Sprintf("%v", report.AnalysisResult.MemoryAnalysis.SwapUsage.IsSwapping)})
		memTable.Append([]string{"Swap峰值使用率", fmt.Sprintf("%.2f%%", report.AnalysisResult.MemoryAnalysis.SwapUsage.PeakUsedPercent)})
		memTable.Append([]string{"可能内存泄漏", fmt.Sprintf("%v", report.AnalysisResult.MemoryAnalysis.PossibleLeak)})
		memTable.Render()
		output.WriteString("\n")

		if report.AnalysisResult.ProcessAnalysis != nil {
			output.WriteString("【进程分析】\n")
			procTable := tablewriter.NewWriter(&output)
			procTable.SetHeader([]string{"指标", "值"})
			procTable.Append([]string{"平均CPU使用率", fmt.Sprintf("%.2f%%", report.AnalysisResult.ProcessAnalysis.AverageCPUPercent)})
			procTable.Append([]string{"峰值CPU使用率", fmt.Sprintf("%.2f%%", report.AnalysisResult.ProcessAnalysis.PeakCPUPercent)})
			procTable.Append([]string{"平均内存RSS", formatBytes(report.AnalysisResult.ProcessAnalysis.AverageMemoryRSS)})
			procTable.Append([]string{"峰值内存RSS", formatBytes(report.AnalysisResult.ProcessAnalysis.PeakMemoryRSS)})
			procTable.Append([]string{"内存增长率", fmt.Sprintf("%.2f%%", report.AnalysisResult.ProcessAnalysis.MemoryGrowthRate)})
			procTable.Append([]string{"最大线程数", fmt.Sprintf("%d", report.AnalysisResult.ProcessAnalysis.MaxThreadCount)})
			procTable.Append([]string{"最大打开文件数", fmt.Sprintf("%d", report.AnalysisResult.ProcessAnalysis.MaxOpenFiles)})
			procTable.Render()
			output.WriteString("\n")
		}
	}

	if len(report.Bottlenecks) > 0 {
		output.WriteString("【性能瓶颈】\n")
		bnTable := tablewriter.NewWriter(&output)
		bnTable.SetHeader([]string{"#", "类型", "严重程度", "描述", "当前值", "阈值"})
		for i, bn := range report.Bottlenecks {
			bnTable.Append([]string{
				fmt.Sprintf("%d", i+1),
				string(bn.Type),
				string(bn.Severity),
				bn.Description,
				fmt.Sprintf("%.2f %s", bn.Metrics.CurrentValue, bn.Metrics.Unit),
				fmt.Sprintf("%.2f", bn.Metrics.Threshold),
			})
		}
		bnTable.Render()
		output.WriteString("\n")
	}

	if len(report.Suggestions) > 0 {
		output.WriteString("【优化建议】\n")
		for i, s := range report.Suggestions {
			output.WriteString(fmt.Sprintf("\n建议 %d: [%s] %s\n", i+1, s.Severity, s.Title))
			output.WriteString(fmt.Sprintf("  描述: %s\n", s.Description))
			output.WriteString(fmt.Sprintf("  预期影响: %s\n", s.ExpectedImpact))
			output.WriteString("  步骤:\n")
			for _, step := range s.Steps {
				output.WriteString(fmt.Sprintf("    %d. %s - %s\n", step.Order, step.Action, step.Details))
			}
			if len(s.CodeExamples) > 0 {
				output.WriteString("  代码示例:\n")
				for _, ex := range s.CodeExamples {
					output.WriteString(fmt.Sprintf("    [%s] %s\n", ex.Language, ex.Title))
					output.WriteString(fmt.Sprintf("      修复前:\n%s\n", indentString(ex.Before, "        ")))
					output.WriteString(fmt.Sprintf("      修复后:\n%s\n", indentString(ex.After, "        ")))
					output.WriteString(fmt.Sprintf("      说明: %s\n", ex.Explanation))
				}
			}
		}
		output.WriteString("\n")
	}

	if report.FlamegraphResult != nil && len(report.FlamegraphResult.HotFunctions) > 0 {
		output.WriteString("【热点函数】\n")
		hotTable := tablewriter.NewWriter(&output)
		hotTable.SetHeader([]string{"函数名", "自身时间", "总时间", "自身占比", "总占比", "调用次数"})
		for _, hf := range report.FlamegraphResult.HotFunctions {
			hotTable.Append([]string{
				hf.Name,
				fmt.Sprintf("%.2f", hf.SelfTime),
				fmt.Sprintf("%.2f", hf.TotalTime),
				fmt.Sprintf("%.2f%%", hf.SelfPercent),
				fmt.Sprintf("%.2f%%", hf.TotalPercent),
				fmt.Sprintf("%d", hf.CallCount),
			})
		}
		hotTable.Render()
	}

	return output.String(), nil
}

func (r *Reporter) GenerateSecurityTable(report *SecurityReport) (string, error) {
	var output strings.Builder

	output.WriteString("==================================================\n")
	output.WriteString("         容器安全扫描报告\n")
	output.WriteString(fmt.Sprintf("镜像: %s\n", report.ImageName))
	output.WriteString(fmt.Sprintf("生成时间: %s\n", report.GeneratedAt.Format("2006-01-02 15:04:05")))
	output.WriteString("==================================================\n\n")

	if report.ScanResult != nil && report.ScanResult.OSInfo != nil {
		output.WriteString("【操作系统信息】\n")
		osTable := tablewriter.NewWriter(&output)
		osTable.SetHeader([]string{"属性", "值"})
		osTable.Append([]string{"名称", report.ScanResult.OSInfo.Name})
		osTable.Append([]string{"版本", report.ScanResult.OSInfo.Version})
		osTable.Append([]string{"ID", report.ScanResult.OSInfo.ID})
		if report.ScanResult.OSInfo.IDLike != "" {
			osTable.Append([]string{"类似系统", report.ScanResult.OSInfo.IDLike})
		}
		osTable.Render()
		output.WriteString("\n")
	}

	criticalCount := 0
	highCount := 0
	mediumCount := 0
	lowCount := 0

	if report.ScanResult != nil {
		for _, v := range report.ScanResult.OSVulnerabilities {
			switch v.Severity {
			case scanner.SeverityCritical:
				criticalCount++
			case scanner.SeverityHigh:
				highCount++
			case scanner.SeverityMedium:
				mediumCount++
			case scanner.SeverityLow:
				lowCount++
			}
		}
		for _, v := range report.ScanResult.AppVulnerabilities {
			switch v.Severity {
			case scanner.SeverityCritical:
				criticalCount++
			case scanner.SeverityHigh:
				highCount++
			case scanner.SeverityMedium:
				mediumCount++
			case scanner.SeverityLow:
				lowCount++
			}
		}
	}

	output.WriteString("【漏洞统计】\n")
	statTable := tablewriter.NewWriter(&output)
	statTable.SetHeader([]string{"严重程度", "数量"})
	statTable.Append([]string{string(scanner.SeverityCritical), fmt.Sprintf("%d", criticalCount)})
	statTable.Append([]string{string(scanner.SeverityHigh), fmt.Sprintf("%d", highCount)})
	statTable.Append([]string{string(scanner.SeverityMedium), fmt.Sprintf("%d", mediumCount)})
	statTable.Append([]string{string(scanner.SeverityLow), fmt.Sprintf("%d", lowCount)})
	statTable.Render()
	output.WriteString("\n")

	if report.ScanResult != nil && len(report.ScanResult.OSVulnerabilities) > 0 {
		output.WriteString("【操作系统包漏洞】\n")
		sort.Slice(report.ScanResult.OSVulnerabilities, func(i, j int) bool {
			return severityRank(report.ScanResult.OSVulnerabilities[i].Severity) <
				severityRank(report.ScanResult.OSVulnerabilities[j].Severity)
		})

		osVulnTable := tablewriter.NewWriter(&output)
		osVulnTable.SetHeader([]string{"#", "CVE", "严重程度", "包名", "当前版本", "修复版本", "标题"})
		for i, v := range report.ScanResult.OSVulnerabilities {
			osVulnTable.Append([]string{
				fmt.Sprintf("%d", i+1),
				v.VulnerabilityID,
				string(v.Severity),
				v.PackageName,
				v.InstalledVersion,
				v.FixedVersion,
				truncate(v.Title, 30),
			})
		}
		osVulnTable.Render()
		output.WriteString("\n")
	}

	if report.ScanResult != nil && len(report.ScanResult.AppVulnerabilities) > 0 {
		output.WriteString("【应用依赖漏洞】\n")
		sort.Slice(report.ScanResult.AppVulnerabilities, func(i, j int) bool {
			return severityRank(report.ScanResult.AppVulnerabilities[i].Severity) <
				severityRank(report.ScanResult.AppVulnerabilities[j].Severity)
		})

		appVulnTable := tablewriter.NewWriter(&output)
		appVulnTable.SetHeader([]string{"#", "CVE", "严重程度", "生态", "包名", "当前版本", "修复版本"})
		for i, v := range report.ScanResult.AppVulnerabilities {
			appVulnTable.Append([]string{
				fmt.Sprintf("%d", i+1),
				v.VulnerabilityID,
				string(v.Severity),
				v.Ecosystem,
				truncate(v.PackageName, 20),
				v.InstalledVersion,
				v.FixedVersion,
			})
		}
		appVulnTable.Render()
		output.WriteString("\n")
	}

	if len(report.ConfigIssues) > 0 {
		output.WriteString("【配置安全问题】\n")
		sort.Slice(report.ConfigIssues, func(i, j int) bool {
			return configSeverityRank(report.ConfigIssues[i].Severity) <
				configSeverityRank(report.ConfigIssues[j].Severity)
		})

		configTable := tablewriter.NewWriter(&output)
		configTable.SetHeader([]string{"#", "规则ID", "严重程度", "类别", "标题"})
		for i, issue := range report.ConfigIssues {
			configTable.Append([]string{
				fmt.Sprintf("%d", i+1),
				issue.RuleID,
				string(issue.Severity),
				issue.Category,
				truncate(issue.Title, 40),
			})
		}
		configTable.Render()
		output.WriteString("\n")

		for i, issue := range report.ConfigIssues {
			if i >= 3 {
				break
			}
			output.WriteString(fmt.Sprintf("\n配置问题详情 #%d:\n", i+1))
			output.WriteString(fmt.Sprintf("  标题: %s\n", issue.Title))
			output.WriteString(fmt.Sprintf("  描述: %s\n", issue.Description))
			output.WriteString(fmt.Sprintf("  证据: %s\n", issue.Evidence))
			output.WriteString(fmt.Sprintf("  修复建议: %s\n", issue.Remediation))
		}
	}

	if len(report.LLMExplanations) > 0 {
		output.WriteString("\n【LLM漏洞分析】\n")
		for i, exp := range report.LLMExplanations {
			if i >= 2 {
				break
			}
			output.WriteString(fmt.Sprintf("\n分析 #%d: %s (%s)\n", i+1, exp.Title, exp.RiskLevel))
			output.WriteString(fmt.Sprintf("  风险描述: %s\n", exp.RiskDescription))
			output.WriteString(fmt.Sprintf("  影响: %s\n", exp.Impact))
			output.WriteString("  修复步骤:\n")
			for j, step := range exp.FixSteps {
				output.WriteString(fmt.Sprintf("    %d. %s\n", j+1, step))
			}
		}
	}

	return output.String(), nil
}

func (r *Reporter) SaveToFile(content, filePath string) error {
	return os.WriteFile(filePath, []byte(content), 0644)
}

func (r *Reporter) severityToSARIFLevel(severity bottleneck.Severity) string {
	switch severity {
	case bottleneck.SeverityCritical:
		return "error"
	case bottleneck.SeverityHigh:
		return "error"
	case bottleneck.SeverityMedium:
		return "warning"
	case bottleneck.SeverityLow:
		return "note"
	default:
		return "warning"
	}
}

func (r *Reporter) vulnSeverityToSARIFLevel(severity scanner.VulnerabilitySeverity) string {
	switch severity {
	case scanner.SeverityCritical:
		return "error"
	case scanner.SeverityHigh:
		return "error"
	case scanner.SeverityMedium:
		return "warning"
	case scanner.SeverityLow:
		return "note"
	default:
		return "warning"
	}
}

func (r *Reporter) configSeverityToSARIFLevel(severity configcheck.IssueSeverity) string {
	switch severity {
	case configcheck.SeverityCritical:
		return "error"
	case configcheck.SeverityHigh:
		return "error"
	case configcheck.SeverityMedium:
		return "warning"
	case configcheck.SeverityLow:
		return "note"
	case configcheck.SeverityInfo:
		return "note"
	default:
		return "warning"
	}
}

func severityRank(severity scanner.VulnerabilitySeverity) int {
	rank := map[scanner.VulnerabilitySeverity]int{
		scanner.SeverityCritical:   0,
		scanner.SeverityHigh:       1,
		scanner.SeverityMedium:     2,
		scanner.SeverityLow:        3,
		scanner.SeverityNegligible: 4,
		scanner.SeverityUnknown:    5,
	}
	return rank[severity]
}

func configSeverityRank(severity configcheck.IssueSeverity) int {
	rank := map[configcheck.IssueSeverity]int{
		configcheck.SeverityCritical: 0,
		configcheck.SeverityHigh:     1,
		configcheck.SeverityMedium:   2,
		configcheck.SeverityLow:      3,
		configcheck.SeverityInfo:     4,
	}
	return rank[severity]
}

func formatBytes(bytes uint64) string {
	const unit = 1024
	if bytes < unit {
		return fmt.Sprintf("%d B", bytes)
	}
	div, exp := uint64(unit), 0
	for n := bytes / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %cB", float64(bytes)/float64(div), "KMGTPE"[exp])
}

func truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen-3] + "..."
}

func indentString(s, indent string) string {
	lines := strings.Split(s, "\n")
	for i, line := range lines {
		lines[i] = indent + line
	}
	return strings.Join(lines, "\n")
}
