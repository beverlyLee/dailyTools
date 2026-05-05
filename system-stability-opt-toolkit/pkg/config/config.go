package config

import (
	"encoding/json"
	"fmt"
	"os"
	"time"

	"system-stability-opt-toolkit/internal/dboptimizer"
	"system-stability-opt-toolkit/internal/llm"
	"system-stability-opt-toolkit/internal/monitoring"
)

type Config struct {
	Server      ServerConfig      `json:"server"`
	LLM         llm.Config        `json:"llm"`
	Monitoring  monitoring.Config `json:"monitoring"`
	Database    dboptimizer.Config `json:"database"`
	Chaos       ChaosConfig       `json:"chaos"`
	Logging     LoggingConfig     `json:"logging"`
}

type ServerConfig struct {
	Host         string        `json:"host"`
	Port         int           `json:"port"`
	ReadTimeout  time.Duration `json:"read_timeout"`
	WriteTimeout time.Duration `json:"write_timeout"`
	IdleTimeout  time.Duration `json:"idle_timeout"`
}

type ChaosConfig struct {
	DefaultDuration  time.Duration `json:"default_duration"`
	DefaultInterval  time.Duration `json:"default_interval"`
	AutoRollback     bool          `json:"auto_rollback"`
	RollbackThreshold RollbackThresholdConfig `json:"rollback_threshold"`
}

type RollbackThresholdConfig struct {
	ErrorRate   float64 `json:"error_rate"`
	LatencyP99  float64 `json:"latency_p99_ms"`
	QPSDropRate float64 `json:"qps_drop_rate"`
}

type LoggingConfig struct {
	Level  string `json:"level"`
	Format string `json:"format"`
	Output string `json:"output"`
}

func LoadConfig(configPath string) (*Config, error) {
	file, err := os.ReadFile(configPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read config file: %w", err)
	}

	var config Config
	if err := json.Unmarshal(file, &config); err != nil {
		return nil, fmt.Errorf("failed to parse config file: %w", err)
	}

	setDefaults(&config)

	return &config, nil
}

func setDefaults(config *Config) {
	if config.Server.Host == "" {
		config.Server.Host = "0.0.0.0"
	}
	if config.Server.Port == 0 {
		config.Server.Port = 8080
	}
	if config.Server.ReadTimeout == 0 {
		config.Server.ReadTimeout = 30 * time.Second
	}
	if config.Server.WriteTimeout == 0 {
		config.Server.WriteTimeout = 30 * time.Second
	}
	if config.Server.IdleTimeout == 0 {
		config.Server.IdleTimeout = 60 * time.Second
	}

	if config.Chaos.DefaultDuration == 0 {
		config.Chaos.DefaultDuration = 10 * time.Minute
	}
	if config.Chaos.DefaultInterval == 0 {
		config.Chaos.DefaultInterval = 10 * time.Second
	}

	if config.Chaos.RollbackThreshold.ErrorRate == 0 {
		config.Chaos.RollbackThreshold.ErrorRate = 0.05
	}
	if config.Chaos.RollbackThreshold.LatencyP99 == 0 {
		config.Chaos.RollbackThreshold.LatencyP99 = 500
	}
	if config.Chaos.RollbackThreshold.QPSDropRate == 0 {
		config.Chaos.RollbackThreshold.QPSDropRate = 0.3
	}

	if config.Logging.Level == "" {
		config.Logging.Level = "info"
	}
	if config.Logging.Format == "" {
		config.Logging.Format = "json"
	}
	if config.Logging.Output == "" {
		config.Logging.Output = "stdout"
	}

	if config.LLM.Timeout == 0 {
		config.LLM.Timeout = 60 * time.Second
	}
	if config.LLM.MaxTokens == 0 {
		config.LLM.MaxTokens = 4000
	}
	if config.LLM.Temperature == 0 {
		config.LLM.Temperature = 0.3
	}

	if config.Database.Timeout == 0 {
		config.Database.Timeout = 30 * time.Second
	}
	if config.Database.MaxRetries == 0 {
		config.Database.MaxRetries = 3
	}
}

func LoadConfigFromEnv() (*Config, error) {
	config := &Config{}

	if host := os.Getenv("SERVER_HOST"); host != "" {
		config.Server.Host = host
	}
	if port := os.Getenv("SERVER_PORT"); port != "" {
		var p int
		if _, err := fmt.Sscanf(port, "%d", &p); err == nil {
			config.Server.Port = p
		}
	}

	if apiKey := os.Getenv("LLM_API_KEY"); apiKey != "" {
		config.LLM.APIKey = apiKey
	}
	if model := os.Getenv("LLM_MODEL"); model != "" {
		config.LLM.Model = model
	}
	if baseURL := os.Getenv("LLM_BASE_URL"); baseURL != "" {
		config.LLM.BaseURL = baseURL
	}

	if prometheusAddr := os.Getenv("PROMETHEUS_ADDRESS"); prometheusAddr != "" {
		config.Monitoring.Type = monitoring.MetricsTypePrometheus
		if config.Monitoring.Prometheus == nil {
			config.Monitoring.Prometheus = &monitoring.PrometheusConfig{}
		}
		config.Monitoring.Prometheus.Address = prometheusAddr
	}

	if dbHost := os.Getenv("DB_HOST"); dbHost != "" {
		config.Database.Host = dbHost
	}
	if dbPort := os.Getenv("DB_PORT"); dbPort != "" {
		var p int
		if _, err := fmt.Sscanf(dbPort, "%d", &p); err == nil {
			config.Database.Port = p
		}
	}
	if dbUser := os.Getenv("DB_USER"); dbUser != "" {
		config.Database.User = dbUser
	}
	if dbPass := os.Getenv("DB_PASSWORD"); dbPass != "" {
		config.Database.Password = dbPass
	}
	if dbName := os.Getenv("DB_NAME"); dbName != "" {
		config.Database.Database = dbName
	}

	setDefaults(config)
	return config, nil
}

func (c *Config) Save(configPath string) error {
	data, err := json.MarshalIndent(c, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal config: %w", err)
	}

	if err := os.WriteFile(configPath, data, 0644); err != nil {
		return fmt.Errorf("failed to write config file: %w", err)
	}

	return nil
}

func DefaultConfig() *Config {
	config := &Config{}
	setDefaults(config)
	return config
}
