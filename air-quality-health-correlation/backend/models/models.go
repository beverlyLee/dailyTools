package models

import (
	"time"

	"gorm.io/gorm"
)

type HealthRecord struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	Date        time.Time      `json:"date" gorm:"uniqueIndex;not null"`
	IsSick      bool           `json:"is_sick"`
	Symptoms    string         `json:"symptoms"`
	Severity    int            `json:"severity"`
	Notes       string         `json:"notes"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}

type AirQualityCache struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	Date        time.Time      `json:"date" gorm:"uniqueIndex:idx_location_date,priority:2;not null"`
	Location    string         `json:"location" gorm:"uniqueIndex:idx_location_date,priority:1;not null"`
	AQI         int            `json:"aqi"`
	PM25        float64        `json:"pm25"`
	PM10        float64        `json:"pm10"`
	O3          float64        `json:"o3"`
	NO2         float64        `json:"no2"`
	SO2         float64        `json:"so2"`
	CO          float64        `json:"co"`
	Level       string         `json:"level"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}

type HealthAirQualityCorrelation struct {
	Date          time.Time `json:"date"`
	IsSick        bool      `json:"is_sick"`
	Symptoms      string    `json:"symptoms"`
	Severity      int       `json:"severity"`
	AQI           int       `json:"aqi"`
	PM25          float64   `json:"pm25"`
	PM10          float64   `json:"pm10"`
	O3            float64   `json:"o3"`
	AirQualityLevel string  `json:"air_quality_level"`
}

type CorrelationAnalysisResult struct {
	TotalDays           int       `json:"total_days"`
	SickDays            int       `json:"sick_days"`
	HealthyDays         int       `json:"healthy_days"`
	AvgAQIWhenSick      float64   `json:"avg_aqi_when_sick"`
	AvgAQIWhenHealthy   float64   `json:"avg_aqi_when_healthy"`
	AvgPM25WhenSick     float64   `json:"avg_pm25_when_sick"`
	AvgPM25WhenHealthy  float64   `json:"avg_pm25_when_healthy"`
	CorrelationData     []HealthAirQualityCorrelation `json:"correlation_data"`
	HighAQISickDays     int       `json:"high_aqi_sick_days"`
	LowAQISickDays      int       `json:"low_aqi_sick_days"`
}
