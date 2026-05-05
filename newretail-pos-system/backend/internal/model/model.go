package model

import (
	"fmt"
	"newretail-pos-system/backend/internal/config"
	"time"

	"github.com/jinzhu/gorm"
	_ "github.com/jinzhu/gorm/dialects/mysql"
)

type Product struct {
	ID          uint       `gorm:"primary_key" json:"id"`
	Barcode     string     `gorm:"unique_index;size:50" json:"barcode"`
	Name        string     `gorm:"size:100;not null" json:"name"`
	Category    string     `gorm:"size:50" json:"category"`
	Unit        string     `gorm:"size:20" json:"unit"`
	CostPrice   float64    `gorm:"type:decimal(10,2)" json:"cost_price"`
	SalePrice   float64    `gorm:"type:decimal(10,2)" json:"sale_price"`
	MemberPrice float64    `gorm:"type:decimal(10,2)" json:"member_price"`
	Stock       int        `json:"stock"`
	MinStock    int        `json:"min_stock"`
	IsWeighted  bool       `json:"is_weighted"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	DeletedAt   *time.Time `sql:"index" json:"-"`
}

type Inventory struct {
	ID            uint       `gorm:"primary_key" json:"id"`
	ProductID     uint       `json:"product_id"`
	Product       Product    `gorm:"foreignkey:ProductID" json:"product"`
	StoreID       uint       `json:"store_id"`
	Stock         int        `json:"stock"`
	ReservedStock int        `json:"reserved_stock"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
	DeletedAt     *time.Time `sql:"index" json:"-"`
}

type Order struct {
	ID           uint       `gorm:"primary_key" json:"id"`
	OrderNo      string     `gorm:"unique_index;size:30" json:"order_no"`
	StoreID      uint       `json:"store_id"`
	CashierID    uint       `json:"cashier_id"`
	MemberID     *uint      `json:"member_id"`
	TotalAmount  float64    `gorm:"type:decimal(10,2)" json:"total_amount"`
	Discount     float64    `gorm:"type:decimal(10,2)" json:"discount"`
	PayableAmount float64   `gorm:"type:decimal(10,2)" json:"payable_amount"`
	PaidAmount   float64    `gorm:"type:decimal(10,2)" json:"paid_amount"`
	PaymentMethod string    `gorm:"size:20" json:"payment_method"`
	Status       int        `json:"status"`
	IsSuspended  bool       `json:"is_suspended"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
	DeletedAt    *time.Time `sql:"index" json:"-"`
	OrderItems   []OrderItem `gorm:"foreignkey:OrderID" json:"order_items"`
}

type OrderItem struct {
	ID          uint    `gorm:"primary_key" json:"id"`
	OrderID     uint    `json:"order_id"`
	ProductID   uint    `json:"product_id"`
	ProductName string  `gorm:"size:100" json:"product_name"`
	Barcode     string  `gorm:"size:50" json:"barcode"`
	Price       float64 `gorm:"type:decimal(10,2)" json:"price"`
	Quantity    float64 `gorm:"type:decimal(10,3)" json:"quantity"`
	Total       float64 `gorm:"type:decimal(10,2)" json:"total"`
	IsMemberPrice bool   `json:"is_member_price"`
}

type Member struct {
	ID          uint       `gorm:"primary_key" json:"id"`
	MemberNo    string     `gorm:"unique_index;size:30" json:"member_no"`
	Name        string     `gorm:"size:50" json:"name"`
	Phone       string     `gorm:"size:20;unique_index" json:"phone"`
	Level       int        `json:"level"`
	Balance     float64    `gorm:"type:decimal(10,2)" json:"balance"`
	Points      int        `json:"points"`
	Discount    float64    `gorm:"type:decimal(3,2)" json:"discount"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	DeletedAt   *time.Time `sql:"index" json:"-"`
}

