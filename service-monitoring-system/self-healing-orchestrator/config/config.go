package config

import (
	"os"
	"strconv"

	"gopkg.in/yaml.v3"
)

type Config struct {
	Server    ServerConfig
	Scenarios ScenariosConfig
	Scripts   ScriptsConfig
	Approval  ApprovalConfig
	GrayScale GrayScaleConfig
	Records   RecordsConfig
}

type ServerConfig struct {
	Port string
}

type ScenariosConfig struct {
	Definitions []ScenarioDefinition
}

type ScenarioDefinition struct {
	ID          string
	Name        string
	Description string
	Severity    string
	Threshold   float64
	ScriptID    string
	Conditions  []Condition
	AutoRecover bool
}

type Condition struct {
	Type     string
	Metric   string
	Operator string
	Value    float64
}

type ScriptsConfig struct {
	Directory string
	Timeout   int
	Scripts   []ScriptDefinition
}

type ScriptDefinition struct {
	ID      string
	Name    string
	Type    string
	Path    string
	Timeout int
	Args    []string
	Env     map[string]string
}

type ApprovalConfig struct {
	Enabled        bool
	RequireAdmin   bool
	Approvers      []string
	TimeoutMinutes int
}

type GrayScaleConfig struct {
	Enabled       bool
	Percentage    int
	InstanceGroups []string
	RolloutDelay  int
}

type RecordsConfig struct {
	RetentionDays int
	MaxRecords    int
	OutputFormat  string
}

func Load() (*Config, error) {
	configPath := os.Getenv("CONFIG_PATH")
	if configPath == "" {
		configPath = "./config/config.yaml"
	}

	if _, err := os.Stat(configPath); err == nil {
		return loadFromFile(configPath)
	}

	return loadFromEnv(), nil
}

func loadFromFile(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var cfg Config
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, err
	}

	setDefaults(&cfg)
	return &cfg, nil
}

