package models

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	Name      string         `json:"name" gorm:"uniqueIndex;not null"`
	Email     string         `json:"email" gorm:"uniqueIndex"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}

type Bill struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	Type        string         `json:"type"`
	Amount      float64        `json:"amount"`
	Date        time.Time      `json:"date"`
	Description string         `json:"description"`
	PayerID     uint           `json:"payer_id"`
	Payer       User           `json:"payer" gorm:"foreignKey:PayerID"`
	Status      string         `json:"status"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
	BillItems   []BillItem     `json:"bill_items" gorm:"foreignKey:BillID"`
}

type BillItem struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	BillID      uint           `json:"bill_id"`
	Category    string         `json:"category"`
	Description string         `json:"description"`
	Amount      float64        `json:"amount"`
	Quantity    float64        `json:"quantity"`
	Unit        string         `json:"unit"`
	UnitPrice   float64        `json:"unit_price"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}

type SplitRule struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	BillID      uint           `json:"bill_id"`
	Strategy    string         `json:"strategy"`
	CustomRatio string         `json:"custom_ratio"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}

type SplitResult struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	BillID      uint           `json:"bill_id"`
	UserID      uint           `json:"user_id"`
	User        User           `json:"user" gorm:"foreignKey:UserID"`
	Amount      float64        `json:"amount"`
	Ratio       float64        `json:"ratio"`
	Status      string         `json:"status"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}

type Settlement struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	FromUserID  uint           `json:"from_user_id"`
	FromUser    User           `json:"from_user" gorm:"foreignKey:FromUserID"`
	ToUserID    uint           `json:"to_user_id"`
	ToUser      User           `json:"to_user" gorm:"foreignKey:ToUserID"`
	Amount      float64        `json:"amount"`
	BillIDs     string         `json:"bill_ids"`
	Status      string         `json:"status"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}

type OCRRecord struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	ImagePath   string         `json:"image_path"`
	RawText     string         `json:"raw_text"`
	ParsedData  string         `json:"parsed_data"`
	BillType    string         `json:"bill_type"`
	TotalAmount float64        `json:"total_amount"`
	Status      string         `json:"status"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}
