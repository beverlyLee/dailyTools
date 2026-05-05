package llm

import (
	"time"
)

type ProviderType string

const (
	ProviderTypeOpenAI    ProviderType = "openai"
	ProviderTypeAzure     ProviderType = "azure"
	ProviderTypeAnthropic ProviderType = "anthropic"
	ProviderTypeCustom    ProviderType = "custom"
)

type Config struct {
	Provider     ProviderType
	APIKey       string
	Model        string
	BaseURL      string
	Timeout      time.Duration
	MaxTokens    int
	Temperature  float64
}

type ExperimentAnalysis struct {
	Summary           string   `json:"summary"`
	SystemStability   string   `json:"system_stability"`
	Weaknesses        []string `json:"weaknesses"`
	RootCauses        []string `json:"root_causes"`
	SteadyState       bool     `json:"steady_state"`
	Confidence        float64  `json:"confidence"`
	Recommendations   []Recommendation `json:"recommendations"`
}

type Recommendation struct {
	Priority    string `json:"priority"`
	Category    string `json:"category"`
	Description string `json:"description"`
	Action      string `json:"action"`
}

type QueryPlanAnalysis struct {
	Query           string                 `json:"query"`
	AnalysisSummary string                 `json:"analysis_summary"`
	Issues          []QueryIssue           `json:"issues"`
	Optimizations   []OptimizationSuggestion `json:"optimizations"`
	EstimatedImprovement string            `json:"estimated_improvement"`
	SQLScript       string                 `json:"sql_script"`
}

type QueryIssue struct {
	Type        string `json:"type"`
	Severity    string `json:"severity"`
	Description string `json:"description"`
	Location    string `json:"location"`
}

type OptimizationSuggestion struct {
	Type        string `json:"type"`
	Description string `json:"description"`
	Impact      string `json:"impact"`
	SQL         string `json:"sql"`
}

type SlowQueryAnalysis struct {
	Query           string              `json:"query"`
	ExecutionTime   time.Duration       `json:"execution_time"`
	RowsExamined    int64               `json:"rows_examined"`
	RowsSent        int64               `json:"rows_sent"`
	Analysis        string              `json:"analysis"`
	Issues          []QueryIssue        `json:"issues"`
	Optimizations   []OptimizationSuggestion `json:"optimizations"`
	OptimizedQuery  string              `json:"optimized_query"`
}

type MetricsComparison struct {
	BaselineQPS          float64
	ExperimentQPS        float64
	QPSChange            float64
	QPSChangePercent     float64
	
	BaselineLatencyP50   float64
	ExperimentLatencyP50 float64
	LatencyP50Change     float64
	
	BaselineLatencyP95   float64
	ExperimentLatencyP95 float64
	LatencyP95Change     float64
	
	BaselineLatencyP99   float64
	ExperimentLatencyP99 float64
	LatencyP99Change     float64
	
	BaselineErrorRate    float64
	ExperimentErrorRate  float64
	ErrorRateChange      float64
}

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type ChatRequest struct {
	Model       string    `json:"model"`
	Messages    []Message `json:"messages"`
	MaxTokens   int       `json:"max_tokens,omitempty"`
	Temperature float64   `json:"temperature,omitempty"`
}

type ChatResponse struct {
	ID      string `json:"id"`
	Object  string `json:"object"`
	Created int64  `json:"created"`
	Model   string `json:"model"`
	Choices []struct {
		Index        int     `json:"index"`
		Message      Message `json:"message"`
		FinishReason string  `json:"finish_reason"`
	} `json:"choices"`
	Usage struct {
		PromptTokens     int `json:"prompt_tokens"`
		CompletionTokens int `json:"completion_tokens"`
		TotalTokens      int `json:"total_tokens"`
	} `json:"usage"`
}