func loadFromEnv() *Config {
	cfg := &Config{
		Server: ServerConfig{
			Port: getEnv("ORCHESTRATOR_PORT", "9200"),
		},
		Scenarios: ScenariosConfig{
			Definitions: []ScenarioDefinition{
				{
					ID:          "cpu_high",
					Name:        "CPU使用率过高",
					Description: "CPU使用率超过80%持续5分钟",
					Severity:    "high",
					Threshold:   80.0,
					ScriptID:    "restart_service",
					Conditions: []Condition{
						{Type: "metric", Metric: "cpu_usage", Operator: ">", Value: 80.0},
					},
					AutoRecover: true,
				},
				{
					ID:          "memory_high",
					Name:        "内存使用率过高",
					Description: "内存使用率超过85%持续5分钟",
					Severity:    "medium",
					Threshold:   85.0,
					ScriptID:    "clear_cache",
					Conditions: []Condition{
						{Type: "metric", Metric: "memory_usage", Operator: ">", Value: 85.0},
					},
					AutoRecover: true,
				},
				{
					ID:          "service_down",
					Name:        "服务宕机",
					Description: "服务状态异常或不可达",
					Severity:    "critical",
					Threshold:   0.0,
					ScriptID:    "restart_service",
					Conditions: []Condition{
						{Type: "probe", Metric: "service_status", Operator: "==", Value: 0.0},
					},
					AutoRecover: false,
				},
				{
					ID:          "http_probe_failed",
					Name:        "HTTP探测失败",
					Description: "HTTP黑盒探测连续失败",
					Severity:    "high",
					Threshold:   0.0,
					ScriptID:    "check_network",
					Conditions: []Condition{
						{Type: "probe", Metric: "http_probe_status", Operator: "==", Value: 0.0},
					},
					AutoRecover: true,
				},
				{
					ID:          "tcp_probe_failed",
					Name:        "TCP探测失败",
					Description: "TCP黑盒探测连续失败",
					Severity:    "high",
					Threshold:   0.0,
					ScriptID:    "check_network",
					Conditions: []Condition{
						{Type: "probe", Metric: "tcp_probe_status", Operator: "==", Value: 0.0},
					},
					AutoRecover: true,
				},
			},
		},
		Scripts: ScriptsConfig{
			Directory: getEnv("SCRIPTS_DIR", "./scripts"),
			Timeout:   getEnvInt("SCRIPT_TIMEOUT", 60),
			Scripts: []ScriptDefinition{
				{
					ID:      "restart_service",
					Name:    "重启服务",
					Type:    "shell",
					Path:    "./scripts/restart-service.sh",
					Timeout: 60,
					Args:    []string{"api-gateway"},
					Env:     map[string]string{"LOG_LEVEL": "info"},
				},
				{
					ID:      "clear_cache",
					Name:    "清理系统缓存",
					Type:    "shell",
					Path:    "./scripts/clear-cache.sh",
					Timeout: 30,
					Args:    []string{},
					Env:     map[string]string{},
				},
				{
					ID:      "check_network",
					Name:    "检查网络连接",
					Type:    "python",
					Path:    "./scripts/check-network.py",
					Timeout: 30,
					Args:    []string{"--verbose"},
					Env:     map[string]string{"PYTHONPATH": "/usr/local/lib/python3.9/site-packages"},
				},
				{
					ID:      "scale_up",
					Name:    "服务扩容",
					Type:    "python",
					Path:    "./scripts/scale-up.py",
					Timeout: 120,
					Args:    []string{"--replicas", "3"},
					Env:     map[string]string{"KUBECONFIG": "/root/.kube/config"},
				},
			},
		},
		Approval: ApprovalConfig{
			Enabled:        getEnvBool("APPROVAL_ENABLED", true),
			RequireAdmin:   getEnvBool("APPROVAL_REQUIRE_ADMIN", false),
			Approvers:      []string{"admin", "ops-team"},
			TimeoutMinutes: getEnvInt("APPROVAL_TIMEOUT", 30),
		},
		GrayScale: GrayScaleConfig{
			Enabled:       getEnvBool("GRAYSCALE_ENABLED", false),
			Percentage:    getEnvInt("GRAYSCALE_PERCENTAGE", 20),
			InstanceGroups: []string{"group-a", "group-b"},
			RolloutDelay:  getEnvInt("GRAYSCALE_DELAY", 300),
		},
		Records: RecordsConfig{
			RetentionDays: getEnvInt("RECORDS_RETENTION_DAYS", 30),
			MaxRecords:    getEnvInt("RECORDS_MAX", 10000),
			OutputFormat:  getEnv("RECORDS_FORMAT", "json"),
		},
	}
	return cfg
}

func setDefaults(cfg *Config) {
	if cfg.Server.Port == "" {
		cfg.Server.Port = "9200"
	}
	if cfg.Scripts.Directory == "" {
		cfg.Scripts.Directory = "./scripts"
	}
	if cfg.Scripts.Timeout == 0 {
		cfg.Scripts.Timeout = 60
	}
	if cfg.Approval.TimeoutMinutes == 0 {
		cfg.Approval.TimeoutMinutes = 30
	}
	if cfg.GrayScale.Percentage == 0 {
		cfg.GrayScale.Percentage = 20
	}
	if cfg.GrayScale.RolloutDelay == 0 {
		cfg.GrayScale.RolloutDelay = 300
	}
	if cfg.Records.RetentionDays == 0 {
		cfg.Records.RetentionDays = 30
	}
	if cfg.Records.MaxRecords == 0 {
		cfg.Records.MaxRecords = 10000
	}
	if cfg.Records.OutputFormat == "" {
		cfg.Records.OutputFormat = "json"
	}
}

func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value, exists := os.LookupEnv(key); exists {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

func getEnvBool(key string, defaultValue bool) bool {
	if value, exists := os.LookupEnv(key); exists {
		if boolValue, err := strconv.ParseBool(value); err == nil {
			return boolValue
		}
	}
	return defaultValue
}
