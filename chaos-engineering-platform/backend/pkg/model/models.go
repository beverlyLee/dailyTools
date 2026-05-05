package model

import (
	"time"
)

type ExperimentStatus string

const (
	ExperimentStatusDraft     ExperimentStatus = "draft"
	ExperimentStatusReady     ExperimentStatus = "ready"
	ExperimentStatusRunning   ExperimentStatus = "running"
	ExperimentStatusPaused    ExperimentStatus = "paused"
	ExperimentStatusCompleted ExperimentStatus = "completed"
	ExperimentStatusFailed    ExperimentStatus = "failed"
	ExperimentStatusAborted   ExperimentStatus = "aborted"
)

type StepStatus string

const (
	StepStatusPending   StepStatus = "pending"
	StepStatusRunning   StepStatus = "running"
	StepStatusCompleted StepStatus = "completed"
	StepStatusFailed    StepStatus = "failed"
	StepStatusPaused    StepStatus = "paused"
)

type FaultCategory string

const (
	FaultCategoryNetwork     FaultCategory = "network"
	FaultCategoryResource    FaultCategory = "resource"
	FaultCategoryContainer   FaultCategory = "container"
	FaultCategoryApplication FaultCategory = "application"
)

type FaultType struct {
	ID            string                 `json:"id"`
	Name          string                 `json:"name"`
	Category      FaultCategory          `json:"category"`
	Icon          string                 `json:"icon"`
	Description   string                 `json:"description"`
	ConfigSchema  map[string]interface{} `json:"configSchema"`
}

type ExperimentStep struct {
	ID          string                 `json:"id"`
	Type        FaultType              `json:"type"`
	Name        string                 `json:"name"`
	Config      map[string]interface{} `json:"config"`
	Duration    int                    `json:"duration"`
	Status      StepStatus             `json:"status"`
	StartedAt   *time.Time             `json:"startedAt,omitempty"`
	CompletedAt *time.Time             `json:"completedAt,omitempty"`
}

type SteadyStateCheckConfig struct {
	Enabled         bool             `json:"enabled"`
	CheckInterval   int              `json:"checkInterval"`
	Metrics         []MetricThreshold `json:"metrics"`
	RollbackOnFailure bool           `json:"rollbackOnFailure"`
}

type Experiment struct {
	ID                string                  `json:"id"`
	Name              string                  `json:"name"`
	Description       string                  `json:"description"`
	Steps             []ExperimentStep        `json:"steps"`
	Status            ExperimentStatus        `json:"status"`
	TargetNamespace   string                  `json:"targetNamespace"`
	CreatedAt         time.Time               `json:"createdAt"`
	UpdatedAt         time.Time               `json:"updatedAt"`
	StartedAt         *time.Time              `json:"startedAt,omitempty"`
	CompletedAt       *time.Time              `json:"completedAt,omitempty"`
	SteadyStateCheck  SteadyStateCheckConfig  `json:"steadyStateCheck"`
}

type ExperimentLog struct {
	ID           string     `json:"id"`
	ExperimentID string     `json:"experimentId"`
	StepID       *string    `json:"stepId,omitempty"`
	Timestamp    time.Time  `json:"timestamp"`
	Level        LogLevel   `json:"level"`
	Message      string     `json:"message"`
}

type LogLevel string

const (
	LogLevelInfo  LogLevel = "info"
	LogLevelWarn  LogLevel = "warn"
	LogLevelError LogLevel = "error"
	LogLevelDebug LogLevel = "debug"
)

type Metric struct {
	ID             string      `json:"id"`
	Name           string      `json:"name"`
	DisplayName    string      `json:"displayName"`
	Description    string      `json:"description"`
	Unit           string      `json:"unit"`
	Category       string      `json:"category"`
	DefaultThreshold float64   `json:"defaultThreshold"`
	DefaultOperator string     `json:"defaultOperator"`
}

type MetricThreshold struct {
	ID          string  `json:"id"`
	MetricID    string  `json:"metricId"`
	Metric      Metric  `json:"metric"`
	Name        string  `json:"name"`
	Operator    string  `json:"operator"`
	Threshold   float64 `json:"threshold"`
	Unit        string  `json:"unit"`
	Enabled     bool    `json:"enabled"`
	CreatedBy   string  `json:"createdBy"`
	CreatedAt   string  `json:"createdAt"`
	UpdatedAt   string  `json:"updatedAt"`
}

type MetricValue struct {
	MetricID   string                 `json:"metricId"`
	MetricName string                 `json:"metricName"`
	Value      float64                `json:"value"`
	Timestamp  time.Time              `json:"timestamp"`
	Unit       string                 `json:"unit"`
	Labels     map[string]string      `json:"labels,omitempty"`
}

type MetricHistory struct {
	MetricID string      `json:"metricId"`
	Data     []DataPoint `json:"data"`
	Min      float64     `json:"min"`
	Max      float64     `json:"max"`
	Avg      float64     `json:"avg"`
}

type DataPoint struct {
	Timestamp string  `json:"timestamp"`
	Value     float64 `json:"value"`
}

type SteadyStateCheck struct {
	ID             string            `json:"id"`
	ExperimentID   string            `json:"experimentId"`
	ExperimentName string           `json:"experimentName"`
	Status         string            `json:"status"`
	Thresholds     []MetricThreshold `json:"thresholds"`
	Violations     []Violation       `json:"violations"`
	StartedAt      *string           `json:"startedAt,omitempty"`
	LastCheckAt    *string           `json:"lastCheckAt,omitempty"`
}

type Violation struct {
	ID            string  `json:"id"`
	CheckID       string  `json:"checkId"`
	MetricID      string  `json:"metricId"`
	MetricName    string  `json:"metricName"`
	ExpectedValue float64 `json:"expectedValue"`
	ActualValue   float64 `json:"actualValue"`
	Operator      string  `json:"operator"`
	Unit          string  `json:"unit"`
	Timestamp     string  `json:"timestamp"`
	Level         string  `json:"level"`
	Acknowledged  bool    `json:"acknowledged"`
}

type CircuitBreakerEvent struct {
	ID             string                 `json:"id"`
	ExperimentID   string                 `json:"experimentId"`
	ExperimentName string                `json:"experimentName"`
	EventType      string                 `json:"eventType"`
	Reason         string                 `json:"reason"`
	Timestamp      string                 `json:"timestamp"`
	Details        map[string]interface{} `json:"details,omitempty"`
}

type APIResponse struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

func NewSuccessResponse(data interface{}) APIResponse {
	return APIResponse{
		Code:    200,
		Message: "success",
		Data:    data,
	}
}

func NewErrorResponse(code int, message string) APIResponse {
	return APIResponse{
		Code:    code,
		Message: message,
	}
}
