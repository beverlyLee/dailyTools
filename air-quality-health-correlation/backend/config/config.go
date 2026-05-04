package config

import (
	"os"
)

type Config struct {
	Port           string
	DatabasePath   string
	QweatherAPIKey string
	QweatherURL    string
}

var AppConfig *Config

func InitConfig() {
	AppConfig = &Config{
		Port:           getEnv("PORT", "8080"),
		DatabasePath:   getEnv("DATABASE_PATH", "./air_quality.db"),
		QweatherAPIKey: getEnv("QWEATHER_API_KEY", ""),
		QweatherURL:    getEnv("QWEATHER_URL", "https://devapi.qweather.com"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
