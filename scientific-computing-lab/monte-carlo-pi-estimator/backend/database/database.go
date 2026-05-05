package database

import (
	"monte-carlo-pi-estimator/models"
	"os"
	"path/filepath"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

var DB *gorm.DB

func InitDB() error {
	var err error
	
	execDir, err := os.Executable()
	if err != nil {
		execDir = "."
	}
	dbPath := filepath.Join(filepath.Dir(execDir), "pi_estimation.db")
	
	DB, err = gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
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
