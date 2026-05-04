package services

import (
	"testing"
	"time"
)

func TestCalculateStatistics(t *testing.T) {
	service := NewCorrelationService()

	tests := []struct {
		name           string
		data           []HealthAirQualityCorrelation
		expectedResult CorrelationAnalysisResult
	}{
		{
			name: "Test with sick days having higher AQI",
			data: []HealthAirQualityCorrelation{
				{Date: time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC), IsSick: true, AQI: 120, PM25: 85},
				{Date: time.Date(2024, 1, 2, 0, 0, 0, 0, time.UTC), IsSick: true, AQI: 150, PM25: 110},
				{Date: time.Date(2024, 1, 3, 0, 0, 0, 0, time.UTC), IsSick: false, AQI: 50, PM25: 25},
				{Date: time.Date(2024, 1, 4, 0, 0, 0, 0, time.UTC), IsSick: false, AQI: 45, PM25: 20},
			},
			expectedResult: CorrelationAnalysisResult{
				TotalDays:         4,
				SickDays:          2,
				HealthyDays:       2,
				AvgAQIWhenSick:    135.0,
				AvgAQIWhenHealthy: 47.5,
				AvgPM25WhenSick:   97.5,
				AvgPM25WhenHealthy: 22.5,
				HighAQISickDays:   2,
				LowAQISickDays:    0,
			},
		},
		{
			name: "Test with mixed AQI boundary values",
			data: []HealthAirQualityCorrelation{
				{Date: time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC), IsSick: true, AQI: 99, PM25: 60},
				{Date: time.Date(2024, 1, 2, 0, 0, 0, 0, time.UTC), IsSick: true, AQI: 100, PM25: 70},
				{Date: time.Date(2024, 1, 3, 0, 0, 0, 0, time.UTC), IsSick: false, AQI: 50, PM25: 25},
			},
			expectedResult: CorrelationAnalysisResult{
				TotalDays:         3,
				SickDays:          2,
				HealthyDays:       1,
				AvgAQIWhenSick:    99.5,
				AvgAQIWhenHealthy: 50.0,
				AvgPM25WhenSick:   65.0,
				AvgPM25WhenHealthy: 25.0,
				HighAQISickDays:   1,
				LowAQISickDays:    1,
			},
		},
		{
			name: "Test with missing AQI data",
			data: []HealthAirQualityCorrelation{
				{Date: time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC), IsSick: true, AQI: 0, PM25: 0},
				{Date: time.Date(2024, 1, 2, 0, 0, 0, 0, time.UTC), IsSick: true, AQI: 120, PM25: 85},
				{Date: time.Date(2024, 1, 3, 0, 0, 0, 0, time.UTC), IsSick: false, AQI: 50, PM25: 25},
			},
			expectedResult: CorrelationAnalysisResult{
				TotalDays:         3,
				SickDays:          2,
				HealthyDays:       1,
				AvgAQIWhenSick:    120.0,
				AvgAQIWhenHealthy: 50.0,
				AvgPM25WhenSick:   85.0,
				AvgPM25WhenHealthy: 25.0,
				HighAQISickDays:   1,
				LowAQISickDays:    0,
			},
		},
		{
			name: "Test with empty data",
			data: []HealthAirQualityCorrelation{},
			expectedResult: CorrelationAnalysisResult{
				TotalDays:         0,
				SickDays:          0,
				HealthyDays:       0,
				AvgAQIWhenSick:    0.0,
				AvgAQIWhenHealthy: 0.0,
				AvgPM25WhenSick:   0.0,
				AvgPM25WhenHealthy: 0.0,
				HighAQISickDays:   0,
				LowAQISickDays:    0,
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := service.calculateStatistics(tt.data)

			if result.TotalDays != tt.expectedResult.TotalDays {
				t.Errorf("TotalDays: expected %d, got %d", tt.expectedResult.TotalDays, result.TotalDays)
			}

			if result.SickDays != tt.expectedResult.SickDays {
				t.Errorf("SickDays: expected %d, got %d", tt.expectedResult.SickDays, result.SickDays)
			}

			if result.HealthyDays != tt.expectedResult.HealthyDays {
				t.Errorf("HealthyDays: expected %d, got %d", tt.expectedResult.HealthyDays, result.HealthyDays)
			}

			if result.AvgAQIWhenSick != tt.expectedResult.AvgAQIWhenSick {
				t.Errorf("AvgAQIWhenSick: expected %f, got %f", tt.expectedResult.AvgAQIWhenSick, result.AvgAQIWhenSick)
			}

			if result.AvgAQIWhenHealthy != tt.expectedResult.AvgAQIWhenHealthy {
				t.Errorf("AvgAQIWhenHealthy: expected %f, got %f", tt.expectedResult.AvgAQIWhenHealthy, result.AvgAQIWhenHealthy)
			}

			if result.AvgPM25WhenSick != tt.expectedResult.AvgPM25WhenSick {
				t.Errorf("AvgPM25WhenSick: expected %f, got %f", tt.expectedResult.AvgPM25WhenSick, result.AvgPM25WhenSick)
			}

			if result.AvgPM25WhenHealthy != tt.expectedResult.AvgPM25WhenHealthy {
				t.Errorf("AvgPM25WhenHealthy: expected %f, got %f", tt.expectedResult.AvgPM25WhenHealthy, result.AvgPM25WhenHealthy)
			}

			if result.HighAQISickDays != tt.expectedResult.HighAQISickDays {
				t.Errorf("HighAQISickDays: expected %d, got %d", tt.expectedResult.HighAQISickDays, result.HighAQISickDays)
			}

			if result.LowAQISickDays != tt.expectedResult.LowAQISickDays {
				t.Errorf("LowAQISickDays: expected %d, got %d", tt.expectedResult.LowAQISickDays, result.LowAQISickDays)
			}
		})
	}
}

func TestJoinMockData(t *testing.T) {
	service := NewCorrelationService()

	healthRecords := generateMockHealthRecords()
	airQualityData := generateMockAirQualityData("101010100")

	correlationData := service.joinMockData(healthRecords, airQualityData)

	if len(correlationData) != 30 {
		t.Errorf("Expected 30 correlation records, got %d", len(correlationData))
	}

	sickDaysCount := 0
	for _, item := range correlationData {
		if item.IsSick {
			sickDaysCount++
		}
		if item.AQI == 0 {
			t.Errorf("Expected AQI > 0 for all records, got 0 on %v", item.Date)
		}
	}

	if sickDaysCount != 5 {
		t.Errorf("Expected 5 sick days, got %d", sickDaysCount)
	}

	isSorted := true
	for i := 1; i < len(correlationData); i++ {
		if correlationData[i].Date.Before(correlationData[i-1].Date) {
			isSorted = false
			break
		}
	}

	if !isSorted {
		t.Error("Correlation data should be sorted by date")
	}
}
