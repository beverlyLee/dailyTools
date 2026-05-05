package llm

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	"system-stability-opt-toolkit/internal/monitoring"
)

type Client struct {
	config *Config
	client *http.Client
}

func NewClient(config *Config) *Client {
	if config.Timeout == 0 {
		config.Timeout = 60 * time.Second
	}
	if config.MaxTokens == 0 {
		config.MaxTokens = 4000
	}
	if config.Temperature == 0 {
		config.Temperature = 0.3
	}

	return &Client{
		config: config,
		client: &http.Client{
			Timeout: config.Timeout,
		},
	}
}

func (c *Client) AnalyzeExperimentResult(
	ctx context.Context,
	baseline monitoring.MetricsSnapshot,
	experimentMetrics []monitoring.MetricsSnapshot,
	recoveryMetrics []monitoring.MetricsSnapshot,
) (*ExperimentAnalysis, error) {
	log.Printf("Analyzing experiment results with LLM")

	comparison := c.buildMetricsComparison(baseline, experimentMetrics)

	prompt := c.buildExperimentAnalysisPrompt(baseline, experimentMetrics, recoveryMetrics, comparison)

	response, err := c.Chat(ctx, []Message{
		{
			Role:    "system",
			Content: getSystemPromptForExperimentAnalysis(),
		},
		{
			Role:    "user",
			Content: prompt,
		},
	})

	if err != nil {
		log.Printf("LLM chat failed: %v", err)
		return c.fallbackAnalysis(comparison), nil
	}

	analysis, err := c.parseExperimentAnalysis(response)
	if err != nil {
		log.Printf("Failed to parse LLM response: %v", err)
		return c.fallbackAnalysis(comparison), nil
	}

	return analysis, nil
}

func (c *Client) buildMetricsComparison(
	baseline monitoring.MetricsSnapshot,
	experimentMetrics []monitoring.MetricsSnapshot,
) *MetricsComparison {
	if len(experimentMetrics) == 0 {
		return &MetricsComparison{}
	}

	var avgExperimentQPS, avgExperimentP50, avgExperimentP95, avgExperimentP99, avgExperimentErrorRate float64
	for _, m := range experimentMetrics {
		avgExperimentQPS += m.QPS
		avgExperimentP50 += m.LatencyP50
		avgExperimentP95 += m.LatencyP95
		avgExperimentP99 += m.LatencyP99
		avgExperimentErrorRate += m.ErrorRate
	}
	count := float64(len(experimentMetrics))
	avgExperimentQPS /= count
	avgExperimentP50 /= count
	avgExperimentP95 /= count
	avgExperimentP99 /= count
	avgExperimentErrorRate /= count

	comparison := &MetricsComparison{
		BaselineQPS:          baseline.QPS,
		ExperimentQPS:        avgExperimentQPS,
		QPSChange:            avgExperimentQPS - baseline.QPS,
		
		BaselineLatencyP50:   baseline.LatencyP50,
		ExperimentLatencyP50: avgExperimentP50,
		LatencyP50Change:     avgExperimentP50 - baseline.LatencyP50,
		
		BaselineLatencyP95:   baseline.LatencyP95,
		ExperimentLatencyP95: avgExperimentP95,
		LatencyP95Change:     avgExperimentP95 - baseline.LatencyP95,
		
		BaselineLatencyP99:   baseline.LatencyP99,
		ExperimentLatencyP99: avgExperimentP99,
		LatencyP99Change:     avgExperimentP99 - baseline.LatencyP99,
		
		BaselineErrorRate:    baseline.ErrorRate,
		ExperimentErrorRate:  avgExperimentErrorRate,
		ErrorRateChange:      avgExperimentErrorRate - baseline.ErrorRate,
	}

	if baseline.QPS > 0 {
		comparison.QPSChangePercent = (avgExperimentQPS - baseline.QPS) / baseline.QPS * 100
	}

	return comparison
}

