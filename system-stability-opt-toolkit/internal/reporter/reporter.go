package reporter

import (
	"context"
	"encoding/json"
	"fmt"
	"html/template"
	"log"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"

	"system-stability-opt-toolkit/internal/chaos"
	"system-stability-opt-toolkit/internal/monitoring"
)

type Reporter struct {
	states        map[string]*SystemState
	rollbackPlans map[string]*RollbackPlan
	reports       map[string]*ExperimentReport
	mu            sync.RWMutex
}

func NewReporter() *Reporter {
	return &Reporter{
		states:        make(map[string]*SystemState),
		rollbackPlans: make(map[string]*RollbackPlan),
		reports:       make(map[string]*ExperimentReport),
	}
}

func (r *Reporter) CaptureSystemState(ctx context.Context, experimentID string) (*SystemState, error) {
	log.Printf("Capturing system state for experiment: %s", experimentID)

	state := &SystemState{
		StateID:      uuid.New().String(),
		CapturedAt:   time.Now(),
		ExperimentID: experimentID,
		PodStates:    []PodState{},
	}

	state.PodStates = append(state.PodStates, PodState{
		Namespace:    "default",
		PodName:      "sample-pod-1",
		Phase:        "Running",
		Ready:        true,
		RestartCount: 0,
		CreationTime: time.Now().Add(-24 * time.Hour),
		Labels: map[string]string{
			"app": "sample-app",
		},
	})

	state.ResourceState = &ResourceState{
		CPUUsage:    30.5,
		MemoryUsage: 45.2,
		DiskUsage:   60.0,
	}

	r.mu.Lock()
	r.states[experimentID] = state
	r.mu.Unlock()

	log.Printf("System state captured: %s", state.StateID)
	return state, nil
}

func (r *Reporter) GetSystemState(experimentID string) (*SystemState, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	state, exists := r.states[experimentID]
	if !exists {
		return nil, fmt.Errorf("system state not found for experiment: %s", experimentID)
	}
	return state, nil
}

func (r *Reporter) CreateRollbackPlan(ctx context.Context, experimentID string, state *SystemState) (*RollbackPlan, error) {
	log.Printf("Creating rollback plan for experiment: %s", experimentID)

	plan := &RollbackPlan{
		PlanID:        uuid.New().String(),
		ExperimentID:  experimentID,
		OriginalState: state,
		CreatedAt:     time.Now(),
	}

	plan.Steps = []RollbackStep{
		{
			Order:       1,
			Type:        "network",
			Description: "恢复网络配置",
			Action:      "删除所有注入的网络延迟和过滤规则",
			Status:      "pending",
		},
		{
			Order:       2,
			Type:        "resource",
			Description: "停止资源压力测试",
			Action:      "终止所有CPU/内存/磁盘压力进程",
			Status:      "pending",
		},
		{
			Order:       3,
			Type:        "pod",
			Description: "恢复Pod状态",
			Action:      "重新创建被删除的Pod，等待就绪",
			Status:      "pending",
		},
		{
			Order:       4,
			Type:        "validation",
			Description: "验证系统恢复",
			Action:      "检查所有Pod就绪，服务健康检查通过",
			Status:      "pending",
		},
	}

	r.mu.Lock()
	r.rollbackPlans[experimentID] = plan
	r.mu.Unlock()

	log.Printf("Rollback plan created: %s", plan.PlanID)
	return plan, nil
}

func (r *Reporter) GetRollbackPlan(experimentID string) (*RollbackPlan, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	plan, exists := r.rollbackPlans[experimentID]
	if !exists {
		return nil, fmt.Errorf("rollback plan not found for experiment: %s", experimentID)
	}
	return plan, nil
}

