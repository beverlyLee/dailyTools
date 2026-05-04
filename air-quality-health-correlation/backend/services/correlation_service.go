package services

import (
	"sort"
	"time"

	// "air-quality-health-correlation/database"
	"air-quality-health-correlation/models"
)

type CorrelationService struct {
	healthService     *HealthService
	airQualityService *AirQualityService
}

func NewCorrelationService() *CorrelationService {
	return &CorrelationService{
		healthService:     NewHealthService(),
		airQualityService: NewAirQualityService(),
	}
}

func (s *CorrelationService) AnalyzeCorrelation(location string, startDate, endDate time.Time) (*models.CorrelationAnalysisResult, error) {
	healthRecords, err := s.healthService.GetHealthRecordsByDateRange(startDate, endDate)
	if err != nil {
		return nil, err
	}

	if len(healthRecords) == 0 {
		return &models.CorrelationAnalysisResult{
			TotalDays:       0,
			SickDays:        0,
			HealthyDays:     0,
			CorrelationData: []models.HealthAirQualityCorrelation{},
		}, nil
	}

	correlationData, err := s.joinHealthAndAirQualityData(healthRecords, location)
	if err != nil {
		return nil, err
	}

	result := s.calculateStatistics(correlationData)
	result.CorrelationData = correlationData

	return result, nil
}

func (s *CorrelationService) joinHealthAndAirQualityData(healthRecords []models.HealthRecord, location string) ([]models.HealthAirQualityCorrelation, error) {
	var correlationData []models.HealthAirQualityCorrelation

	dateRecords := make(map[time.Time]models.HealthRecord)
	var dates []time.Time

	for _, record := range healthRecords {
		date := record.Date.Truncate(24 * time.Hour)
		dateRecords[date] = record
		dates = append(dates, date)
	}

	sort.Slice(dates, func(i, j int) bool {
		return dates[i].Before(dates[j])
	})

	airQualityData, err := s.getAirQualityDataForDates(dates, location)
	if err != nil {
		return nil, err
	}

	for _, date := range dates {
		healthRecord := dateRecords[date]
		airQuality := airQualityData[date]

		correlation := models.HealthAirQualityCorrelation{
			Date:     date,
			IsSick:   healthRecord.IsSick,
			Symptoms: healthRecord.Symptoms,
			Severity: healthRecord.Severity,
		}

		if airQuality != nil {
			correlation.AQI = airQuality.AQI
			correlation.PM25 = airQuality.PM25
			correlation.PM10 = airQuality.PM10
			correlation.O3 = airQuality.O3
			correlation.AirQualityLevel = airQuality.Level
		}

		correlationData = append(correlationData, correlation)
	}

	return correlationData, nil
}

func (s *CorrelationService) getAirQualityDataForDates(dates []time.Time, location string) (map[time.Time]*models.AirQualityCache, error) {
	result := make(map[time.Time]*models.AirQualityCache)

	for _, date := range dates {
		airQuality, err := s.airQualityService.GetAirQualityByDate(location, date)
		if err == nil {
			result[date] = airQuality
		}
	}

	return result, nil
}

func (s *CorrelationService) calculateStatistics(data []models.HealthAirQualityCorrelation) *models.CorrelationAnalysisResult {
	result := &models.CorrelationAnalysisResult{
		TotalDays:       len(data),
		CorrelationData: data,
	}

	var sickDaysAQITotal, sickDaysPM25Total float64
	var healthyDaysAQITotal, healthyDaysPM25Total float64
	var sickDaysCount, healthyDaysCount int

	const highAqiThreshold = 100

	for _, item := range data {
		if item.IsSick {
			result.SickDays++
			if item.AQI > 0 {
				sickDaysAQITotal += float64(item.AQI)
				sickDaysPM25Total += item.PM25
				sickDaysCount++

				if item.AQI >= highAqiThreshold {
					result.HighAQISickDays++
				} else {
					result.LowAQISickDays++
				}
			}
		} else {
			result.HealthyDays++
			if item.AQI > 0 {
				healthyDaysAQITotal += float64(item.AQI)
				healthyDaysPM25Total += item.PM25
				healthyDaysCount++
			}
		}
	}

	if sickDaysCount > 0 {
		result.AvgAQIWhenSick = sickDaysAQITotal / float64(sickDaysCount)
		result.AvgPM25WhenSick = sickDaysPM25Total / float64(sickDaysCount)
	}

	if healthyDaysCount > 0 {
		result.AvgAQIWhenHealthy = healthyDaysAQITotal / float64(healthyDaysCount)
		result.AvgPM25WhenHealthy = healthyDaysPM25Total / float64(healthyDaysCount)
	}

	return result
}

