package services

import (
	"encoding/json"
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"time"

	"air-quality-health-correlation/config"
	"air-quality-health-correlation/database"
	"air-quality-health-correlation/models"
)

type DataSourceType string

const (
	DataSourceAuto      DataSourceType = "auto"
	DataSourceQWeather  DataSourceType = "qweather"
	DataSourceMock      DataSourceType = "mock"
)

type QWeatherNowResponse struct {
	Code       string `json:"code"`
	UpdateTime string `json:"updateTime"`
	Now        struct {
		PubTime  string `json:"pubTime"`
		AQI      string `json:"aqi"`
		Level    string `json:"level"`
		Category string `json:"category"`
		Primary  string `json:"primary"`
		PM10     string `json:"pm10"`
		PM2P5    string `json:"pm2p5"`
		NO2      string `json:"no2"`
		SO2      string `json:"so2"`
		CO       string `json:"co"`
		O3       string `json:"o3"`
	} `json:"now"`
}

type AirQualityService struct {
	apiKey       string
	baseURL      string
	dataSource   DataSourceType
	locationInfo map[string]string
}

func NewAirQualityService() *AirQualityService {
	service := &AirQualityService{
		apiKey:     config.AppConfig.QweatherAPIKey,
		baseURL:    config.AppConfig.QweatherURL,
		dataSource: DataSourceAuto,
		locationInfo: map[string]string{
			"101010100": "北京",
			"101020100": "上海",
			"101280101": "广州",
			"101280601": "深圳",
			"101040100": "重庆",
			"101270101": "成都",
			"101210101": "杭州",
			"101190101": "南京",
			"101200101": "武汉",
			"101110101": "西安",
		},
	}

	if service.apiKey == "" {
		service.dataSource = DataSourceMock
	}

	return service
}

func (s *AirQualityService) SetDataSource(source DataSourceType) {
	s.dataSource = source
}

func (s *AirQualityService) GetCurrentAirQuality(location string) (*models.AirQualityCache, error) {
	cache, err := s.getFromCache(location, time.Now().Truncate(24*time.Hour))
	if err == nil && cache != nil {
		return cache, nil
	}

	var airQuality *models.AirQualityCache

	switch s.dataSource {
	case DataSourceQWeather:
		airQuality, err = s.fetchFromQWeather(location)
	case DataSourceMock:
		airQuality = s.generateMockData(location, time.Now())
	case DataSourceAuto:
		if s.apiKey != "" {
			airQuality, err = s.fetchFromQWeather(location)
			if err != nil {
				airQuality = s.generateMockData(location, time.Now())
				err = nil
			}
		} else {
			airQuality = s.generateMockData(location, time.Now())
		}
	}

	if err != nil {
		return nil, err
	}

	if err := s.saveToCache(airQuality); err != nil {
		fmt.Printf("Warning: Failed to cache air quality data: %v\n", err)
	}

	return airQuality, nil
}

func (s *AirQualityService) GetAirQualityByDate(location string, date time.Time) (*models.AirQualityCache, error) {
	cache, err := s.getFromCache(location, date)
	if err == nil && cache != nil {
		return cache, nil
	}

	if date.Truncate(24*time.Hour) == time.Now().Truncate(24*time.Hour) {
		return s.GetCurrentAirQuality(location)
	}

	airQuality := s.generateMockData(location, date)
	airQuality.Date = date.Truncate(24 * time.Hour)
	
	if err := s.saveToCache(airQuality); err != nil {
		fmt.Printf("Warning: Failed to cache air quality data: %v\n", err)
	}

	return airQuality, nil
}

func (s *AirQualityService) fetchFromQWeather(location string) (*models.AirQualityCache, error) {
	if s.apiKey == "" {
		return nil, fmt.Errorf("QWeather API key not configured")
	}

	url := fmt.Sprintf("%s/v7/air/now?location=%s&key=%s", s.baseURL, location, s.apiKey)
	
	client := &http.Client{
		Timeout: 10 * time.Second,
	}
	
	resp, err := client.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to call QWeather API: %v", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %v", err)
	}

	var qweatherResp QWeatherNowResponse
	if err := json.Unmarshal(body, &qweatherResp); err != nil {
		return nil, fmt.Errorf("failed to parse response: %v", err)
	}

	if qweatherResp.Code != "200" {
		return nil, fmt.Errorf("API returned error code: %s", qweatherResp.Code)
	}

	return s.convertToAirQualityCache(&qweatherResp, location)
}