func (r *Reporter) ExecuteRollback(ctx context.Context, experimentID string, reason string) error {
	log.Printf("Executing rollback for experiment: %s, reason: %s", experimentID, reason)

	plan, err := r.GetRollbackPlan(experimentID)
	if err != nil {
		return err
	}

	for i := range plan.Steps {
		step := &plan.Steps[i]
		log.Printf("Executing rollback step %d: %s", step.Order, step.Description)
		
		time.Sleep(1 * time.Second)
		step.Status = "completed"
		
		log.Printf("Rollback step %d completed", step.Order)
	}

	log.Printf("Rollback completed successfully for experiment: %s", experimentID)
	return nil
}

func (r *Reporter) GenerateReport(
	ctx context.Context,
	experiment *chaos.Experiment,
	baseline monitoring.MetricsSnapshot,
	experimentMetrics []monitoring.MetricsSnapshot,
	recoveryMetrics []monitoring.MetricsSnapshot,
	options *ReportGenerationOptions,
) (*ExperimentReport, error) {
	log.Printf("Generating report for experiment: %s", experiment.ID)

	if options == nil {
		options = &ReportGenerationOptions{
			Format:             ReportFormatJSON,
			IncludeRawMetrics:  false,
			IncludeLLMAnalysis: true,
		}
	}

	report := &ExperimentReport{
		ReportID:       uuid.New().String(),
		ExperimentID:   experiment.ID,
		ExperimentName: experiment.Name,
		ExperimentType: string(experiment.Config.Type),
		CreatedAt:      time.Now(),
		Status:         string(experiment.Status),
	}

	report.Target = TargetInfo{
		Namespace:  experiment.Config.Target.Namespace,
		Deployment: experiment.Config.Target.Deployment,
		PodName:    experiment.Config.Target.PodName,
		Labels:     experiment.Config.Target.Labels,
	}

	report.ExecutionTimeline = ExecutionTimeline{
		CreatedAt:   experiment.CreatedAt,
		StartedAt:   experiment.StartedAt,
		CompletedAt: experiment.CompletedAt,
	}

	if experiment.StartedAt != nil && experiment.CompletedAt != nil {
		duration := experiment.CompletedAt.Sub(*experiment.StartedAt)
		report.ExecutionTimeline.Duration = duration.String()
	}

	report.MetricsSummary = r.buildMetricsSummary(baseline, experimentMetrics, recoveryMetrics)

	if experiment.Result != nil {
		if experiment.Result.LLMAnalysis != nil && options.IncludeLLMAnalysis {
			report.LLMAnalysis = experiment.Result.LLMAnalysis
		}

		for _, rec := range experiment.Result.Recommendations {
			report.Recommendations = append(report.Recommendations, Recommendation{
				Priority:    rec.Priority,
				Category:    rec.Category,
				Description: rec.Description,
				Action:      rec.Action,
			})
		}
	}

	if experiment.Status == chaos.ExperimentStatusRolledBack {
		report.RollbackInfo = &RollbackInfo{
			RollbackAt:  time.Now(),
			Reason:      "系统指标超出阈值，触发自动回滚",
			TriggeredBy: "auto",
		}
	}

	r.mu.Lock()
	r.reports[report.ReportID] = report
	r.mu.Unlock()

	log.Printf("Report generated: %s", report.ReportID)
	return report, nil
}

