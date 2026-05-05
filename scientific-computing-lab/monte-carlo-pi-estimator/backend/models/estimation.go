package models

import (
	"time"

	"gorm.io/gorm"
)

type EstimationRecord struct {
	ID              uint           `gorm:"primaryKey" json:"id"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`
	SampleSize      int64          `gorm:"not null;index" json:"sample_size"`
	PointsInCircle  int64          `gorm:"not null" json:"points_in_circle"`
	PointsInSquare  int64          `gorm:"not null" json:"points_in_square"`
	EstimatedPi     float64        `gorm:"not null" json:"estimated_pi"`
	ActualPi        float64        `gorm:"not null" json:"actual_pi"`
	ErrorPercentage float64        `gorm:"not null" json:"error_percentage"`
	DurationMs      int64          `gorm:"not null" json:"duration_ms"`
}
