package database

import (
	"monte-carlo-pi/models"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

var DB *gorm.DB

func InitDB() error {
	var err error
	DB, err = gorm.Open(sqlite.Open("pi_estimation.db"), &gorm.Config{})
	if err != nil {
		return err
	}

	err = DB.AutoMigrate(&models.EstimationRecord{})
	if err != nil {
		return err
	}

	return nil
}

func GetDB() *gorm.DB {
	return DB
}