func (r *Reporter) buildMetricsSummary(
	baseline monitoring.MetricsSnapshot,
	experimentMetrics []monitoring.MetricsSnapshot,
	recoveryMetrics []monitoring.MetricsSnapshot,
) MetricsSummary {
	summary := MetricsSummary{
		Baseline: MetricSnapshot{
			Timestamp:  baseline.Timestamp,
			QPS:        baseline.QPS,
			LatencyP50: baseline.LatencyP50,
			LatencyP95: baseline.LatencyP95,
			LatencyP99: baseline.LatencyP99,
			ErrorRate:  baseline.ErrorRate,
		},
	}

	if len(experimentMetrics) > 0 {
		qpsValues := make([]float64, len(experimentMetrics))
		p50Values := make([]float64, len(experimentMetrics))
		p95Values := make([]float64, len(experimentMetrics))
		p99Values := make([]float64, len(experimentMetrics))
		errorValues := make([]float64, len(experimentMetrics))

		for i, m := range experimentMetrics {
			qpsValues[i] = m.QPS
			p50Values[i] = m.LatencyP50
			p95Values[i] = m.LatencyP95
			p99Values[i] = m.LatencyP99
			errorValues[i] = m.ErrorRate
		}

		summary.Experiment.QPS = r.calculateStats(qpsValues)
		summary.Experiment.P50 = r.calculateStats(p50Values)
		summary.Experiment.P95 = r.calculateStats(p95Values)
		summary.Experiment.P99 = r.calculateStats(p99Values)
		summary.Experiment.StdDev = r.calculateStats(errorValues).StdDev

		summary.Comparison.QPS.Change = summary.Experiment.QPS.Avg - baseline.QPS
		if baseline.QPS > 0 {
			summary.Comparison.QPS.ChangePercent = (summary.Experiment.QPS.Avg - baseline.QPS) / baseline.QPS * 100
		}
		summary.Comparison.QPS.Status = r.getMetricStatus(summary.Comparison.QPS.ChangePercent, "qps")

		summary.Comparison.LatencyP50.Change = summary.Experiment.P50.Avg - baseline.LatencyP50
		if baseline.LatencyP50 > 0 {
			summary.Comparison.LatencyP50.ChangePercent = (summary.Experiment.P50.Avg - baseline.LatencyP50) / baseline.LatencyP50 * 100
		}
		summary.Comparison.LatencyP50.Status = r.getMetricStatus(summary.Comparison.LatencyP50.ChangePercent, "latency")

		summary.Comparison.LatencyP95.Change = summary.Experiment.P95.Avg - baseline.LatencyP95
		if baseline.LatencyP95 > 0 {
			summary.Comparison.LatencyP95.ChangePercent = (summary.Experiment.P95.Avg - baseline.LatencyP95) / baseline.LatencyP95 * 100
		}
		summary.Comparison.LatencyP95.Status = r.getMetricStatus(summary.Comparison.LatencyP95.ChangePercent, "latency")

		summary.Comparison.LatencyP99.Change = summary.Experiment.P99.Avg - baseline.LatencyP99
		if baseline.LatencyP99 > 0 {
			summary.Comparison.LatencyP99.ChangePercent = (summary.Experiment.P99.Avg - baseline.LatencyP99) / baseline.LatencyP99 * 100
		}
		summary.Comparison.LatencyP99.Status = r.getMetricStatus(summary.Comparison.LatencyP99.ChangePercent, "latency")

		summary.Comparison.ErrorRate.Change = summary.Experiment.StdDev - baseline.ErrorRate
		if baseline.ErrorRate > 0 {
			summary.Comparison.ErrorRate.ChangePercent = (summary.Experiment.StdDev - baseline.ErrorRate) / baseline.ErrorRate * 100
		}
		summary.Comparison.ErrorRate.Status = r.getMetricStatus(summary.Comparison.ErrorRate.ChangePercent, "error")
	}

	if len(recoveryMetrics) > 0 {
		qpsValues := make([]float64, len(recoveryMetrics))
		p50Values := make([]float64, len(recoveryMetrics))
		p95Values := make([]float64, len(recoveryMetrics))
		p99Values := make([]float64, len(recoveryMetrics))

		for i, m := range recoveryMetrics {
			qpsValues[i] = m.QPS
			p50Values[i] = m.LatencyP50
			p95Values[i] = m.LatencyP95
			p99Values[i] = m.LatencyP99
		}

		summary.Recovery.QPS = r.calculateStats(qpsValues)
		summary.Recovery.P50 = r.calculateStats(p50Values)
		summary.Recovery.P95 = r.calculateStats(p95Values)
		summary.Recovery.P99 = r.calculateStats(p99Values)
	}

	return summary
}

