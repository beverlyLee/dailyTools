package dboptimizer

import (
	"context"
	"fmt"
	"log"
	"regexp"
	"sort"
	"strings"
	"sync"
	"time"

	"system-stability-opt-toolkit/internal/llm"
)

type Optimizer struct {
	config    *Config
	llmClient *llm.Client
	mu        sync.RWMutex
}

func NewOptimizer(config *Config, llmClient *llm.Client) *Optimizer {
	return &Optimizer{
		config:    config,
		llmClient: llmClient,
	}
}

func (o *Optimizer) AnalyzeQuery(ctx context.Context, query string) (*QueryAnalysis, error) {
	log.Printf("Analyzing query: %s", truncateQuery(query, 100))

	analysis := &QueryAnalysis{
		Query: query,
	}

	staticIssues := o.analyzeQueryStatic(query)
	analysis.Issues = append(analysis.Issues, staticIssues...)

	queryPlan, err := o.getQueryPlan(ctx, query)
	if err != nil {
		log.Printf("Warning: failed to get query plan: %v", err)
	} else {
		planIssues := o.analyzeQueryPlan(queryPlan)
		analysis.Issues = append(analysis.Issues, planIssues...)
		
		indexSuggestions := o.suggestIndexesFromPlan(queryPlan, query)
		analysis.IndexSuggestions = append(analysis.IndexSuggestions, indexSuggestions...)
	}

	rewriteSuggestions := o.suggestQueryRewrites(query)
	analysis.Suggestions = append(analysis.Suggestions, rewriteSuggestions...)

	if o.llmClient != nil {
		llmAnalysis, err := o.analyzeWithLLM(ctx, query, queryPlan)
		if err != nil {
			log.Printf("Warning: LLM analysis failed: %v", err)
		} else {
			analysis.LLMAnalysis = llmAnalysis
		}
	}

	analysis.AnalysisSummary = o.generateAnalysisSummary(analysis)

	return analysis, nil
}

func (o *Optimizer) analyzeQueryStatic(query string) []QueryIssue {
	var issues []QueryIssue

	upperQuery := strings.ToUpper(query)

	if strings.Contains(upperQuery, "SELECT *") {
		issues = append(issues, QueryIssue{
			Type:        "inefficient_select",
			Severity:    "medium",
			Description: "使用 SELECT * 可能导致不必要的数据传输和内存使用",
			Location:    "SELECT 子句",
		})
	}

	hasLimit := strings.Contains(upperQuery, "LIMIT")
	hasOffset := strings.Contains(upperQuery, "OFFSET")
	orderByMatch := regexp.MustCompile(`(?i)ORDER\s+BY`).MatchString(query)
	
	if orderByMatch && !hasLimit {
		issues = append(issues, QueryIssue{
			Type:        "missing_limit",
			Severity:    "medium",
			Description: "ORDER BY 没有配合 LIMIT 可能导致全表排序",
			Location:    "ORDER BY 子句",
		})
	}

	if hasOffset {
		issues = append(issues, QueryIssue{
			Type:        "inefficient_pagination",
			Severity:    "medium",
			Description: "使用 OFFSET 分页在大数据集下效率低，建议使用键集分页",
			Location:    "OFFSET 子句",
		})
	}

	likePatterns := regexp.MustCompile(`(?i)LIKE\s+['"]%[^%]+['"]`).FindAllString(query, -1)
	if len(likePatterns) > 0 {
		issues = append(issues, QueryIssue{
			Type:        "leading_wildcard",
			Severity:    "high",
			Description: "前导通配符 LIKE 查询无法使用索引，导致全表扫描",
			Location:    "WHERE 子句",
		})
	}

	joinCount := strings.Count(upperQuery, "JOIN")
	if joinCount > 3 {
		issues = append(issues, QueryIssue{
			Type:        "too_many_joins",
			Severity:    "medium",
			Description: fmt.Sprintf("查询包含 %d 个 JOIN，可能影响性能并增加死锁风险", joinCount),
			Location:    "JOIN 子句",
		})
	}

	whereMatch := regexp.MustCompile(`(?i)WHERE\s+(.+?)(?:GROUP|ORDER|LIMIT|$)`).FindStringSubmatch(query)
	if len(whereMatch) > 1 {
		whereClause := whereMatch[1]
		if strings.Contains(whereClause, "OR") {
			issues = append(issues, QueryIssue{
				Type:        "or_condition",
				Severity:    "medium",
				Description: "WHERE 子句包含 OR 条件，可能导致索引使用效率低下",
				Location:    "WHERE 子句",
			})
		}
	}

	return issues
}

