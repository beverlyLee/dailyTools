package config

import "os"

type Config struct {
	Port         string
	ReadBuffer   int
	WriteBuffer  int
}

func Load() *Config {
	return &Config{
		Port:         getEnv("PORT", "8080"),
		ReadBuffer:   1024 * 4,
		WriteBuffer:  1024 * 4,
	}
}

func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}
