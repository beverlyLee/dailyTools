package model

import "time"

type Service struct {
	ID          string    `json:"id" yaml:"id"`
	Name        string    `json:"name" yaml:"name"`
	Namespace   string    `json:"namespace" yaml:"namespace"`
	Version     string    `json:"version" yaml:"version"`
	Status      string    `json:"status" yaml:"status"` // healthy, warning, unhealthy
	Instances   int       `json:"instances" yaml:"instances"`
	Category    string    `json:"category" yaml:"category"` // gateway, service, db
	CreatedAt   time.Time `json:"createdAt" yaml:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt" yaml:"updatedAt"`
}

type ServiceInstance struct {
	ID          string            `json:"id" yaml:"id"`
	ServiceID   string            `json:"serviceId" yaml:"serviceId"`
	IP          string            `json:"ip" yaml:"ip"`
	Port        int               `json:"port" yaml:"port"`
	Status      string            `json:"status" yaml:"status"` // healthy, unhealthy
	Metrics     InstanceMetrics   `json:"metrics" yaml:"metrics"`
	Labels      map[string]string `json:"labels,omitempty" yaml:"labels,omitempty"`
	CreatedAt   time.Time         `json:"createdAt" yaml:"createdAt"`
	UpdatedAt   time.Time         `json:"updatedAt" yaml:"updatedAt"`
}

type InstanceMetrics struct {
	QPS     float64 `json:"qps" yaml:"qps"`
	CPU     string  `json:"cpu" yaml:"cpu"`
	Memory  string  `json:"memory" yaml:"memory"`
	Latency float64 `json:"latency" yaml:"latency"`
	ErrorRate float64 `json:"errorRate" yaml:"errorRate"`
}

type ServiceMetrics struct {
	ServiceID    string    `json:"serviceId" yaml:"serviceId"`
	ServiceName   string    `json:"serviceName" yaml:"serviceName"`
	QPS            float64   `json:"qps" yaml:"qps"`
	AvgLatency      float64   `json:"avgLatency" yaml:"avgLatency"`
	P99Latency     float64   `json:"p99Latency" yaml:"p99Latency"`
	ErrorRate        float64   `json:"errorRate" yaml:"errorRate"`
	SuccessRequests  int64     `json:"successRequests" yaml:"successRequests"`
	FailedRequests   int64     `json:"failedRequests" yaml:"failedRequests"`
	Timestamp        time.Time `json:"timestamp" yaml:"timestamp"`
}

type TopologyData struct {
	Nodes []TopologyNode `json:"nodes" yaml:"nodes"`
	Edges []TopologyEdge `json:"edges" yaml:"edges"`
}

type TopologyNode struct {
	ID       string `json:"id" yaml:"id"`
	Name     string `json:"name" yaml:"name"`
	Status   string `json:"status" yaml:"status"`
	Category string `json:"category" yaml:"category"`
}

type TopologyEdge struct {
	Source    string  `json:"source" yaml:"source"`
	Target    string  `json:"target" yaml:"target"`
	Latency   float64 `json:"latency" yaml:"latency"`
	QPS       float64 `json:"qps" yaml:"qps"`
	ErrorRate float64 `json:"errorRate" yaml:"errorRate"`
}

type ServiceDependency struct {
	ServiceID       string          `json:"serviceId" yaml:"serviceId"`
	ServiceName       string          `json:"serviceName" yaml:"serviceName"`
	UpstreamServices  []DependencyService `json:"upstreamServices" yaml:"upstreamServices"`
	DownstreamServices []DependencyService `json:"downstreamServices" yaml:"downstreamServices"`
}

type DependencyService struct {
	ServiceName string  `json:"serviceName" yaml:"serviceName"`
	QPS         float64 `json:"qps" yaml:"qps"`
	ErrorRate   float64 `json:"errorRate" yaml:"errorRate"`
	Latency     float64 `json:"latency" yaml:"latency"`
}

type MetricsTimeSeries struct {
	ServiceID string      `json:"serviceId" yaml:"serviceId"`
	MetricType string     `json:"metricType" yaml:"metricType"`
	Values    []TimeValue `json:"values" yaml:"values"`
}

type TimeValue struct {
	Timestamp time.Time `json:"timestamp" yaml:"timestamp"`
	Value     float64   `json:"value" yaml:"value"`
}
