package services

import (
	"time"

	"air-quality-health-correlation/database"
	"air-quality-health-correlation/models"
)

type HealthService struct{}

func NewHealthService() *HealthService {
	return &HealthService{}
}

func (s *HealthService) CreateHealthRecord(record *models.HealthRecord) error {
	record.Date = record.Date.Truncate(24 * time.Hour)
	return database.DB.Create(record).Error
}

func (s *HealthService) GetHealthRecordByDate(date time.Time) (*models.HealthRecord, error) {
	var record models.HealthRecord
	err := database.DB.Where("date = ?", date.Truncate(24*time.Hour)).First(&record).Error
	if err != nil {
		return nil, err
	}
	return &record, nil
}

func (s *HealthService) GetAllHealthRecords() ([]models.HealthRecord, error) {
	var records []models.HealthRecord
	err := database.DB.Order("date DESC").Find(&records).Error
	if err != nil {
		return nil, err
	}
	return records, nil
}

func (s *HealthService) GetHealthRecordsByDateRange(startDate, endDate time.Time) ([]models.HealthRecord, error) {
	var records []models.HealthRecord
	err := database.DB.Where("date >= ? AND date <= ?", 
		startDate.Truncate(24*time.Hour), 
		endDate.Truncate(24*time.Hour)).
		Order("date ASC").
		Find(&records).Error
	if err != nil {
		return nil, err
	}
	return records, nil
}

func (s *HealthService) UpdateHealthRecord(record *models.HealthRecord) error {
	return database.DB.Save(record).Error
}

func (s *HealthService) DeleteHealthRecord(id uint) error {
	return database.DB.Delete(&models.HealthRecord{}, id).Error
}