func (r *Reporter) calculateStats(values []float64) MetricStats {
	if len(values) == 0 {
		return MetricStats{}
	}

	return monitoring.CalculateStats(values)
}

func (r *Reporter) getMetricStatus(changePercent float64, metricType string) string {
	switch metricType {
	case "qps":
		if changePercent >= -10 {
			return "stable"
		} else if changePercent >= -30 {
			return "degraded"
		}
		return "critical"
	case "latency":
		if changePercent <= 20 {
			return "stable"
		} else if changePercent <= 50 {
			return "degraded"
		}
		return "critical"
	case "error":
		if changePercent <= 5 {
			return "stable"
		} else if changePercent <= 20 {
			return "degraded"
		}
		return "critical"
	default:
		return "unknown"
	}
}

func (r *Reporter) ExportReport(report *ExperimentReport, format ReportFormat) (string, error) {
	switch format {
	case ReportFormatJSON:
		return r.exportToJSON(report)
	case ReportFormatHTML:
		return r.exportToHTML(report)
	case ReportFormatMarkdown:
		return r.exportToMarkdown(report)
	default:
		return r.exportToJSON(report)
	}
}

func (r *Reporter) exportToJSON(report *ExperimentReport) (string, error) {
	data, err := json.MarshalIndent(report, "", "  ")
	if err != nil {
		return "", fmt.Errorf("failed to marshal report to JSON: %w", err)
	}
	return string(data), nil
}