func (c *Client) buildExperimentAnalysisPrompt(
	baseline monitoring.MetricsSnapshot,
	experimentMetrics []monitoring.MetricsSnapshot,
	recoveryMetrics []monitoring.MetricsSnapshot,
	comparison *MetricsComparison,
) string {
	prompt := fmt.Sprintf(`分析以下混沌工程实验结果：

基线指标（实验前）:
- QPS: %.2f req/s
- P50 延迟: %.2f ms
- P95 延迟: %.2f ms
- P99 延迟: %.2f ms
- 错误率: %.4f (%.2f%%)

实验期间指标变化:
- QPS 变化: %.2f req/s (%.2f%%)
- P50 延迟变化: %.2f ms
- P95 延迟变化: %.2f ms
- P99 延迟变化: %.2f ms
- 错误率变化: %.4f

实验期间收集了 %d 个指标快照。
恢复期间收集了 %d 个指标快照。

请提供以下分析（JSON格式）:
1. summary: 实验结果总结
2. system_stability: 系统稳定性评估（stable, degraded, unstable）
3. weaknesses: 识别到的系统弱点列表
4. root_causes: 根本原因分析列表
5. steady_state: 系统是否达到稳态（true/false）
6. confidence: 分析置信度（0-1）
7. recommendations: 优化建议列表，每个建议包含:
   - priority: high/medium/low
   - category: resilience/scalability/observability
   - description: 建议描述
   - action: 具体行动`,
		baseline.QPS,
		baseline.LatencyP50,
		baseline.LatencyP95,
		baseline.LatencyP99,
		baseline.ErrorRate, baseline.ErrorRate*100,
		comparison.QPSChange, comparison.QPSChangePercent,
		comparison.LatencyP50Change,
		comparison.LatencyP95Change,
		comparison.LatencyP99Change,
		comparison.ErrorRateChange,
		len(experimentMetrics),
		len(recoveryMetrics),
	)

	return prompt
}

func getSystemPromptForExperimentAnalysis() string {
	return `你是一位资深的混沌工程专家和系统可靠性工程师。你的任务是分析混沌实验的结果，评估系统韧性，并提供专业的优化建议。

分析原则：
1. 关注系统在故障注入后的行为变化
2. 评估系统的自愈能力和恢复速度
3. 识别潜在的单点故障和性能瓶颈
4. 提供可执行的优化建议

请以JSON格式输出分析结果，确保可以被程序解析。`
}

func (c *Client) fallbackAnalysis(comparison *MetricsComparison) *ExperimentAnalysis {
	analysis := &ExperimentAnalysis{
		Summary:         "基于规则的分析结果",
		SystemStability: "stable",
		SteadyState:     true,
		Confidence:      0.7,
	}

	if comparison.LatencyP99Change > 200 {
		analysis.SystemStability = "degraded"
		analysis.Weaknesses = append(analysis.Weaknesses, "高延迟场景下P99延迟显著增加")
		analysis.SteadyState = false
	}

	if comparison.ErrorRateChange > 0.05 {
		analysis.SystemStability = "unstable"
		analysis.Weaknesses = append(analysis.Weaknesses, "错误率显著上升")
		analysis.SteadyState = false
	}

	if comparison.QPSChangePercent < -30 {
		analysis.SystemStability = "degraded"
		analysis.Weaknesses = append(analysis.Weaknesses, "QPS下降超过30%")
		analysis.SteadyState = false
	}

	if len(analysis.Weaknesses) == 0 {
		analysis.Summary = "系统表现稳定，在实验期间指标变化在可接受范围内"
	} else {
		analysis.Summary = fmt.Sprintf("系统检测到 %d 个潜在问题，需要关注", len(analysis.Weaknesses))
	}

	analysis.Recommendations = c.generateFallbackRecommendations(comparison)

	return analysis
}