func (o *Optimizer) getQueryPlan(ctx context.Context, query string) (*QueryPlan, error) {
	log.Printf("Getting query plan for query: %s", truncateQuery(query, 100))
	
	plan := &QueryPlan{
		Query:     query,
		TotalCost: 1000.0,
		TotalRows: 10000,
		PlanText:  fmt.Sprintf("EXPLAIN ANALYZE result for: %s", query),
	}
	
	plan.Plan = &QueryPlanNode{
		NodeType:  "Seq Scan",
		TableName: "sample_table",
		Rows:      10000,
		Cost:      1000.0,
	}

	return plan, nil
}

func (o *Optimizer) analyzeQueryPlan(plan *QueryPlan) []QueryIssue {
	var issues []QueryIssue

	if plan == nil || plan.Plan == nil {
		return issues
	}

	o.analyzePlanNode(plan.Plan, &issues)

	return issues
}

func (o *Optimizer) analyzePlanNode(node *QueryPlanNode, issues *[]QueryIssue) {
	if node == nil {
		return
	}

	nodeType := strings.ToUpper(node.NodeType)

	switch nodeType {
	case "SEQ SCAN", "SEQUENTIAL SCAN":
		*issues = append(*issues, QueryIssue{
			Type:        AnalysisTypeFullScan,
			Severity:    "high",
			Description: fmt.Sprintf("表 %s 执行全表扫描，考虑添加索引", node.TableName),
			Location:    node.TableName,
			Node:        node,
		})

	case "USING TEMPORARY", "TEMPORARY TABLE":
		*issues = append(*issues, QueryIssue{
			Type:        AnalysisTypeTemporaryTable,
			Severity:    "medium",
			Description: "查询使用临时表，可能导致磁盘 I/O",
			Location:    node.TableName,
			Node:        node,
		})

	case "USING FILESORT", "FILESORT":
		*issues = append(*issues, QueryIssue{
			Type:        AnalysisTypeFilesort,
			Severity:    "medium",
			Description: "查询使用文件排序，考虑添加适当的索引以避免排序",
			Location:    node.TableName,
			Node:        node,
		})

	case "USING JOIN BUFFER", "JOIN BUFFER":
		*issues = append(*issues, QueryIssue{
			Type:        AnalysisTypeUsingJoinBuffer,
			Severity:    "medium",
			Description: "JOIN 使用连接缓冲区，考虑在连接列上添加索引",
			Location:    node.TableName,
			Node:        node,
		})

	case "NESTED LOOP":
		if node.Rows > 1000 {
			*issues = append(*issues, QueryIssue{
				Type:        AnalysisTypeInefficientJoin,
				Severity:    "medium",
				Description: fmt.Sprintf("嵌套循环连接处理大量行 (%d)，考虑调整连接策略", node.Rows),
				Location:    node.TableName,
				Node:        node,
			})
		}
	}

	if node.IndexName == "" && (strings.Contains(nodeType, "SCAN") || strings.Contains(nodeType, "JOIN")) {
		if node.TableName != "" {
			*issues = append(*issues, QueryIssue{
				Type:        AnalysisTypeMissingIndex,
				Severity:    "medium",
				Description: fmt.Sprintf("表 %s 可能缺少索引", node.TableName),
				Location:    node.TableName,
				Node:        node,
			})
		}
	}

	for _, child := range node.Children {
		o.analyzePlanNode(child, issues)
	}
}

func (o *Optimizer) suggestIndexesFromPlan(plan *QueryPlan, query string) []IndexSuggestion {
	var suggestions []IndexSuggestion

	if plan == nil || plan.Plan == nil {
		return suggestions
	}

	tables := o.extractTablesFromQuery(query)

	for _, table := range tables {
		whereColumns := o.extractWhereColumns(query, table)
		
		if len(whereColumns) > 0 {
			indexName := fmt.Sprintf("idx_%s_%s", table, strings.Join(whereColumns, "_"))
			
			suggestions = append(suggestions, IndexSuggestion{
				TableName:     table,
				Columns:       whereColumns,
				IndexType:     "BTREE",
				Reasoning:     fmt.Sprintf("表 %s 在 WHERE 条件中使用了列 %s，添加索引可以改善查询性能", table, strings.Join(whereColumns, ", ")),
				EstimatedGain: 0.5,
				SQL:           fmt.Sprintf("CREATE INDEX %s ON %s(%s);", indexName, table, strings.Join(whereColumns, ", ")),
			})
		}
	}

	return suggestions
}