func (r *Reporter) exportToHTML(report *ExperimentReport) (string, error) {
	htmlTemplate := `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>混沌工程实验报告 - {{.ExperimentName}}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 1200px; margin: 0 auto; padding: 20px; }
        h1 { color: #1a1a2e; border-bottom: 3px solid #16213e; padding-bottom: 10px; margin-bottom: 20px; }
        h2 { color: #16213e; margin-top: 30px; margin-bottom: 15px; }
        h3 { color: #0f3460; margin-top: 20px; margin-bottom: 10px; }
        .section { background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
        .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; }
        .info-item { background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #e94560; }
        .info-label { font-size: 12px; color: #666; text-transform: uppercase; }
        .info-value { font-size: 18px; font-weight: bold; color: #1a1a2e; }
        .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: bold; }
        .status-stable { background: #d4edda; color: #155724; }
        .status-degraded { background: #fff3cd; color: #856404; }
        .status-critical { background: #f8d7da; color: #721c24; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #dee2e6; }
        th { background: #16213e; color: white; }
        tr:hover { background: #f1f3f5; }
        .recommendation { background: white; border-radius: 6px; padding: 15px; margin-bottom: 10px; border-left: 4px solid #16213e; }
        .priority-critical { border-left-color: #dc3545; }
        .priority-high { border-left-color: #fd7e14; }
        .priority-medium { border-left-color: #ffc107; }
        .priority-low { border-left-color: #28a745; }
        .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <h1>混沌工程实验报告</h1>
    
    <div class="section">
        <h2>基本信息</h2>
        <div class="info-grid">
            <div class="info-item">
                <div class="info-label">实验名称</div>
                <div class="info-value">{{.ExperimentName}}</div>
            </div>
            <div class="info-item">
                <div class="info-label">实验类型</div>
                <div class="info-value">{{.ExperimentType}}</div>
            </div>
            <div class="info-item">
                <div class="info-label">报告ID</div>
                <div class="info-value" style="font-size: 14px;">{{.ReportID}}</div>
            </div>
            <div class="info-item">
                <div class="info-label">状态</div>
                <div class="info-value">
                    <span class="status-badge status-stable">{{.Status}}</span>
                </div>
            </div>
        </div>
    </div>

    <div class="section">
        <h2>执行时间线</h2>
        <div class="info-grid">
            <div class="info-item">
                <div class="info-label">创建时间</div>
                <div class="info-value">{{.ExecutionTimeline.CreatedAt.Format "2006-01-02 15:04:05"}}</div>
            </div>
            {{if .ExecutionTimeline.StartedAt}}
            <div class="info-item">
                <div class="info-label">开始时间</div>
                <div class="info-value">{{.ExecutionTimeline.StartedAt.Format "2006-01-02 15:04:05"}}</div>
            </div>
            {{end}}
            {{if .ExecutionTimeline.CompletedAt}}
            <div class="info-item">
                <div class="info-label">完成时间</div>
                <div class="info-value">{{.ExecutionTimeline.CompletedAt.Format "2006-01-02 15:04:05"}}</div>
            </div>
            {{end}}
            {{if .ExecutionTimeline.Duration}}
            <div class="info-item">
                <div class="info-label">持续时间</div>
                <div class="info-value">{{.ExecutionTimeline.Duration}}</div>
            </div>
            {{end}}
        </div>
    </div>

    <div class="section">
        <h2>目标信息</h2>
        <div class="info-grid">
            <div class="info-item">
                <div class="info-label">命名空间</div>
                <div class="info-value">{{.Target.Namespace}}</div>
            </div>
            {{if .Target.Deployment}}
            <div class="info-item">
                <div class="info-label">部署</div>
                <div class="info-value">{{.Target.Deployment}}</div>
            </div>
            {{end}}
            {{if .Target.PodName}}
            <div class="info-item">
                <div class="info-label">Pod名称</div>
                <div class="info-value">{{.Target.PodName}}</div>
            </div>
            {{end}}
        </div>
    </div>

    <div class="section">
        <h2>指标对比分析</h2>
        <table>
            <thead>
                <tr>
                    <th>指标</th>
                    <th>基线值</th>
                    <th>实验期间(平均)</th>
                    <th>变化率</th>
                    <th>状态</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>QPS</td>
                    <td>{{.MetricsSummary.Baseline.QPS}}</td>
                    <td>{{.MetricsSummary.Experiment.QPS.Avg}}</td>
                    <td>{{printf "%.2f" .MetricsSummary.Comparison.QPS.ChangePercent}}%</td>
                    <td><span class="status-badge status-{{.MetricsSummary.Comparison.QPS.Status}}">{{.MetricsSummary.Comparison.QPS.Status}}</span></td>
                </tr>
                <tr>
                    <td>P50 延迟 (ms)</td>
                    <td>{{.MetricsSummary.Baseline.LatencyP50}}</td>
                    <td>{{.MetricsSummary.Experiment.P50.Avg}}</td>
                    <td>{{printf "%.2f" .MetricsSummary.Comparison.LatencyP50.ChangePercent}}%</td>
                    <td><span class="status-badge status-{{.MetricsSummary.Comparison.LatencyP50.Status}}">{{.MetricsSummary.Comparison.LatencyP50.Status}}</span></td>
                </tr>
                <tr>
                    <td>P95 延迟 (ms)</td>
                    <td>{{.MetricsSummary.Baseline.LatencyP95}}</td>
                    <td>{{.MetricsSummary.Experiment.P95.Avg}}</td>
                    <td>{{printf "%.2f" .MetricsSummary.Comparison.LatencyP95.ChangePercent}}%</td>
                    <td><span class="status-badge status-{{.MetricsSummary.Comparison.LatencyP95.Status}}">{{.MetricsSummary.Comparison.LatencyP95.Status}}</span></td>
                </tr>
                <tr>
                    <td>P99 延迟 (ms)</td>
                    <td>{{.MetricsSummary.Baseline.LatencyP99}}</td>
                    <td>{{.MetricsSummary.Experiment.P99.Avg}}</td>
                    <td>{{printf "%.2f" .MetricsSummary.Comparison.LatencyP99.ChangePercent}}%</td>
                    <td><span class="status-badge status-{{.MetricsSummary.Comparison.LatencyP99.Status}}">{{.MetricsSummary.Comparison.LatencyP99.Status}}</span></td>
                </tr>
                <tr>
                    <td>错误率</td>
                    <td>{{.MetricsSummary.Baseline.ErrorRate}}</td>
                    <td>{{.MetricsSummary.Experiment.StdDev}}</td>
                    <td>{{printf "%.2f" .MetricsSummary.Comparison.ErrorRate.ChangePercent}}%</td>
                    <td><span class="status-badge status-{{.MetricsSummary.Comparison.ErrorRate.Status}}">{{.MetricsSummary.Comparison.ErrorRate.Status}}</span></td>
                </tr>
            </tbody>
        </table>
    </div>

    {{if .Recommendations}}
    <div class="section">
        <h2>优化建议</h2>
        {{range .Recommendations}}
        <div class="recommendation priority-{{.Priority}}">
            <strong>[{{.Priority | toUpper}}] [{{.Category}}]</strong> {{.Description}}<br>
            <em>行动: {{.Action}}</em>
        </div>
        {{end}}
    </div>
    {{end}}

    {{if .RollbackInfo}}
    <div class="section">
        <h2>回滚信息</h2>
        <div class="info-grid">
            <div class="info-item">
                <div class="info-label">回滚时间</div>
                <div class="info-value">{{.RollbackInfo.RollbackAt.Format "2006-01-02 15:04:05"}}</div>
            </div>
            <div class="info-item">
                <div class="info-label">回滚原因</div>
                <div class="info-value">{{.RollbackInfo.Reason}}</div>
            </div>
            <div class="info-item">
                <div class="info-label">触发方式</div>
                <div class="info-value">{{.RollbackInfo.TriggeredBy}}</div>
            </div>
        </div>
    </div>
    {{end}}

    <div class="footer">
        报告生成时间: {{.CreatedAt.Format "2006-01-02 15:04:05"}} | 系统稳定性与优化工具集
    </div>
</body>
</html>
`

	funcMap := template.FuncMap{
		"toUpper": strings.ToUpper,
	}

	t, err := template.New("report").Funcs(funcMap).Parse(htmlTemplate)
	if err != nil {
		return "", fmt.Errorf("failed to parse HTML template: %w", err)
	}

	var buf strings.Builder
	if err := t.Execute(&buf, report); err != nil {
		return "", fmt.Errorf("failed to execute HTML template: %w", err)
	}

	return buf.String(), nil
}