func (c *Client) generateFallbackRecommendations(comparison *MetricsComparison) []Recommendation {
	var recommendations []Recommendation

	if comparison.LatencyP99Change > 200 {
		recommendations = append(recommendations, Recommendation{
			Priority:    "high",
			Category:    "resilience",
			Description: "优化P99延迟，增加超时和重试机制",
			Action:      "实现断路器模式，添加合理的超时配置",
		})
	}

	if comparison.ErrorRateChange > 0.05 {
		recommendations = append(recommendations, Recommendation{
			Priority:    "critical",
			Category:    "resilience",
			Description: "错误率过高，需要增强错误处理",
			Action:      "添加降级策略，增强错误日志记录",
		})
	}

	if comparison.QPSChangePercent < -30 {
		recommendations = append(recommendations, Recommendation{
			Priority:    "high",
			Category:    "scalability",
			Description: "QPS下降明显，需要评估容量",
			Action:      "增加副本数量，优化负载均衡策略",
		})
	}

	if len(recommendations) == 0 {
		recommendations = append(recommendations, Recommendation{
			Priority:    "medium",
			Category:    "observability",
			Description: "系统表现稳定，建议增强监控",
			Action:      "添加更多自定义指标，完善告警策略",
		})
	}

	return recommendations
}

func (c *Client) parseExperimentAnalysis(response string) (*ExperimentAnalysis, error) {
	var analysis ExperimentAnalysis
	err := json.Unmarshal([]byte(response), &analysis)
	if err != nil {
		return nil, err
	}
	return &analysis, nil
}

func (c *Client) AnalyzeQueryPlan(ctx context.Context, query string, explainResult string) (*QueryPlanAnalysis, error) {
	log.Printf("Analyzing query plan with LLM")

	prompt := fmt.Sprintf(`分析以下SQL查询及其执行计划：

查询语句:
%s

执行计划 (EXPLAIN ANALYZE):
%s

请提供以下分析（JSON格式）:
1. query: 原始查询
2. analysis_summary: 执行计划分析总结
3. issues: 问题列表，每个问题包含:
   - type: 问题类型（full_scan, missing_index, inefficient_join, etc.）
   - severity: high/medium/low
   - description: 问题描述
   - location: 问题位置
4. optimizations: 优化建议列表，每个建议包含:
   - type: 建议类型（index, rewrite, statistics, etc.）
   - description: 建议描述
   - impact: 预期影响
   - sql: 具体SQL语句
5. estimated_improvement: 预期性能提升描述
6. sql_script: 完整的优化SQL脚本`,
		query, explainResult)

	response, err := c.Chat(ctx, []Message{
		{
			Role:    "system",
			Content: getSystemPromptForQueryAnalysis(),
		},
		{
			Role:    "user",
			Content: prompt,
		},
	})

	if err != nil {
		log.Printf("LLM chat failed: %v", err)
		return c.fallbackQueryAnalysis(query, explainResult), nil
	}

	analysis, err := c.parseQueryPlanAnalysis(response)
	if err != nil {
		log.Printf("Failed to parse LLM response: %v", err)
		return c.fallbackQueryAnalysis(query, explainResult), nil
	}

	return analysis, nil
}

func getSystemPromptForQueryAnalysis() string {
	return `你是一位资深的数据库性能优化专家。你的任务是分析SQL执行计划，识别性能瓶颈，并提供专业的优化建议。

分析要点：
1. 识别全表扫描（Seq Scan）和缺少索引的情况
2. 分析JOIN操作的效率和连接顺序
3. 评估索引使用情况和索引选择性
4. 检查排序和聚合操作的性能影响
5. 提供可执行的优化建议

请以JSON格式输出分析结果。`
}

func (c *Client) fallbackQueryAnalysis(query string, explainResult string) *QueryPlanAnalysis {
	analysis := &QueryPlanAnalysis{
		Query:              query,
		AnalysisSummary:    "基于规则的初步分析",
		EstimatedImprovement: "需要进一步详细分析",
	}

	if bytes.Contains([]byte(explainResult), []byte("Seq Scan")) ||
		bytes.Contains([]byte(explainResult), []byte("Sequential Scan")) {
		analysis.Issues = append(analysis.Issues, QueryIssue{
			Type:        "full_scan",
			Severity:    "high",
			Description: "检测到全表扫描，可能缺少必要的索引",
			Location:    "执行计划中",
		})

		analysis.Optimizations = append(analysis.Optimizations, OptimizationSuggestion{
			Type:        "index",
			Description: "为过滤条件添加适当的索引",
			Impact:      "可能显著减少扫描行数",
			SQL:         "-- 建议根据WHERE条件创建索引\n-- CREATE INDEX idx_name ON table(column);",
		})
	}

	if bytes.Contains([]byte(explainResult), []byte("Nested Loop")) {
		analysis.Issues = append(analysis.Issues, QueryIssue{
			Type:        "inefficient_join",
			Severity:    "medium",
			Description: "嵌套循环连接可能在大数据集下性能不佳",
			Location:    "JOIN操作",
		})
	}

	if len(analysis.Issues) == 0 {
		analysis.AnalysisSummary = "执行计划未发现明显问题，建议结合实际执行时间进一步评估"
	}

	return analysis
}