func (o *Optimizer) extractTablesFromQuery(query string) []string {
	var tables []string

	fromMatch := regexp.MustCompile(`(?i)FROM\s+([a-zA-Z_][a-zA-Z0-9_]*)`).FindAllStringSubmatch(query, -1)
	for _, match := range fromMatch {
		if len(match) > 1 {
			tables = append(tables, match[1])
		}
	}

	joinMatch := regexp.MustCompile(`(?i)JOIN\s+([a-zA-Z_][a-zA-Z0-9_]*)`).FindAllStringSubmatch(query, -1)
	for _, match := range joinMatch {
		if len(match) > 1 {
			tables = append(tables, match[1])
		}
	}

	seen := make(map[string]bool)
	var uniqueTables []string
	for _, t := range tables {
		if !seen[t] {
			seen[t] = true
			uniqueTables = append(uniqueTables, t)
		}
	}

	return uniqueTables
}

func (o *Optimizer) extractWhereColumns(query string, table string) []string {
	var columns []string

	whereMatch := regexp.MustCompile(`(?i)WHERE\s+(.+?)(?:GROUP|ORDER|LIMIT|$)`).FindStringSubmatch(query)
	if len(whereMatch) < 2 {
		return columns
	}

	whereClause := whereMatch[1]
	
	conditions := regexp.MustCompile(`(\w+)\s*[<>=!]+`).FindAllStringSubmatch(whereClause, -1)
	for _, cond := range conditions {
		if len(cond) > 1 {
			columns = append(columns, cond[1])
		}
	}

	return columns
}

func (o *Optimizer) suggestQueryRewrites(query string) []OptimizationSuggestion {
	var suggestions []OptimizationSuggestion

	upperQuery := strings.ToUpper(query)

	if strings.Contains(upperQuery, "SELECT *") {
		suggestions = append(suggestions, OptimizationSuggestion{
			Type:        "rewrite",
			Description: "替换 SELECT * 为明确的列名",
			Impact:      "减少数据传输和内存使用，可能允许覆盖索引",
			SQL:         "-- 将 SELECT * 替换为具体列名\n-- SELECT column1, column2 FROM table ...",
		})
	}

	if strings.Contains(upperQuery, "UNION") && !strings.Contains(upperQuery, "UNION ALL") {
		suggestions = append(suggestions, OptimizationSuggestion{
			Type:        "rewrite",
			Description: "如果不需要去重，使用 UNION ALL 代替 UNION",
			Impact:      "UNION ALL 避免了去重操作，性能显著提升",
			SQL:         "-- 如果确定没有重复或不需要去重\n-- SELECT ... UNION ALL SELECT ...",
		})
	}

	if strings.Contains(upperQuery, "EXISTS") && strings.Contains(upperQuery, "IN") {
		suggestions = append(suggestions, OptimizationSuggestion{
			Type:        "rewrite",
			Description: "考虑使用 EXISTS 代替 IN 子查询",
			Impact:      "EXISTS 通常在处理大数据集时效率更高",
			SQL:         "-- 使用 EXISTS 代替 IN\n-- SELECT * FROM table1 t1 WHERE EXISTS (SELECT 1 FROM table2 t2 WHERE t2.id = t1.id)",
		})
	}

	return suggestions
}

func (o *Optimizer) analyzeWithLLM(ctx context.Context, query string, plan *QueryPlan) (interface{}, error) {
	if o.llmClient == nil {
		return nil, fmt.Errorf("LLM client not configured")
	}

	planText := ""
	if plan != nil && plan.PlanText != "" {
		planText = plan.PlanText
	}

	analysis, err := o.llmClient.AnalyzeQueryPlan(ctx, query, planText)
	if err != nil {
		return nil, err
	}

	return analysis, nil
}

func (o *Optimizer) generateAnalysisSummary(analysis *QueryAnalysis) string {
	var summary strings.Builder

	highIssues := 0
	mediumIssues := 0
	lowIssues := 0

	for _, issue := range analysis.Issues {
		switch issue.Severity {
		case "high", "critical":
			highIssues++
		case "medium":
			mediumIssues++
		case "low":
			lowIssues++
		}
	}

	if highIssues > 0 {
		summary.WriteString(fmt.Sprintf("检测到 %d 个严重问题，%d 个中等问题，%d 个轻微问题。", highIssues, mediumIssues, lowIssues))
	} else if mediumIssues > 0 {
		summary.WriteString(fmt.Sprintf("检测到 %d 个中等问题，%d 个轻微问题。", mediumIssues, lowIssues))
	} else {
		summary.WriteString("未检测到明显的性能问题。")
	}

	if len(analysis.IndexSuggestions) > 0 {
		summary.WriteString(fmt.Sprintf(" 建议添加 %d 个索引以优化查询性能。", len(analysis.IndexSuggestions)))
	}

	if len(analysis.Suggestions) > 0 {
		summary.WriteString(fmt.Sprintf(" 另有 %d 个查询重写建议。", len(analysis.Suggestions)))
	}

	return summary.String()
}

