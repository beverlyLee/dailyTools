package models

import (
	"time"
)

type NodeStatus string

const (
	NodeStatusOnline    NodeStatus = "online"
	NodeStatusOffline   NodeStatus = "offline"
	NodeStatusWarning   NodeStatus = "warning"
	NodeStatusCritical  NodeStatus = "critical"
)

type Node struct {
	ID          string     `json:"id"`
	Name        string     `json:"name"`
	Description string     `json:"description"`
	IPAddress   string     `json:"ip_address"`
	SSHPort     int        `json:"ssh_port"`
	SSHUser     string     `json:"ssh_user"`
	SSHKeyPath  string     `json:"ssh_key_path,omitempty"`
	Location    Location   `json:"location"`
	Status      NodeStatus `json:"status"`
	Tags        []string   `json:"tags"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

type Location struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
	City      string  `json:"city"`
	Country   string  `json:"country"`
	Region    string  `json:"region"`
}

type NodeStats struct {
	CPUUsage      float64 `json:"cpu_usage"`
	MemoryUsage   float64 `json:"memory_usage"`
	MemoryTotal   float64 `json:"memory_total"`
	MemoryUsed    float64 `json:"memory_used"`
	DiskUsage     float64 `json:"disk_usage"`
	DiskTotal     float64 `json:"disk_total"`
	DiskUsed      float64 `json:"disk_used"`
	Temperature   float64 `json:"temperature"`
	NetworkIn     float64 `json:"network_in"`
	NetworkOut    float64 `json:"network_out"`
	LastUpdated   time.Time `json:"last_updated"`
}

type NodeMetrics struct {
	NodeID    string                 `json:"node_id"`
	Timestamp time.Time              `json:"timestamp"`
	Metrics   map[string]interface{} `json:"metrics"`
}