func (s *AirQualityService) generateMockData(location string, date time.Time) *models.AirQualityCache {
	seed := date.Year()*10000 + int(date.Month())*100 + date.Day()
	locSeed := 0
	for i, c := range location {
		locSeed += int(c) * (i + 1)
	}
	
	r := rand.New(rand.NewSource(int64(seed + locSeed)))
	
	baseAQI := 30 + r.Intn(80)
	
	weekday := date.Weekday()
	if weekday >= time.Monday && weekday <= time.Friday {
		baseAQI += 10 + r.Intn(30)
	}
	
	month := date.Month()
	if month >= time.November || month <= time.February {
		baseAQI += 15 + r.Intn(40)
	} else if month >= time.June && month <= time.August {
		baseAQI -= 10
		if baseAQI < 10 {
			baseAQI = 10
		}
	}

	aqi := baseAQI + r.Intn(20) - 10
	if aqi < 0 {
		aqi = 0
	}

	pm25 := float64(aqi) * 0.75
	pm10 := float64(aqi) * 1.2
	o3 := float64(aqi) * 0.5
	no2 := float64(aqi) * 0.3
	so2 := float64(aqi) * 0.1
	co := float64(aqi) * 0.01

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
	if aqi > 200 {
		level = "重度污染"
	}
	if aqi > 300 {
		level = "严重污染"
	}

	return &models.AirQualityCache{
		Date:     date.Truncate(24 * time.Hour),
		Location: location,
		AQI:      aqi,
		PM25:     pm25,
		PM10:     pm10,
		O3:       o3,
		NO2:      no2,
		SO2:      so2,
		CO:       co,
		Level:    level,
	}
}

func (s *AirQualityService) convertToAirQualityCache(resp *QWeatherNowResponse, location string) (*models.AirQualityCache, error) {
	now := time.Now().Truncate(24 * time.Hour)
	
	airQuality := &models.AirQualityCache{
		Date:     now,
		Location: location,
		Level:    resp.Now.Category,
	}

	var err error
	
	if resp.Now.AQI != "" {
		var aqi int
		_, err = fmt.Sscanf(resp.Now.AQI, "%d", &aqi)
		if err != nil {
			return nil, fmt.Errorf("invalid AQI value: %s", resp.Now.AQI)
		}
		airQuality.AQI = aqi
	}

	if resp.Now.PM2P5 != "" {
		_, err = fmt.Sscanf(resp.Now.PM2P5, "%f", &airQuality.PM25)
		if err != nil {
			return nil, fmt.Errorf("invalid PM2.5 value: %s", resp.Now.PM2P5)
		}
	}

	if resp.Now.PM10 != "" {
		_, err = fmt.Sscanf(resp.Now.PM10, "%f", &airQuality.PM10)
		if err != nil {
			return nil, fmt.Errorf("invalid PM10 value: %s", resp.Now.PM10)
		}
	}

	if resp.Now.O3 != "" {
		_, err = fmt.Sscanf(resp.Now.O3, "%f", &airQuality.O3)
		if err != nil {
			return nil, fmt.Errorf("invalid O3 value: %s", resp.Now.O3)
		}
	}

	if resp.Now.NO2 != "" {
		_, err = fmt.Sscanf(resp.Now.NO2, "%f", &airQuality.NO2)
		if err != nil {
			return nil, fmt.Errorf("invalid NO2 value: %s", resp.Now.NO2)
		}
	}

	if resp.Now.SO2 != "" {
		_, err = fmt.Sscanf(resp.Now.SO2, "%f", &airQuality.SO2)
		if err != nil {
			return nil, fmt.Errorf("invalid SO2 value: %s", resp.Now.SO2)
		}
	}

	if resp.Now.CO != "" {
		_, err = fmt.Sscanf(resp.Now.CO, "%f", &airQuality.CO)
		if err != nil {
			return nil, fmt.Errorf("invalid CO value: %s", resp.Now.CO)
		}
	}

	return airQuality, nil
}

func (s *AirQualityService) getFromCache(location string, date time.Time) (*models.AirQualityCache, error) {
	var cache models.AirQualityCache
	err := database.DB.Where("location = ? AND date = ?", location, date).First(&cache).Error
	if err != nil {
		return nil, err
	}
	return &cache, nil
}

func (s *AirQualityService) saveToCache(airQuality *models.AirQualityCache) error {
	var existing models.AirQualityCache
	err := database.DB.Where("location = ? AND date = ?", airQuality.Location, airQuality.Date).First(&existing).Error
	if err == nil {
		airQuality.ID = existing.ID
		return database.DB.Save(airQuality).Error
	}
	return database.DB.Create(airQuality).Error
}

func (s *AirQualityService) GetSupportedLocations() map[string]string {
	return s.locationInfo
}

func (s *AirQualityService) HasAPIKey() bool {
	return s.apiKey != ""
}
