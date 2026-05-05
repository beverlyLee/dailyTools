package config

import (
	"fmt"

	"github.com/spf13/viper"
)

type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	Redis    RedisConfig
	Envoy    EnvoyConfig
	Logging  LoggingConfig
}

type ServerConfig struct {
	Port int
	Mode string
}

type DatabaseConfig struct {
	Type string
	File string
}

type RedisConfig struct {
	Host     string
	Port     int
	Password string
	DB       int
}

type EnvoyConfig struct {
	XDSPort        int
	ControlPlaneID string
}

type LoggingConfig struct {
	Level  string
	Format string
}

var AppConfig *Config

func Load() error {
	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	viper.AddConfigPath(".")
	viper.AddConfigPath("./config")
	viper.AddConfigPath("/etc/governance")

	viper.AutomaticEnv()

	if err := viper.ReadInConfig(); err != nil {
		return fmt.Errorf("failed to read config file: %w", err)
	}

	AppConfig = &Config{
		Server: ServerConfig{
			Port: viper.GetInt("server.port"),
			Mode: viper.GetString("server.mode"),
		},
		Database: DatabaseConfig{
			Type: viper.GetString("database.type"),
			File: viper.GetString("database.file"),
		},
		Redis: RedisConfig{
			Host:     viper.GetString("redis.host"),
			Port:     viper.GetInt("redis.port"),
			Password: viper.GetString("redis.password"),
			DB:       viper.GetInt("redis.db"),
		},
		Envoy: EnvoyConfig{
			XDSPort:        viper.GetInt("envoy.xds_port"),
			ControlPlaneID: viper.GetString("envoy.control_plane_id"),
		},
		Logging: LoggingConfig{
			Level:  viper.GetString("logging.level"),
			Format: viper.GetString("logging.format"),
		},
	}

	return nil
}
