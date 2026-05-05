package config

import (
	"os"
	"strconv"

	"gopkg.in/yaml.v3"
)

type Config struct {
	Server     ServerConfig
	Prometheus PrometheusConfig
	Exporter   ExporterConfig
	Blackbox   BlackboxConfig
}

type ServerConfig struct {
	Port string
}

type PrometheusConfig struct {
	ScrapeInterval int
	Namespace      string
}

type ExporterConfig struct {
	Enabled        bool
	CollectInterval int
	Metrics        []MetricConfig
}

type MetricConfig struct {
	Name        string
	Description string
	Type        string
	Labels      []string
}

type BlackboxConfig struct {
	Enabled        bool
	ProbeInterval  int
	Modules        map[string]ModuleConfig
	Targets        []TargetConfig
}

type ModuleConfig struct {
	Prober  string
	Timeout int
	HTTP    HTTPModuleConfig
	TCP     TCPModuleConfig
}

type HTTPModuleConfig struct {
	Method          string
	Headers         map[string]string
	ValidStatusCodes []int
	FailIfSSL       bool
}

type TCPModuleConfig struct {
	QueryResponse []QueryResponse
}

type QueryResponse struct {
	Expect string
	Send   string
}

type TargetConfig struct {
	Name   string
	Target string
	Module string
	Labels map[string]string
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
			Port: getEnv("PROBE_PORT", "9100"),
		},
		Prometheus: PrometheusConfig{
			ScrapeInterval: getEnvInt("SCRAPE_INTERVAL", 30),
			Namespace:      getEnv("METRICS_NAMESPACE", "monitoring"),
		},
		Exporter: ExporterConfig{
			Enabled:        getEnvBool("EXPORTER_ENABLED", true),
			CollectInterval: getEnvInt("EXPORTER_INTERVAL", 60),
			Metrics: []MetricConfig{
				{
					Name:        "business_transactions_total",
					Description: "Total number of business transactions",
					Type:        "counter",
					Labels:      []string{"service", "status"},
				},
				{
					Name:        "business_response_time_seconds",
					Description: "Business response time in seconds",
					Type:        "histogram",
					Labels:      []string{"service", "endpoint"},
				},
				{
					Name:        "business_active_users",
					Description: "Number of active users",
					Type:        "gauge",
					Labels:      []string{"service"},
				},
			},
		},
		Blackbox: BlackboxConfig{
			Enabled:       getEnvBool("BLACKBOX_ENABLED", true),
			ProbeInterval: getEnvInt("PROBE_INTERVAL", 30),
			Modules: map[string]ModuleConfig{
				"http_2xx": {
					Prober:  "http",
					Timeout: 10,
					HTTP: HTTPModuleConfig{
						Method:          "GET",
						ValidStatusCodes: []int{200, 201, 202, 204},
					},
				},
				"tcp_connect": {
					Prober:  "tcp",
					Timeout: 5,
				},
			},
			Targets: []TargetConfig{
				{
					Name:   "example_http",
					Target: "http://example.com",
					Module: "http_2xx",
					Labels: map[string]string{"env": "production"},
				},
				{
					Name:   "example_tcp",
					Target: "example.com:80",
					Module: "tcp_connect",
					Labels: map[string]string{"env": "production"},
				},
			},
		},
	}
	return cfg
}

func setDefaults(cfg *Config) {
	if cfg.Server.Port == "" {
		cfg.Server.Port = "9100"
	}
	if cfg.Prometheus.ScrapeInterval == 0 {
		cfg.Prometheus.ScrapeInterval = 30
	}
	if cfg.Prometheus.Namespace == "" {
		cfg.Prometheus.Namespace = "monitoring"
	}
	if cfg.Exporter.CollectInterval == 0 {
		cfg.Exporter.CollectInterval = 60
	}
	if cfg.Blackbox.ProbeInterval == 0 {
		cfg.Blackbox.ProbeInterval = 30
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
