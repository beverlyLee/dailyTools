package models

import (
	"time"
)

type AppStatus string

const (
	AppStatusActive   AppStatus = "active"
	AppStatusInactive AppStatus = "inactive"
	AppStatusDraft    AppStatus = "draft"
)

type DeploymentStatus string

const (
	DeploymentStatusPending     DeploymentStatus = "pending"
	DeploymentStatusRunning     DeploymentStatus = "running"
	DeploymentStatusCompleted   DeploymentStatus = "completed"
	DeploymentStatusFailed      DeploymentStatus = "failed"
	DeploymentStatusRollingBack DeploymentStatus = "rolling_back"
	DeploymentStatusRolledBack  DeploymentStatus = "rolled_back"
)

type DeploymentStrategy string

const (
	StrategyCanary    DeploymentStrategy = "canary"
	StrategyRolling   DeploymentStrategy = "rolling"
	StrategyBlueGreen DeploymentStrategy = "blue_green"
)

type App struct {
	ID          string     `json:"id"`
	Name        string     `json:"name"`
	Description string     `json:"description"`
	Image       string     `json:"image"`
	Tag         string     `json:"tag"`
	EnvVars     map[string]string `json:"env_vars"`
	Ports       []PortMapping     `json:"ports"`
	Volumes     []VolumeMount     `json:"volumes"`
	Resources   ResourceLimits    `json:"resources"`
	Status      AppStatus  `json:"status"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

type PortMapping struct {
	ContainerPort int    `json:"container_port"`
	HostPort      int    `json:"host_port"`
	Protocol      string `json:"protocol"` // tcp, udp
}

type VolumeMount struct {
	ContainerPath string `json:"container_path"`
	HostPath      string `json:"host_path"`
	ReadOnly      bool   `json:"read_only"`
}

type ResourceLimits struct {
	CPU    string `json:"cpu"`    // e.g., "0.5", "1000m"
	Memory string `json:"memory"` // e.g., "512M", "1G"
}

type Deployment struct {
	ID             string           `json:"id"`
	AppID          string           `json:"app_id"`
	AppName        string           `json:"app_name"`
	Image          string           `json:"image"`
	Tag            string           `json:"tag"`
	NodeIDs        []string         `json:"node_ids"`
	Strategy       DeploymentStrategy `json:"strategy"`
	CanaryPercentage int            `json:"canary_percentage,omitempty"`
	Status         DeploymentStatus `json:"status"`
	Progress       float64          `json:"progress"`
	PreviousTag    string           `json:"previous_tag,omitempty"`
	CreatedAt      time.Time        `json:"created_at"`
	UpdatedAt      time.Time        `json:"updated_at"`
	CompletedAt    *time.Time       `json:"completed_at,omitempty"`
}

type NodeDeploymentStatus struct {
	NodeID      string           `json:"node_id"`
	NodeName    string           `json:"node_name"`
	Status      DeploymentStatus `json:"status"`
	ContainerID string           `json:"container_id,omitempty"`
	Error       string           `json:"error,omitempty"`
	StartedAt   *time.Time       `json:"started_at,omitempty"`
	CompletedAt *time.Time       `json:"completed_at,omitempty"`
}
