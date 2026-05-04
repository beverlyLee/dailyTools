package database

import (
	"household-bill-splitter/config"
	"household-bill-splitter/models"
	"log"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

var DB *gorm.DB

func InitDB(cfg *config.Config) error {
	var err error
	DB, err = gorm.Open(sqlite.Open(cfg.DBPath), &gorm.Config{})
	if err != nil {
		return err
	}

	err = DB.AutoMigrate(
		&models.User{},
		&models.Bill{},
		&models.BillItem{},
		&models.SplitRule{},
		&models.SplitResult{},
		&models.Settlement{},
		&models.OCRRecord{},
	)
	if err != nil {
		return err
	}

	log.Println("Database initialized successfully")
	return nil
}

func GetDB() *gorm.DB {
	return DB
}