func (s *CorrelationService) AnalyzeCorrelationWithMockData() (*models.CorrelationAnalysisResult, error) {
	mockHealthRecords := generateMockHealthRecords()
	mockAirQualityData := generateMockAirQualityData("101010100")

	correlationData := s.joinMockData(mockHealthRecords, mockAirQualityData)
	result := s.calculateStatistics(correlationData)
	result.CorrelationData = correlationData

	return result, nil
}

func (s *CorrelationService) joinMockData(healthRecords []models.HealthRecord, airQualityData map[time.Time]*models.AirQualityCache) []models.HealthAirQualityCorrelation {
	var correlationData []models.HealthAirQualityCorrelation

	for _, healthRecord := range healthRecords {
		date := healthRecord.Date.Truncate(24 * time.Hour)
		airQuality := airQualityData[date]

		correlation := models.HealthAirQualityCorrelation{
			Date:     date,
			IsSick:   healthRecord.IsSick,
			Symptoms: healthRecord.Symptoms,
			Severity: healthRecord.Severity,
		}

		if airQuality != nil {
			correlation.AQI = airQuality.AQI
			correlation.PM25 = airQuality.PM25
			correlation.PM10 = airQuality.PM10
			correlation.O3 = airQuality.O3
			correlation.AirQualityLevel = airQuality.Level
		}

		correlationData = append(correlationData, correlation)
	}

	sort.Slice(correlationData, func(i, j int) bool {
		return correlationData[i].Date.Before(correlationData[j].Date)
	})

	return correlationData
}

func generateMockHealthRecords() []models.HealthRecord {
	var records []models.HealthRecord
	startDate := time.Now().AddDate(0, 0, -30).Truncate(24 * time.Hour)

	for i := 0; i < 30; i++ {
		date := startDate.AddDate(0, 0, i)

		isSick := false
		symptoms := ""
		severity := 0

		if i == 3 || i == 7 || i == 15 || i == 22 || i == 25 {
			isSick = true
			switch i {
			case 3:
				symptoms = "咳嗽, 喉咙痛"
				severity = 2
			case 7:
				symptoms = "头痛, 乏力"
				severity = 1
			case 15:
				symptoms = "咳嗽, 胸闷"
				severity = 3
			case 22:
				symptoms = "眼睛干涩, 喉咙不适"
				severity = 1
			case 25:
				symptoms = "咳嗽加重, 呼吸困难"
				severity = 3
			}
		}

		records = append(records, models.HealthRecord{
			Date:     date,
			IsSick:   isSick,
			Symptoms: symptoms,
			Severity: severity,
		})
	}

	return records
}

func generateMockAirQualityData(location string) map[time.Time]*models.AirQualityCache {
	data := make(map[time.Time]*models.AirQualityCache)
	startDate := time.Now().AddDate(0, 0, -30).Truncate(24 * time.Hour)

	aqiPattern := []int{
		45, 52, 68, 95, 120, 88, 72,
		98, 110, 85, 76, 65, 58, 48,
		105, 135, 150, 128, 95, 78,
		62, 55, 115, 140, 89, 74, 60,
		53, 47, 42,
	}

	pm25Pattern := []float64{
		12, 18, 28, 45, 75, 52, 38,
		48, 65, 42, 35, 29, 24, 16,
		58, 95, 110, 88, 55, 42,
		30, 25, 70, 105, 50, 38, 26,
		20, 15, 12,
	}

	for i := 0; i < 30; i++ {
		date := startDate.AddDate(0, 0, i)
		aqi := aqiPattern[i]
		pm25 := pm25Pattern[i]

		level := "优"
		if aqi > 50 {
			level = "良"
		}
		if aqi > 100 {
			level = "轻度污染"
		}
		if aqi > 150 {
			level = "中度污染"
		}

		data[date] = &models.AirQualityCache{
			Date:     date,
			Location: location,
			AQI:      aqi,
			PM25:     pm25,
			PM10:     pm25 * 1.5,
			O3:       float64(aqi) * 0.8,
			NO2:      float64(aqi) * 0.3,
			SO2:      float64(aqi) * 0.1,
			CO:       float64(aqi) * 0.01,
			Level:    level,
		}
	}

	return data
}
