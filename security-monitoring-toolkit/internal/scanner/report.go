package scanner

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"sort"
	"strings"
	"text/tabwriter"

	"github.com/security-monitoring-toolkit/internal/common"
)

type ReportGenerator struct {
	ruleMap map[string]*ScanRule
}

func NewReportGenerator(rules []*ScanRule) *ReportGenerator {
	ruleMap := make(map[string]*ScanRule)
	for _, r := range rules {
		ruleMap[r.Name] = r
	}
	return &ReportGenerator{ruleMap: ruleMap}
}

func (rg *ReportGenerator) GenerateJSON(report *common.ScanReport, outputPath string) error {
	return common.WriteJSON(outputPath, report)
}

func (rg *ReportGenerator) GenerateConsole(report *common.ScanReport, detailed bool) {
	duration := report.EndTime.Sub(report.StartTime)

	fmt.Println()
	fmt.Println("═══════════════════════════════════════════════════════════════")
	fmt.Println("  SECURITY SCAN REPORT")
	fmt.Println("═══════════════════════════════════════════════════════════════")
	fmt.Println()
	fmt.Printf("  Scan ID:    %s\n", report.ScanID)
	fmt.Printf("  Target:     %s\n", report.TargetPath)
	fmt.Printf("  Duration:   %s\n", common.FormatDuration(duration))
	fmt.Printf("  Files:      %d scanned / %d total\n", report.ScannedFiles, report.TotalFiles)
	fmt.Println()
	fmt.Println("  ─────────────────────────────────────────────────────────────")
	fmt.Println("  FINDINGS SUMMARY")
	fmt.Println("  ─────────────────────────────────────────────────────────────")
	fmt.Println()

	totalFindings := len(report.Findings)
	if totalFindings == 0 {
		fmt.Println("  ✅ No security issues found!")
		fmt.Println()
		return
	}

	severityOrder := []common.SeverityLevel{
		common.SeverityCritical,
		common.SeverityHigh,
		common.SeverityMedium,
		common.SeverityLow,
	}

	severityColors := map[common.SeverityLevel]string{
		common.SeverityCritical: "[CRITICAL]",
		common.SeverityHigh:     "[HIGH]",
		common.SeverityMedium:   "[MEDIUM]",
		common.SeverityLow:      "[LOW]",
	}

	for _, sev := range severityOrder {
		if count := report.SeverityCounts[sev]; count > 0 {
			fmt.Printf("  %s %s: %d\n", severityColors[sev], strings.ToUpper(string(sev)), count)
		}
	}

	fmt.Printf("\n  Total Issues: %d\n", totalFindings)

	if !detailed {
		fmt.Println()
		fmt.Println("  Use --detailed flag to see full details including remediation advice.")
		return
	}

	fmt.Println()
	fmt.Println("  ─────────────────────────────────────────────────────────────")
	fmt.Println("  DETAILED FINDINGS")
	fmt.Println("  ─────────────────────────────────────────────────────────────")
	fmt.Println()

	sortedFindings := make([]common.Finding, len(report.Findings))
	copy(sortedFindings, report.Findings)

	severityPriority := map[common.SeverityLevel]int{
		common.SeverityCritical: 0,
		common.SeverityHigh:     1,
		common.SeverityMedium:   2,
		common.SeverityLow:      3,
	}

	sort.Slice(sortedFindings, func(i, j int) bool {
		return severityPriority[sortedFindings[i].Severity] < severityPriority[sortedFindings[j].Severity]
	})

	for i, finding := range sortedFindings {
		rule := rg.ruleMap[finding.RuleName]

		fmt.Printf("  [%d/%d] %s %s\n", i+1, totalFindings, severityColors[finding.Severity], strings.ToUpper(string(finding.Severity)))
		fmt.Printf("       Description: %s\n", finding.Description)
		fmt.Printf("       File:        %s\n", finding.FilePath)
		fmt.Printf("       Line:        %d\n", finding.LineNumber)
		fmt.Printf("       Category:    %s\n", finding.Type)
		fmt.Printf("       Rule:        %s\n", finding.RuleName)
		fmt.Println()
		fmt.Println("       Code Context:")

		scanner := bufio.NewScanner(strings.NewReader(finding.Context))
		for scanner.Scan() {
			fmt.Printf("       %s\n", scanner.Text())
		}

		if rule != nil && rule.Remediation != "" {
			fmt.Println()
			fmt.Println("       💡 Remediation Advice:")
			fmt.Printf("       %s\n", rule.Remediation)
		}

		if i < len(sortedFindings)-1 {
			fmt.Println()
			fmt.Println("       ───────────────────────────────────────────────────")
			fmt.Println()
		}
	}

	fmt.Println()
	fmt.Println("═══════════════════════════════════════════════════════════════")
}

func (rg *ReportGenerator) GenerateCSV(report *common.ScanReport, outputPath string) error {
	file, err := os.Create(outputPath)
	if err != nil {
		return err
	}
	defer file.Close()

	writer := tabwriter.NewWriter(file, 0, 0, 2, ' ', 0)

	headers := []string{"Severity", "Description", "File", "Line", "Category", "Rule"}
	fmt.Fprintln(writer, strings.Join(headers, "\t"))

	for _, finding := range report.Findings {
		row := []string{
			string(finding.Severity),
			finding.Description,
			finding.FilePath,
			fmt.Sprintf("%d", finding.LineNumber),
			finding.Type,
			finding.RuleName,
		}
		fmt.Fprintln(writer, strings.Join(row, "\t"))
	}

	return writer.Flush()
}

func (rg *ReportGenerator) GenerateSummaryJSON(report *common.ScanReport) (string, error) {
	summary := map[string]interface{}{
		"scan_id":        report.ScanID,
		"target":         report.TargetPath,
		"duration_ms":    report.EndTime.Sub(report.StartTime).Milliseconds(),
		"files_scanned":  report.ScannedFiles,
		"total_files":    report.TotalFiles,
		"total_findings": len(report.Findings),
		"severity_counts": report.SeverityCounts,
		"has_critical":   report.SeverityCounts[common.SeverityCritical] > 0,
		"has_high":       report.SeverityCounts[common.SeverityHigh] > 0,
	}

	data, err := json.MarshalIndent(summary, "", "  ")
	if err != nil {
		return "", err
	}
	return string(data), nil
}
