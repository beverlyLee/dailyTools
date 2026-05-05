package monitoring

import (
	"time"
)

type MetricsType string

const (
	MetricsTypePrometheus MetricsType = "prometheus"
	MetricsTypeDatadog    MetricsType = "datadog"
	MetricsTypeCustom     MetricsType = "custom"
)

type MetricQuery struct {
	Name        string
	Query       string
	Description string
	Unit        string
}

type MetricQueries struct {
	QPS        MetricQuery
	LatencyP50 MetricQuery
	LatencyP95 MetricQuery
	LatencyP99 MetricQuery
	ErrorRate  MetricQuery
}

type MetricsSnapshot struct {
	Timestamp  time.Time `json:"timestamp"`
	QPS        float64   `json:"qps"`
	LatencyP50 float64   `json:"latency_p50_ms"`
	LatencyP95 float64   `json:"latency_p95_ms"`
	LatencyP99 float64   `json:"latency_p99_ms"`
	ErrorRate  float64   `json:"error_rate"`
}

type MetricsSeries struct {
	Labels    map[string]string
	Timestamps []time.Time
	Values     []float64
}

type MetricsResponse struct {
	Query     string
	Series    []MetricsSeries
	Timestamp time.Time
}

type MetricsStats struct {
	Min     float64
	Max     float64
	Avg     float64
	P50     float64
	P95     float64
	P99     float64
	StdDev  float64
}

type PrometheusConfig struct {
	Address      string
	Timeout      time.Duration
	Step         time.Duration
	QueryPrefix  string
}

type DatadogConfig struct {
	APIKey       string
	AppKey       string
	Address      string
	Timeout      time.Duration
}

type CustomMetricsConfig struct {
	Endpoint     string
	Headers      map[string]string
	Timeout      time.Duration
}

type Config struct {
	Type            MetricsType
	Prometheus      *PrometheusConfig
	Datadog         *DatadogConfig
	Custom          *CustomMetricsConfig
	DefaultQueries  *MetricQueries
	Namespace       string
	ServiceName     string
}

type AlertRule struct {
	Name        string
	Description string
	Query       string
	Threshold   float64
	Duration    time.Duration
	Severity    string
}
