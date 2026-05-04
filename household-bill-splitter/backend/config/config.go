package config

type Config struct {
	ServerPort string
	DBPath     string
	OCRService OCRConfig
}

type OCRConfig struct {
	Endpoint string
	APIKey   string
}

func Load() *Config {
	return &Config{
		ServerPort: ":8080",
		DBPath:     "./household.db",
		OCRService: OCRConfig{
			Endpoint: "http://localhost:5000/ocr",
			APIKey:   "",
		},
	}
}
