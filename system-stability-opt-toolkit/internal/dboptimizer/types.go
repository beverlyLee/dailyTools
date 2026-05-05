package dboptimizer

import (
	"time"
)

type DatabaseType string

const (
	DatabaseTypeMySQL      DatabaseType = "mysql"
	DatabaseTypePostgreSQL DatabaseType = "postgresql"
	DatabaseTypeSQLServer  DatabaseType = "sqlserver"
	DatabaseTypeMongoDB    DatabaseType = "mongodb"
)

type Config struct {
	DatabaseType DatabaseType
	Host         string
	Port         int
	User         string
	Password     string
	Database     string
	SSLMode      string
	MaxRetries   int
	Timeout      time.Duration
}

type SlowQueryLogEntry struct {
	QueryTime      time.Duration `json:"query_time"`
	LockTime       time.Duration `json:"lock_time"`
	RowsExamined   int64         `json:"rows_examined"`
	RowsSent       int64         `json:"rows_sent"`
	Timestamp      time.Time     `json:"timestamp"`
	User           string        `json:"user"`
	Host           string        `json:"host"`
	DB             string        `json:"db"`
	Query          string        `json:"query"`
	QueryDigest    string        `json:"query_digest"`
}

type QueryPlanNode struct {
	NodeType          string            `json:"node_type"`
	TableName         string            `json:"table_name"`
	IndexName         string            `json:"index_name"`
	Rows              int64             `json:"rows"`
	Cost              float64           `json:"cost"`
	ActualRows        int64             `json:"actual_rows,omitempty"`
	ActualTime        float64           `json:"actual_time,omitempty"`
	JoinType          string            `json:"join_type,omitempty"`
	Filter            string            `json:"filter,omitempty"`
	Columns           []string          `json:"columns,omitempty"`
	IndexCondition    string            `json:"index_condition,omitempty"`
	JoinCondition     string            `json:"join_condition,omitempty"`
	Children          []*QueryPlanNode  `json:"children,omitempty"`
	ExtraInformation  map[string]string `json:"extra_information,omitempty"`
}

type QueryPlan struct {
	Query          string          `json:"query"`
	Plan           *QueryPlanNode  `json:"plan"`
	TotalCost      float64         `json:"total_cost"`
	TotalTime      float64         `json:"total_time,omitempty"`
	TotalRows      int64           `json:"total_rows"`
	RawPlan        interface{}     `json:"raw_plan,omitempty"`
	PlanText       string          `json:"plan_text,omitempty"`
}

type AnalysisType string

const (
	AnalysisTypeFullScan        AnalysisType = "full_scan"
	AnalysisTypeMissingIndex    AnalysisType = "missing_index"
	AnalysisTypeInefficientJoin AnalysisType = "inefficient_join"
	AnalysisTypeTemporaryTable  AnalysisType = "temporary_table"
	AnalysisTypeFilesort        AnalysisType = "filesort"
	AnalysisTypeUsingJoinBuffer AnalysisType = "using_join_buffer"
	AnalysisTypeRangeScan       AnalysisType = "range_scan"
	AnalysisTypeIndexScan       AnalysisType = "index_scan"
)

type QueryIssue struct {
	Type        AnalysisType `json:"type"`
	Severity    string       `json:"severity"`
	Description string       `json:"description"`
	Location    string       `json:"location"`
	Node        *QueryPlanNode `json:"node,omitempty"`
}

type OptimizationSuggestion struct {
	Type        string `json:"type"`
	Description string `json:"description"`
	Impact      string `json:"impact"`
	SQL         string `json:"sql"`
	Reasoning   string `json:"reasoning,omitempty"`
}

type IndexSuggestion struct {
	TableName     string   `json:"table_name"`
	Columns       []string `json:"columns"`
	IndexType     string   `json:"index_type"`
	Reasoning     string   `json:"reasoning"`
	EstimatedGain float64  `json:"estimated_gain"`
	SQL           string   `json:"sql"`
}

type QueryAnalysis struct {
	Query           string                  `json:"query"`
	OptimizedQuery  string                  `json:"optimized_query,omitempty"`
	Issues          []QueryIssue            `json:"issues"`
	Suggestions     []OptimizationSuggestion `json:"suggestions"`
	IndexSuggestions []IndexSuggestion       `json:"index_suggestions"`
	AnalysisSummary string                  `json:"analysis_summary"`
	LLMAnalysis     interface{}             `json:"llm_analysis,omitempty"`
}

type SimulatedIndexResult struct {
	TableName       string  `json:"table_name"`
	IndexName       string  `json:"index_name"`
	Columns         []string `json:"columns"`
	OriginalCost    float64 `json:"original_cost"`
	SimulatedCost   float64 `json:"simulated_cost"`
	CostReduction   float64 `json:"cost_reduction"`
	CostReductionPct float64 `json:"cost_reduction_percent"`
	EstimatedImprovement string `json:"estimated_improvement"`
}

type SlowQueryReport struct {
	TotalQueries    int64                  `json:"total_queries"`
	TotalTime       time.Duration          `json:"total_time"`
	AverageTime     time.Duration          `json:"average_time"`
	TopQueries      []SlowQueryLogEntry    `json:"top_queries"`
	QueryPatterns   []QueryPattern         `json:"query_patterns"`
	Recommendations []OptimizationSuggestion `json:"recommendations"`
	IndexSuggestions []IndexSuggestion       `json:"index_suggestions"`
}

type QueryPattern struct {
	Pattern       string        `json:"pattern"`
	Count         int64         `json:"count"`
	TotalTime     time.Duration `json:"total_time"`
	AverageTime   time.Duration `json:"average_time"`
	ExampleQuery  string        `json:"example_query"`
}