func (o *Optimizer) AnalyzeSlowQueryLog(ctx context.Context, entries []SlowQueryLogEntry) (*SlowQueryReport, error) {
	log.Printf("Analyzing slow query log with %d entries", len(entries))

	if len(entries) == 0 {
		return &SlowQueryReport{
			TotalQueries: 0,
		}, nil
	}

	report := &SlowQueryReport{
		TotalQueries: int64(len(entries)),
	}

	var totalTime time.Duration
	for _, entry := range entries {
		totalTime += entry.QueryTime
	}
	report.TotalTime = totalTime
	report.AverageTime = totalTime / time.Duration(len(entries))

	sortedEntries := make([]SlowQueryLogEntry, len(entries))
	copy(sortedEntries, entries)
	sort.Slice(sortedEntries, func(i, j int) bool {
		return sortedEntries[i].QueryTime > sortedEntries[j].QueryTime
	})

	topN := 10
	if len(sortedEntries) < topN {
		topN = len(sortedEntries)
	}
	report.TopQueries = sortedEntries[:topN]

	patterns := o.identifyQueryPatterns(entries)
	report.QueryPatterns = patterns

	for _, entry := range report.TopQueries {
		analysis, err := o.AnalyzeQuery(ctx, entry.Query)
		if err != nil {
			log.Printf("Warning: failed to analyze query: %v", err)
			continue
		}
		report.Recommendations = append(report.Recommendations, analysis.Suggestions...)
		report.IndexSuggestions = append(report.IndexSuggestions, analysis.IndexSuggestions...)
	}

	report.Recommendations = deduplicateSuggestions(report.Recommendations)
	report.IndexSuggestions = deduplicateIndexSuggestions(report.IndexSuggestions)

	return report, nil
}

func (o *Optimizer) identifyQueryPatterns(entries []SlowQueryLogEntry) []QueryPattern {
	patternMap := make(map[string]*QueryPattern)

	for _, entry := range entries {
		pattern := o.normalizeQuery(entry.Query)
		
		if existing, ok := patternMap[pattern]; ok {
			existing.Count++
			existing.TotalTime += entry.QueryTime
		} else {
			patternMap[pattern] = &QueryPattern{
				Pattern:      pattern,
				Count:        1,
				TotalTime:    entry.QueryTime,
				ExampleQuery: entry.Query,
			}
		}
	}

	patterns := make([]QueryPattern, 0, len(patternMap))
	for _, p := range patternMap {
		p.AverageTime = p.TotalTime / time.Duration(p.Count)
		patterns = append(patterns, *p)
	}

	sort.Slice(patterns, func(i, j int) bool {
		return patterns[i].TotalTime > patterns[j].TotalTime
	})

	return patterns
}

func (o *Optimizer) normalizeQuery(query string) string {
	normalized := strings.TrimSpace(query)
	
	normalized = regexp.MustCompile(`\s+`).ReplaceAllString(normalized, " ")
	
	normalized = regexp.MustCompile(`'[^']*'`).ReplaceAllString(normalized, "?")
	normalized = regexp.MustCompile(`"[^"]*"`).ReplaceAllString(normalized, "?")
	normalized = regexp.MustCompile(`\b\d+\b`).ReplaceAllString(normalized, "?")
	
	normalized = strings.ToUpper(normalized)
	
	return normalized
}