func (c *Client) parseQueryPlanAnalysis(response string) (*QueryPlanAnalysis, error) {
	var analysis QueryPlanAnalysis
	err := json.Unmarshal([]byte(response), &analysis)
	if err != nil {
		return nil, err
	}
	return &analysis, nil
}

func (c *Client) AnalyzeSlowQuery(ctx context.Context, slowQuery *SlowQueryAnalysis) (*SlowQueryAnalysis, error) {
	log.Printf("Analyzing slow query with LLM")

	prompt := fmt.Sprintf(`分析以下慢查询日志：

查询语句:
%s

执行时间: %v
扫描行数: %d
返回行数: %d

请提供以下分析（JSON格式）:
1. analysis: 问题分析
2. issues: 问题列表
3. optimizations: 优化建议列表
4. optimized_query: 优化后的查询语句`,
		slowQuery.Query,
		slowQuery.ExecutionTime,
		slowQuery.RowsExamined,
		slowQuery.RowsSent)

	response, err := c.Chat(ctx, []Message{
		{
			Role:    "system",
			Content: getSystemPromptForQueryAnalysis(),
		},
		{
			Role:    "user",
			Content: prompt,
		},
	})

	if err != nil {
		log.Printf("LLM chat failed: %v", err)
		return slowQuery, nil
	}

	var result SlowQueryAnalysis
	err = json.Unmarshal([]byte(response), &result)
	if err != nil {
		log.Printf("Failed to parse LLM response: %v", err)
		return slowQuery, nil
	}

	slowQuery.Analysis = result.Analysis
	slowQuery.Issues = result.Issues
	slowQuery.Optimizations = result.Optimizations
	slowQuery.OptimizedQuery = result.OptimizedQuery

	return slowQuery, nil
}

func (c *Client) Chat(ctx context.Context, messages []Message) (string, error) {
	request := ChatRequest{
		Model:       c.config.Model,
		Messages:    messages,
		MaxTokens:   c.config.MaxTokens,
		Temperature: c.config.Temperature,
	}

	requestBody, err := json.Marshal(request)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	var url string
	switch c.config.Provider {
	case ProviderTypeOpenAI:
		url = "https://api.openai.com/v1/chat/completions"
	case ProviderTypeAzure:
		url = fmt.Sprintf("%s/openai/deployments/%s/chat/completions?api-version=2024-02-15-preview",
			c.config.BaseURL, c.config.Model)
	case ProviderTypeCustom:
		url = c.config.BaseURL
	default:
		url = "https://api.openai.com/v1/chat/completions"
	}

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(requestBody))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	if c.config.Provider == ProviderTypeAzure {
		req.Header.Set("api-key", c.config.APIKey)
	} else {
		req.Header.Set("Authorization", "Bearer "+c.config.APIKey)
	}

	resp, err := c.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("API request failed with status %d: %s", resp.StatusCode, string(body))
	}

	var chatResponse ChatResponse
	err = json.Unmarshal(body, &chatResponse)
	if err != nil {
		return "", fmt.Errorf("failed to unmarshal response: %w", err)
	}

	if len(chatResponse.Choices) == 0 {
		return "", fmt.Errorf("no choices in response")
	}

	log.Printf("LLM chat completed, tokens used: %d", chatResponse.Usage.TotalTokens)
	return chatResponse.Choices[0].Message.Content, nil
}
