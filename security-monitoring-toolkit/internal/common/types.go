package common

import (
	"time"
)

type SeverityLevel string

const (
	SeverityLow    SeverityLevel = "low"
	SeverityMedium SeverityLevel = "medium"
	SeverityHigh   SeverityLevel = "high"
	SeverityCritical SeverityLevel = "critical"
)

type Finding struct {
	ID          string        `json:"id"`
	Type        string        `json:"type"`
	Severity    SeverityLevel `json:"severity"`
	Description string        `json:"description"`
	FilePath    string        `json:"file_path"`
	LineNumber  int           `json:"line_number"`
	LineContent string        `json:"line_content"`
	RuleName    string        `json:"rule_name"`
	Context     string        `json:"context,omitempty"`
}

type ScanReport struct {
	ScanID      string        `json:"scan_id"`
	StartTime   time.Time     `json:"start_time"`
	EndTime     time.Time     `json:"end_time"`
	TargetPath  string        `json:"target_path"`
	TotalFiles  int           `json:"total_files"`
	ScannedFiles int          `json:"scanned_files"`
	Findings    []Finding     `json:"findings"`
	SeverityCounts map[SeverityLevel]int `json:"severity_counts"`
	IgnoredFiles []string     `json:"ignored_files,omitempty"`
}

type LogEntry struct {
	Timestamp   time.Time              `json:"timestamp"`
	RawMessage  string                 `json:"raw_message"`
	Level       string                 `json:"level,omitempty"`
	Source      string                 `json:"source,omitempty"`
	Fields      map[string]interface{} `json:"fields,omitempty"`
}

type LogPattern struct {
	PatternID      string            `json:"pattern_id"`
	Template       string            `json:"template"`
	ParameterCount int               `json:"parameter_count"`
	Occurrences    int               `json:"occurrences"`
	FirstSeen      time.Time         `json:"first_seen"`
	LastSeen       time.Time         `json:"last_seen"`
	Frequency      float64           `json:"frequency"`
	ExampleEntries []LogEntrySample  `json:"example_entries,omitempty"`
}

type LogEntrySample struct {
	RawMessage string    `json:"raw_message"`
	Timestamp  time.Time `json:"timestamp"`
}

type AnomalyScore struct {
	Score       float64   `json:"score"`
	Description string    `json:"description"`
	Reason      string    `json:"reason"`
	Confidence  float64   `json:"confidence"`
}

type AnomalyAlert struct {
	AlertID     string        `json:"alert_id"`
	Timestamp   time.Time     `json:"timestamp"`
	Type        string        `json:"type"`
	Severity    SeverityLevel `json:"severity"`
	Title       string        `json:"title"`
	Description string        `json:"description"`
	Entries     []LogEntry    `json:"entries,omitempty"`
	Scores      []AnomalyScore `json:"scores"`
	Context     map[string]interface{} `json:"context,omitempty"`
}

type AlertConfig struct {
	SlackWebhook string `json:"slack_webhook,omitempty"`
	WebhookURL   string `json:"webhook_url,omitempty"`
	Threshold    float64 `json:"threshold"`
	Enabled      bool    `json:"enabled"`
}

type DashboardConfig struct {
	Port         int  `json:"port"`
	EnableAuth   bool `json:"enable_auth"`
	Username     string `json:"username,omitempty"`
	Password     string `json:"password,omitempty"`
}