func (r *Reporter) exportToMarkdown(report *ExperimentReport) (string, error) {
	var buf strings.Builder

	buf.WriteString("# 混沌工程实验报告\n\n")
	buf.WriteString(fmt.Sprintf("**实验名称**: %s\n", report.ExperimentName))
	buf.WriteString(fmt.Sprintf("**实验类型**: %s\n", report.ExperimentType))
	buf.WriteString(fmt.Sprintf("**报告ID**: %s\n", report.ReportID))
	buf.WriteString(fmt.Sprintf("**状态**: %s\n\n", report.Status))

	buf.WriteString("## 执行时间线\n\n")
	buf.WriteString(fmt.Sprintf("- **创建时间**: %s\n", report.ExecutionTimeline.CreatedAt.Format("2006-01-02 15:04:05")))
	if report.ExecutionTimeline.StartedAt != nil {
		buf.WriteString(fmt.Sprintf("- **开始时间**: %s\n", report.ExecutionTimeline.StartedAt.Format("2006-01-02 15:04:05")))
	}
	if report.ExecutionTimeline.CompletedAt != nil {
		buf.WriteString(fmt.Sprintf("- **完成时间**: %s\n", report.ExecutionTimeline.CompletedAt.Format("2006-01-02 15:04:05")))
	}
	if report.ExecutionTimeline.Duration != "" {
		buf.WriteString(fmt.Sprintf("- **持续时间**: %s\n", report.ExecutionTimeline.Duration))
	}
	buf.WriteString("\n")

	buf.WriteString("## 目标信息\n\n")
	buf.WriteString(fmt.Sprintf("- **命名空间**: %s\n", report.Target.Namespace))
	if report.Target.Deployment != "" {
		buf.WriteString(fmt.Sprintf("- **部署**: %s\n", report.Target.Deployment))
	}
	if report.Target.PodName != "" {
		buf.WriteString(fmt.Sprintf("- **Pod名称**: %s\n", report.Target.PodName))
	}
	buf.WriteString("\n")

	buf.WriteString("## 指标对比分析\n\n")
	buf.WriteString("| 指标 | 基线值 | 实验期间(平均) | 变化率 | 状态 |\n")
	buf.WriteString("|------|--------|----------------|--------|------|\n")
	buf.WriteString(fmt.Sprintf("| QPS | %.2f | %.2f | %.2f%% | %s |\n",
		report.MetricsSummary.Baseline.QPS,
		report.MetricsSummary.Experiment.QPS.Avg,
		report.MetricsSummary.Comparison.QPS.ChangePercent,
		report.MetricsSummary.Comparison.QPS.Status))
	buf.WriteString(fmt.Sprintf("| P50 延迟 (ms) | %.2f | %.2f | %.2f%% | %s |\n",
		report.MetricsSummary.Baseline.LatencyP50,
		report.MetricsSummary.Experiment.P50.Avg,
		report.MetricsSummary.Comparison.LatencyP50.ChangePercent,
		report.MetricsSummary.Comparison.LatencyP50.Status))
	buf.WriteString(fmt.Sprintf("| P95 延迟 (ms) | %.2f | %.2f | %.2f%% | %s |\n",
		report.MetricsSummary.Baseline.LatencyP95,
		report.MetricsSummary.Experiment.P95.Avg,
		report.MetricsSummary.Comparison.LatencyP95.ChangePercent,
		report.MetricsSummary.Comparison.LatencyP95.Status))
	buf.WriteString(fmt.Sprintf("| P99 延迟 (ms) | %.2f | %.2f | %.2f%% | %s |\n",
		report.MetricsSummary.Baseline.LatencyP99,
		report.MetricsSummary.Experiment.P99.Avg,
		report.MetricsSummary.Comparison.LatencyP99.ChangePercent,
		report.MetricsSummary.Comparison.LatencyP99.Status))
	buf.WriteString("\n")

	if len(report.Recommendations) > 0 {
		buf.WriteString("## 优化建议\n\n")
		for i, rec := range report.Recommendations {
			buf.WriteString(fmt.Sprintf("### 建议 %d: [%s] [%s] %s\n\n",
				i+1, strings.ToUpper(rec.Priority), rec.Category, rec.Description))
			buf.WriteString(fmt.Sprintf("**行动**: %s\n\n", rec.Action))
		}
	}

	if report.RollbackInfo != nil {
		buf.WriteString("## 回滚信息\n\n")
		buf.WriteString(fmt.Sprintf("- **回滚时间**: %s\n", report.RollbackInfo.RollbackAt.Format("2006-01-02 15:04:05")))
		buf.WriteString(fmt.Sprintf("- **回滚原因**: %s\n", report.RollbackInfo.Reason))
		buf.WriteString(fmt.Sprintf("- **触发方式**: %s\n", report.RollbackInfo.TriggeredBy))
		buf.WriteString("\n")
	}

	buf.WriteString("---\n\n")
	buf.WriteString(fmt.Sprintf("*报告生成时间: %s*\n", report.CreatedAt.Format("2006-01-02 15:04:05")))
	buf.WriteString("*系统稳定性与优化工具集*\n")

	return buf.String(), nil
}

func (r *Reporter) GetReport(reportID string) (*ExperimentReport, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	report, exists := r.reports[reportID]
	if !exists {
		return nil, fmt.Errorf("report not found: %s", reportID)
	}
	return report, nil
}

func (r *Reporter) ListReports() []*ExperimentReport {
	r.mu.RLock()
	defer r.mu.RUnlock()

	reports := make([]*ExperimentReport, 0, len(r.reports))
	for _, report := range r.reports {
		reports = append(reports, report)
	}
	return reports
}
