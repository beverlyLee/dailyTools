package config

import (
	"log"

	"github.com/spf13/viper"
)

type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	Log      LogConfig
}

type ServerConfig struct {
	Port int
	Mode string
}

type DatabaseConfig struct {
	Host     string
	Port     int
	User     string
	Password string
	DBName   string
	SSLMode  string
}

type LogConfig struct {
	Level  string
	Format string
}

var AppConfig Config

func LoadConfig() {
	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	viper.AddConfigPath(".")
	viper.AddConfigPath("./..")

	if err := viper.ReadInConfig(); err != nil {
		log.Printf("Warning: Could not read config file, using defaults: %v", err)
	}

	if err := viper.Unmarshal(&AppConfig); err != nil {
		log.Fatalf("Unable to decode config into struct: %v", err)
	}

	setDefaults()
}

func setDefaults() {
	if AppConfig.Server.Port == 0 {
		AppConfig.Server.Port = 8080
	}
	if AppConfig.Server.Mode == "" {
		AppConfig.Server.Mode = "debug"
	}
}
