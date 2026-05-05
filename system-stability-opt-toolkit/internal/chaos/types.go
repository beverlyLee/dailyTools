package chaos

import (
	"time"

	"system-stability-opt-toolkit/internal/llm"
	"system-stability-opt-toolkit/internal/monitoring"
)

type ExperimentType string

const (
	ExperimentTypePodFailure   ExperimentType = "pod-failure"
	ExperimentTypeNetworkDelay ExperimentType = "network-delay"
	ExperimentTypeDiskPressure ExperimentType = "disk-pressure"
	ExperimentTypeCPUStress    ExperimentType = "cpu-stress"
	ExperimentTypeMemoryStress ExperimentType = "memory-stress"
)

type ExperimentStatus string

const (
	ExperimentStatusPending    ExperimentStatus = "pending"
	ExperimentStatusRunning    ExperimentStatus = "running"
	ExperimentStatusCompleted  ExperimentStatus = "completed"
	ExperimentStatusFailed     ExperimentStatus = "failed"
	ExperimentStatusRolledBack ExperimentStatus = "rolled-back"
)

type Target struct {
	Namespace  string            `json:"namespace"`
	Deployment string            `json:"deployment,omitempty"`
	PodName    string            `json:"pod_name,omitempty"`
	Container  string            `json:"container,omitempty"`
	Labels     map[string]string `json:"labels,omitempty"`
}

type PodFailureConfig struct {
	PodCount   int           `json:"pod_count"`
	Duration   time.Duration `json:"duration"`
	GracePeriod time.Duration `json:"grace_period"`
}

type NetworkDelayConfig struct {
	Latency    time.Duration `json:"latency"`
	Jitter     time.Duration `json:"jitter"`
	TargetPort int           `json:"target_port,omitempty"`
}

type DiskPressureConfig struct {
	SizeGB     int           `json:"size_gb"`
	Path       string        `json:"path"`
}

type CPUStressConfig struct {
	Load       int           `json:"load"`
	Duration   time.Duration `json:"duration"`
}

type MemoryStressConfig struct {
	SizeMB     int           `json:"size_mb"`
	Duration   time.Duration `json:"duration"`
}

type ExperimentConfig struct {
	Type           ExperimentType       `json:"type"`
	Target         Target               `json:"target"`
	PodFailure     *PodFailureConfig    `json:"pod_failure,omitempty"`
	NetworkDelay   *NetworkDelayConfig  `json:"network_delay,omitempty"`
	DiskPressure   *DiskPressureConfig  `json:"disk_pressure,omitempty"`
	CPUStress      *CPUStressConfig     `json:"cpu_stress,omitempty"`
	MemoryStress   *MemoryStressConfig  `json:"memory_stress,omitempty"`
	Duration       time.Duration        `json:"duration"`
	Interval       time.Duration        `json:"interval"`
	AutoRollback   bool                 `json:"auto_rollback"`
	RollbackThreshold *RollbackThreshold `json:"rollback_threshold,omitempty"`
}

type RollbackThreshold struct {
	ErrorRate   float64 `json:"error_rate"`
	LatencyP99  float64 `json:"latency_p99_ms"`
	QPSDropRate float64 `json:"qps_drop_rate"`
}

type Experiment struct {
	ID          string           `json:"id"`
	Name        string           `json:"name"`
	Description string           `json:"description"`
	Config      ExperimentConfig `json:"config"`
	Status      ExperimentStatus `json:"status"`
	CreatedAt   time.Time        `json:"created_at"`
	StartedAt   *time.Time       `json:"started_at,omitempty"`
	CompletedAt *time.Time       `json:"completed_at,omitempty"`
	Result      *ExperimentResult `json:"result,omitempty"`
}

type ExperimentResult struct {
	ExperimentID   string                      `json:"experiment_id"`
	Status         string                      `json:"status"`
	BaselineMetrics monitoring.MetricsSnapshot `json:"baseline_metrics"`
	ExperimentMetrics []monitoring.MetricsSnapshot `json:"experiment_metrics"`
	RecoveryMetrics []monitoring.MetricsSnapshot   `json:"recovery_metrics"`
	LLMAnalysis    *llm.ExperimentAnalysis      `json:"llm_analysis,omitempty"`
	Recommendations []Recommendation            `json:"recommendations,omitempty"`
}

type Recommendation struct {
	Priority    string `json:"priority"`
	Category    string `json:"category"`
	Description string `json:"description"`
	Action      string `json:"action"`
}
