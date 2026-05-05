package reporter

import (
	"time"
)

type ReportFormat string

const (
	ReportFormatJSON     ReportFormat = "json"
	ReportFormatHTML     ReportFormat = "html"
	ReportFormatMarkdown ReportFormat = "markdown"
	ReportFormatPDF      ReportFormat = "pdf"
)

type ExperimentReport struct {
	ReportID          string              `json:"report_id"`
	ExperimentID      string              `json:"experiment_id"`
	ExperimentName    string              `json:"experiment_name"`
	ExperimentType    string              `json:"experiment_type"`
	CreatedAt         time.Time           `json:"created_at"`
	Status            string              `json:"status"`
	
	Target            TargetInfo          `json:"target"`
	ExecutionTimeline ExecutionTimeline   `json:"execution_timeline"`
	
	MetricsSummary    MetricsSummary      `json:"metrics_summary"`
	LLMAnalysis       interface{}         `json:"llm_analysis,omitempty"`
	Recommendations   []Recommendation    `json:"recommendations"`
	RollbackInfo      *RollbackInfo       `json:"rollback_info,omitempty"`
	
	RawMetrics        interface{}         `json:"raw_metrics,omitempty"`
}

type TargetInfo struct {
	Namespace   string            `json:"namespace"`
	Deployment  string            `json:"deployment,omitempty"`
	PodName     string            `json:"pod_name,omitempty"`
	Labels      map[string]string `json:"labels,omitempty"`
}

type ExecutionTimeline struct {
	CreatedAt   time.Time  `json:"created_at"`
	StartedAt   *time.Time `json:"started_at,omitempty"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`
	Duration    string     `json:"duration,omitempty"`
}

type MetricsSummary struct {
	Baseline    MetricSnapshot `json:"baseline"`
	Experiment  MetricStats    `json:"experiment"`
	Recovery    MetricStats    `json:"recovery"`
	Comparison  MetricComparison `json:"comparison"`
}

type MetricSnapshot struct {
	Timestamp  time.Time `json:"timestamp"`
	QPS        float64   `json:"qps"`
	LatencyP50 float64   `json:"latency_p50_ms"`
	LatencyP95 float64   `json:"latency_p95_ms"`
	LatencyP99 float64   `json:"latency_p99_ms"`
	ErrorRate  float64   `json:"error_rate"`
}

type MetricStats struct {
	Min     float64 `json:"min"`
	Max     float64 `json:"max"`
	Avg     float64 `json:"avg"`
	P50     float64 `json:"p50"`
	P95     float64 `json:"p95"`
	P99     float64 `json:"p99"`
	StdDev  float64 `json:"stddev"`
}

type MetricComparison struct {
	QPS struct {
		Change        float64 `json:"change"`
		ChangePercent float64 `json:"change_percent"`
		Status        string  `json:"status"`
	} `json:"qps"`
	
	LatencyP50 struct {
		Change        float64 `json:"change_ms"`
		ChangePercent float64 `json:"change_percent"`
		Status        string  `json:"status"`
	} `json:"latency_p50"`
	
	LatencyP95 struct {
		Change        float64 `json:"change_ms"`
		ChangePercent float64 `json:"change_percent"`
		Status        string  `json:"status"`
	} `json:"latency_p95"`
	
	LatencyP99 struct {
		Change        float64 `json:"change_ms"`
		ChangePercent float64 `json:"change_percent"`
		Status        string  `json:"status"`
	} `json:"latency_p99"`
	
	ErrorRate struct {
		Change        float64 `json:"change"`
		ChangePercent float64 `json:"change_percent"`
		Status        string  `json:"status"`
	} `json:"error_rate"`
}

type Recommendation struct {
	Priority    string `json:"priority"`
	Category    string `json:"category"`
	Description string `json:"description"`
	Action      string `json:"action"`
}

type RollbackInfo struct {
	RollbackAt    time.Time `json:"rollback_at"`
	Reason        string    `json:"reason"`
	TriggeredBy   string    `json:"triggered_by"`
	RestoredState string    `json:"restored_state"`
}

type SystemState struct {
	StateID        string                 `json:"state_id"`
	CapturedAt     time.Time              `json:"captured_at"`
	ExperimentID   string                 `json:"experiment_id"`
	
	PodStates      []PodState             `json:"pod_states"`
	NetworkState   *NetworkState          `json:"network_state,omitempty"`
	ResourceState  *ResourceState         `json:"resource_state,omitempty"`
	
	CustomState    map[string]interface{} `json:"custom_state,omitempty"`
}

type PodState struct {
	Namespace       string            `json:"namespace"`
	PodName         string            `json:"pod_name"`
	Phase           string            `json:"phase"`
	Ready           bool              `json:"ready"`
	RestartCount    int32             `json:"restart_count"`
	Labels          map[string]string `json:"labels"`
	Annotations     map[string]string `json:"annotations"`
	CreationTime    time.Time         `json:"creation_time"`
}

type NetworkState struct {
	Interfaces     []NetworkInterface `json:"interfaces"`
	Rules          []NetworkRule      `json:"rules"`
	Connections    int                `json:"connections"`
}

type NetworkInterface struct {
	Name          string `json:"name"`
	IPAddress     string `json:"ip_address"`
	Status        string `json:"status"`
}

type NetworkRule struct {
	Type        string `json:"type"`
	Target      string `json:"target"`
	Action      string `json:"action"`
	Description string `json:"description"`
}

type ResourceState struct {
	CPUUsage      float64 `json:"cpu_usage_percent"`
	MemoryUsage   float64 `json:"memory_usage_percent"`
	DiskUsage     float64 `json:"disk_usage_percent"`
	NetworkIn     float64 `json:"network_in_bytes"`
	NetworkOut    float64 `json:"network_out_bytes"`
}

type RollbackPlan struct {
	PlanID         string            `json:"plan_id"`
	ExperimentID   string            `json:"experiment_id"`
	OriginalState  *SystemState      `json:"original_state"`
	Steps          []RollbackStep    `json:"steps"`
	CreatedAt      time.Time         `json:"created_at"`
}

type RollbackStep struct {
	Order       int    `json:"order"`
	Type        string `json:"type"`
	Description string `json:"description"`
	Action      string `json:"action"`
	Status      string `json:"status"`
}

type ReportGenerationOptions struct {
	IncludeRawMetrics   bool          `json:"include_raw_metrics"`
	IncludeLLMAnalysis  bool          `json:"include_llm_analysis"`
	Format              ReportFormat  `json:"format"`
	Title               string        `json:"title,omitempty"`
	Description         string        `json:"description,omitempty"`
}
