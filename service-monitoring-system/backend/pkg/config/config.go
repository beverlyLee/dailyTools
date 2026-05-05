package config

import (
	"os"
	"strconv"
)

type Config struct {
	Server    ServerConfig
	Monitoring MonitoringConfig
	SelfHealing SelfHealingConfig
}

type ServerConfig struct {
	Port string
}

type MonitoringConfig struct {
	PrometheusEndpoint string
	ScrapeInterval     int
	BlackboxTargets    []BlackboxTarget
}

type BlackboxTarget struct {
	Name string
	URL  string
	Type string
}

type SelfHealingConfig struct {
	ScriptsDir     string
	GrayScale      bool
	ApprovalNeeded bool
}

func Load() (*Config, error) {
	port := getEnv("SERVER_PORT", "8080")
	scrapeInterval, _ := strconv.Atoi(getEnv("SCRAPE_INTERVAL", "30"))
	grayScale, _ := strconv.ParseBool(getEnv("GRAYSCALE", "false"))
	approvalNeeded, _ := strconv.ParseBool(getEnv("APPROVAL_NEEDED", "true"))

	return &Config{
		Server: ServerConfig{
			Port: port,
		},
		Monitoring: MonitoringConfig{
			PrometheusEndpoint: getEnv("PROMETHEUS_ENDPOINT", "/metrics"),
			ScrapeInterval:     scrapeInterval,
			BlackboxTargets:    []BlackboxTarget{
				{Name: "example-http", URL: "http://example.com", Type: "http"},
				{Name: "example-tcp", URL: "example.com:80", Type: "tcp"},
			},
		},
		SelfHealing: SelfHealingConfig{
			ScriptsDir:     getEnv("SCRIPTS_DIR", "./scripts"),
			GrayScale:      grayScale,
			ApprovalNeeded: approvalNeeded,
		},
	}, nil
}

func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}