type Store struct {
	ID        uint       `gorm:"primary_key" json:"id"`
	Name      string     `gorm:"size:100" json:"name"`
	Address   string     `gorm:"size:255" json:"address"`
	Phone     string     `gorm:"size:20" json:"phone"`
	Status    int        `json:"status"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
	DeletedAt *time.Time `sql:"index" json:"-"`
}

type User struct {
	ID        uint       `gorm:"primary_key" json:"id"`
	Username  string     `gorm:"unique_index;size:50" json:"username"`
	Password  string     `gorm:"size:255" json:"-"`
	Name      string     `gorm:"size:50" json:"name"`
	Role      int        `json:"role"`
	StoreID   uint       `json:"store_id"`
	Status    int        `json:"status"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
	DeletedAt *time.Time `sql:"index" json:"-"`
}

type HardwareConfig struct {
	ID          uint       `gorm:"primary_key" json:"id"`
	StoreID     uint       `json:"store_id"`
	Type        string     `gorm:"size:50" json:"type"`
	Name        string     `gorm:"size:100" json:"name"`
	Port        string     `gorm:"size:50" json:"port"`
	BaudRate    int        `json:"baud_rate"`
	Params      string     `gorm:"type:text" json:"params"`
	IsActive    bool       `json:"is_active"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	DeletedAt   *time.Time `sql:"index" json:"-"`
}

type InventoryTransfer struct {
	ID              uint       `gorm:"primary_key" json:"id"`
	TransferNo      string     `gorm:"unique_index;size:30" json:"transfer_no"`
	FromStoreID     uint       `json:"from_store_id"`
	ToStoreID       uint       `json:"to_store_id"`
	Status          int        `json:"status"`
	CreatorID       uint       `json:"creator_id"`
	ApproverID      *uint      `json:"approver_id"`
	Remark          string     `gorm:"size:255" json:"remark"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
	DeletedAt       *time.Time `sql:"index" json:"-"`
	TransferItems   []InventoryTransferItem `gorm:"foreignkey:TransferID" json:"transfer_items"`
}

type InventoryTransferItem struct {
	ID          uint    `gorm:"primary_key" json:"id"`
	TransferID  uint    `json:"transfer_id"`
	ProductID   uint    `json:"product_id"`
	ProductName string  `gorm:"size:100" json:"product_name"`
	Quantity    int     `json:"quantity"`
}

type InventoryCheck struct {
	ID            uint       `gorm:"primary_key" json:"id"`
	CheckNo       string     `gorm:"unique_index;size:30" json:"check_no"`
	StoreID       uint       `json:"store_id"`
	CheckDate     time.Time  `json:"check_date"`
	CheckType     int        `json:"check_type"`
	Status        int        `json:"status"`
	CreatorID     uint       `json:"creator_id"`
	Remark        string     `gorm:"size:255" json:"remark"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
	DeletedAt     *time.Time `sql:"index" json:"-"`
	CheckItems    []InventoryCheckItem `gorm:"foreignkey:CheckID" json:"check_items"`
}

type InventoryCheckItem struct {
	ID          uint    `gorm:"primary_key" json:"id"`
	CheckID     uint    `json:"check_id"`
	ProductID   uint    `json:"product_id"`
	ProductName string  `gorm:"size:100" json:"product_name"`
	Barcode     string  `gorm:"size:50" json:"barcode"`
	SystemStock int     `json:"system_stock"`
	ActualStock int     `json:"actual_stock"`
	Diff        int     `json:"diff"`
	DiffAmount  float64 `gorm:"type:decimal(10,2)" json:"diff_amount"`
}

func InitDB(cfg *config.Config) (*gorm.DB, error) {
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		cfg.Database.User,
		cfg.Database.Password,
		cfg.Database.Host,
		cfg.Database.Port,
		cfg.Database.DBName,
	)

	db, err := gorm.Open("mysql", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	db.AutoMigrate(
		&Product{},
		&Inventory{},
		&Order{},
		&OrderItem{},
		&Member{},
		&Store{},
		&User{},
		&HardwareConfig{},
		&InventoryTransfer{},
		&InventoryTransferItem{},
		&InventoryCheck{},
		&InventoryCheckItem{},
	)

	return db, nil
}