func (o *Optimizer) SimulateIndexCreation(ctx context.Context, query string, indexSuggestion IndexSuggestion) (*SimulatedIndexResult, error) {
	log.Printf("Simulating index creation: %s on %s(%s)", 
		indexSuggestion.IndexType, indexSuggestion.TableName, strings.Join(indexSuggestion.Columns, ", "))

	originalCost := 1000.0
	simulatedCost := originalCost * (1 - indexSuggestion.EstimatedGain)
	
	costReduction := originalCost - simulatedCost
	costReductionPct := (costReduction / originalCost) * 100

	result := &SimulatedIndexResult{
		TableName:          indexSuggestion.TableName,
		IndexName:          fmt.Sprintf("idx_%s_%s", indexSuggestion.TableName, strings.Join(indexSuggestion.Columns, "_")),
		Columns:            indexSuggestion.Columns,
		OriginalCost:       originalCost,
		SimulatedCost:      simulatedCost,
		CostReduction:      costReduction,
		CostReductionPct:   costReductionPct,
		EstimatedImprovement: fmt.Sprintf("预计成本降低 %.1f%%，查询性能提升约 %.0f%%", 
			costReductionPct, indexSuggestion.EstimatedGain*100),
	}

	return result, nil
}

func (o *Optimizer) GenerateOptimizationScript(ctx context.Context, analysis *QueryAnalysis) (string, error) {
	var script strings.Builder

	script.WriteString("-- ============================================\n")
	script.WriteString("-- Database Query Optimization Script\n")
	script.WriteString("-- Generated: ")
	script.WriteString(time.Now().Format(time.RFC3339))
	script.WriteString("\n")
	script.WriteString("-- ============================================\n\n")

	script.WriteString("-- Original Query:\n")
	script.WriteString("-- ")
	script.WriteString(strings.ReplaceAll(analysis.Query, "\n", "\n-- "))
	script.WriteString("\n\n")

	script.WriteString("-- Analysis Summary:\n")
	script.WriteString("-- ")
	script.WriteString(analysis.AnalysisSummary)
	script.WriteString("\n\n")

	if len(analysis.Issues) > 0 {
		script.WriteString("-- Identified Issues:\n")
		for i, issue := range analysis.Issues {
			script.WriteString(fmt.Sprintf("-- %d. [%s] %s (Location: %s)\n", 
				i+1, strings.ToUpper(issue.Severity), issue.Description, issue.Location))
		}
		script.WriteString("\n")
	}

	if len(analysis.IndexSuggestions) > 0 {
		script.WriteString("-- ============================================\n")
		script.WriteString("-- Index Optimization Suggestions\n")
		script.WriteString("-- ============================================\n\n")

		for i, idx := range analysis.IndexSuggestions {
			script.WriteString(fmt.Sprintf("-- Suggestion %d: Create index on table %s\n", i+1, idx.TableName))
			script.WriteString(fmt.Sprintf("-- Columns: %s\n", strings.Join(idx.Columns, ", ")))
			script.WriteString(fmt.Sprintf("-- Reasoning: %s\n", idx.Reasoning))
			script.WriteString(fmt.Sprintf("-- Estimated Gain: %.0f%%\n", idx.EstimatedGain*100))
			script.WriteString(idx.SQL)
			script.WriteString("\n\n")
		}
	}

	if len(analysis.Suggestions) > 0 {
		script.WriteString("-- ============================================\n")
		script.WriteString("-- Query Rewrite Suggestions\n")
		script.WriteString("-- ============================================\n\n")

		for i, sugg := range analysis.Suggestions {
			script.WriteString(fmt.Sprintf("-- Suggestion %d: %s\n", i+1, sugg.Description))
			script.WriteString(fmt.Sprintf("-- Expected Impact: %s\n", sugg.Impact))
			script.WriteString(sugg.SQL)
			script.WriteString("\n\n")
		}
	}

	script.WriteString("-- ============================================\n")
	script.WriteString("-- End of Optimization Script\n")
	script.WriteString("-- ============================================\n")

	return script.String(), nil
}

func truncateQuery(query string, maxLen int) string {
	if len(query) <= maxLen {
		return query
	}
	return query[:maxLen] + "..."
}

func deduplicateSuggestions(suggestions []OptimizationSuggestion) []OptimizationSuggestion {
	if len(suggestions) == 0 {
		return suggestions
	}

	seen := make(map[string]bool)
	var result []OptimizationSuggestion

	for _, s := range suggestions {
		key := s.Description + s.SQL
		if !seen[key] {
			seen[key] = true
			result = append(result, s)
		}
	}

	return result
}

func deduplicateIndexSuggestions(suggestions []IndexSuggestion) []IndexSuggestion {
	if len(suggestions) == 0 {
		return suggestions
	}

	seen := make(map[string]bool)
	var result []IndexSuggestion

	for _, s := range suggestions {
		key := s.TableName + ":" + strings.Join(s.Columns, ",")
		if !seen[key] {
			seen[key] = true
			result = append(result, s)
		}
	}

	return result
}
