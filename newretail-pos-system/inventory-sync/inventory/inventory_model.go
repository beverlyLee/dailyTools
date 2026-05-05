package inventory

import (
	"errors"
	"fmt"
	"time"
)

type Inventory struct {
	ID            uint       `json:"id"`
	ProductID     uint       `json:"product_id"`
	ProductBarcode string    `json:"product_barcode"`
	ProductName   string     `json:"product_name"`
	StoreID       uint       `json:"store_id"`
	StoreName     string     `json:"store_name"`
	Stock         int        `json:"stock"`
	ReservedStock int        `json:"reserved_stock"`
	MinStock      int        `json:"min_stock"`
	MaxStock      int        `json:"max_stock"`
	CostPrice     float64    `json:"cost_price"`
	AverageCost   float64    `json:"average_cost"`
	LastInDate    time.Time  `json:"last_in_date"`
	LastOutDate   time.Time  `json:"last_out_date"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

type InventoryTransaction struct {
	ID              uint       `json:"id"`
	TransactionNo   string     `json:"transaction_no"`
	TransactionType string     `json:"transaction_type"`
	ProductID       uint       `json:"product_id"`
	ProductBarcode  string     `json:"product_barcode"`
	ProductName     string     `json:"product_name"`
	StoreID         uint       `json:"store_id"`
	StoreName       string     `json:"store_name"`
	Quantity        int        `json:"quantity"`
	BeforeStock     int        `json:"before_stock"`
	AfterStock      int        `json:"after_stock"`
	CostPrice       float64    `json:"cost_price"`
	Amount          float64    `json:"amount"`
	ReferenceType   string     `json:"reference_type"`
	ReferenceNo     string     `json:"reference_no"`
	Remark          string     `json:"remark"`
	OperatorID      uint       `json:"operator_id"`
	OperatorName    string     `json:"operator_name"`
	CreatedAt       time.Time  `json:"created_at"`
}

type InventoryTransfer struct {
	ID              uint                  `json:"id"`
	TransferNo      string                `json:"transfer_no"`
	FromStoreID     uint                  `json:"from_store_id"`
	FromStoreName   string                `json:"from_store_name"`
	ToStoreID       uint                  `json:"to_store_id"`
	ToStoreName     string                `json:"to_store_name"`
	Status          int                   `json:"status"`
	CreatorID       uint                  `json:"creator_id"`
	CreatorName     string                `json:"creator_name"`
	ApproverID      *uint                 `json:"approver_id"`
	ApproverName    string                `json:"approver_name"`
	Remark          string                `json:"remark"`
	CreatedAt       time.Time             `json:"created_at"`
	UpdatedAt       time.Time             `json:"updated_at"`
	TransferItems   []InventoryTransferItem `json:"transfer_items"`
}

type InventoryTransferItem struct {
	ID            uint    `json:"id"`
	TransferID    uint    `json:"transfer_id"`
	ProductID     uint    `json:"product_id"`
	ProductBarcode string  `json:"product_barcode"`
	ProductName   string  `json:"product_name"`
	Quantity      int     `json:"quantity"`
	CostPrice     float64 `json:"cost_price"`
	Amount        float64 `json:"amount"`
}

type InventoryCheck struct {
	ID              uint                 `json:"id"`
	CheckNo         string               `json:"check_no"`
	StoreID         uint                 `json:"store_id"`
	StoreName       string               `json:"store_name"`
	CheckDate       time.Time            `json:"check_date"`
	CheckType       int                  `json:"check_type"`
	Status          int                  `json:"status"`
	CreatorID       uint                 `json:"creator_id"`
	CreatorName     string               `json:"creator_name"`
	ApproverID      *uint                `json:"approver_id"`
	ApproverName    string               `json:"approver_name"`
	Remark          string               `json:"remark"`
	CreatedAt       time.Time            `json:"created_at"`
	UpdatedAt       time.Time            `json:"updated_at"`
	CheckItems      []InventoryCheckItem `json:"check_items"`
}

type InventoryCheckItem struct {
	ID            uint    `json:"id"`
	CheckID       uint    `json:"check_id"`
	ProductID     uint    `json:"product_id"`
	ProductBarcode string  `json:"product_barcode"`
	ProductName   string  `json:"product_name"`
	Category      string  `json:"category"`
	SystemStock   int     `json:"system_stock"`
	ActualStock   int     `json:"actual_stock"`
	Diff          int     `json:"diff"`
	CostPrice     float64 `json:"cost_price"`
	DiffAmount    float64 `json:"diff_amount"`
	Remark        string  `json:"remark"`
}

type InventoryAlert struct {
	ID            uint       `json:"id"`
	ProductID     uint       `json:"product_id"`
	ProductBarcode string    `json:"product_barcode"`
	ProductName   string     `json:"product_name"`
	StoreID       uint       `json:"store_id"`
	StoreName     string     `json:"store_name"`
	AlertType     string     `json:"alert_type"`
	CurrentStock  int        `json:"current_stock"`
	Threshold     int        `json:"threshold"`
	Message       string     `json:"message"`
	IsRead        bool       `json:"is_read"`
	CreatedAt     time.Time  `json:"created_at"`
}

const (
	TransactionTypeIn  = "in"
	TransactionTypeOut = "out"
	TransactionTypeTransferOut = "transfer_out"
	TransactionTypeTransferIn  = "transfer_in"
	TransactionTypeCheckAdjust = "check_adjust"

	TransferStatusDraft     = 0
	TransferStatusPending   = 1
	TransferStatusApproved  = 2
	TransferStatusRejected  = 3
	TransferStatusCompleted = 4

	CheckStatusDraft     = 0
	CheckStatusPending   = 1
	CheckStatusApproved  = 2
	CheckStatusRejected  = 3

	AlertTypeLowStock  = "low_stock"
	AlertTypeOverStock = "over_stock"
)

type InventoryService struct {
	inventories     map[uint]map[uint]*Inventory
	transactions    []*InventoryTransaction
	transfers       map[string]*InventoryTransfer
	checks          map[string]*InventoryCheck
	alerts          []*InventoryAlert
}

func NewInventoryService() *InventoryService {
	return &InventoryService{
		inventories:  make(map[uint]map[uint]*Inventory),
		transactions: make([]*InventoryTransaction, 0),
		transfers:    make(map[string]*InventoryTransfer),
		checks:       make(map[string]*InventoryCheck),
		alerts:       make([]*InventoryAlert, 0),
	}
}

func (is *InventoryService) GetInventory(productID, storeID uint) (*Inventory, error) {
	storeInventories, exists := is.inventories[storeID]
	if !exists {
		return nil, errors.New("inventory not found for store")
	}

	inventory, exists := storeInventories[productID]
	if !exists {
		return nil, errors.New("inventory not found")
	}

	return inventory, nil
}

func (is *InventoryService) UpdateInventory(productID, storeID uint, quantity int, transactionType string, costPrice float64, referenceType, referenceNo, remark string, operatorID uint, operatorName string) (*Inventory, error) {
	inventory, err := is.GetInventory(productID, storeID)
	if err != nil {
		return nil, err
	}

	beforeStock := inventory.Stock
	var afterStock int

	switch transactionType {
	case TransactionTypeIn, TransactionTypeTransferIn:
		afterStock = beforeStock + quantity
		if afterStock < 0 {
			return nil, errors.New("invalid stock quantity after update")
		}
	case TransactionTypeOut, TransactionTypeTransferOut:
		afterStock = beforeStock - quantity
		if afterStock < 0 {
			return nil, errors.New("insufficient stock")
		}
	case TransactionTypeCheckAdjust:
		afterStock = quantity
		if afterStock < 0 {
			return nil, errors.New("invalid stock quantity")
		}
	default:
		return nil, errors.New("invalid transaction type")
	}

	inventory.Stock = afterStock

	if transactionType == TransactionTypeIn || transactionType == TransactionTypeTransferIn {
		inventory.LastInDate = time.Now()
		if costPrice > 0 {
			totalCost := float64(beforeStock)*inventory.AverageCost + float64(quantity)*costPrice
			totalQuantity := beforeStock + quantity
			if totalQuantity > 0 {
				inventory.AverageCost = totalCost / float64(totalQuantity)
			}
		}
	}

	if transactionType == TransactionTypeOut || transactionType == TransactionTypeTransferOut {
		inventory.LastOutDate = time.Now()
	}

	inventory.UpdatedAt = time.Now()

	transaction := &InventoryTransaction{
		TransactionNo:   generateTransactionNo(),
		TransactionType: transactionType,
		ProductID:       productID,
		ProductBarcode:  inventory.ProductBarcode,
		ProductName:     inventory.ProductName,
		StoreID:         storeID,
		StoreName:       inventory.StoreName,
		Quantity:        quantity,
		BeforeStock:     beforeStock,
		AfterStock:      afterStock,
		CostPrice:       costPrice,
		Amount:          float64(quantity) * costPrice,
		ReferenceType:   referenceType,
		ReferenceNo:     referenceNo,
		Remark:          remark,
		OperatorID:      operatorID,
		OperatorName:    operatorName,
		CreatedAt:       time.Now(),
	}

	is.transactions = append(is.transactions, transaction)

	is.checkInventoryAlert(inventory)

	return inventory, nil
}

func (is *InventoryService) StockIn(productID, storeID uint, quantity int, costPrice float64, referenceType, referenceNo, remark string, operatorID uint, operatorName string) (*Inventory, error) {
	return is.UpdateInventory(productID, storeID, quantity, TransactionTypeIn, costPrice, referenceType, referenceNo, remark, operatorID, operatorName)
}

func (is *InventoryService) StockOut(productID, storeID uint, quantity int, referenceType, referenceNo, remark string, operatorID uint, operatorName string) (*Inventory, error) {
	inventory, err := is.GetInventory(productID, storeID)
	if err != nil {
		return nil, err
	}

	return is.UpdateInventory(productID, storeID, quantity, TransactionTypeOut, inventory.AverageCost, referenceType, referenceNo, remark, operatorID, operatorName)
}

func (is *InventoryService) CreateTransfer(fromStoreID, toStoreID uint, fromStoreName, toStoreName string, items []InventoryTransferItem, creatorID uint, creatorName, remark string) (*InventoryTransfer, error) {
	transfer := &InventoryTransfer{
		TransferNo:    generateTransferNo(),
		FromStoreID:   fromStoreID,
		FromStoreName: fromStoreName,
		ToStoreID:     toStoreID,
		ToStoreName:   toStoreName,
		Status:        TransferStatusDraft,
		CreatorID:     creatorID,
		CreatorName:   creatorName,
		Remark:        remark,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
		TransferItems: items,
	}

	for i := range transfer.TransferItems {
		transfer.TransferItems[i].Amount = float64(transfer.TransferItems[i].Quantity) * transfer.TransferItems[i].CostPrice
	}

	is.transfers[transfer.TransferNo] = transfer

	return transfer, nil
}

func (is *InventoryService) ApproveTransfer(transferNo string, approverID uint, approverName string) error {
	transfer, exists := is.transfers[transferNo]
	if !exists {
		return errors.New("transfer not found")
	}

	if transfer.Status != TransferStatusPending {
		return errors.New("transfer cannot be approved in current status")
	}

	transfer.Status = TransferStatusApproved
	transfer.ApproverID = &approverID
	transfer.ApproverName = approverName
	transfer.UpdatedAt = time.Now()

	return nil
}

func (is *InventoryService) ExecuteTransfer(transferNo string, operatorID uint, operatorName string) error {
	transfer, exists := is.transfers[transferNo]
	if !exists {
		return errors.New("transfer not found")
	}

	if transfer.Status != TransferStatusApproved {
		return errors.New("transfer must be approved before execution")
	}

	for _, item := range transfer.TransferItems {
		_, err := is.UpdateInventory(
			item.ProductID,
			transfer.FromStoreID,
			item.Quantity,
			TransactionTypeTransferOut,
			item.CostPrice,
			"transfer",
			transferNo,
			"调出",
			operatorID,
			operatorName,
		)
		if err != nil {
			return fmt.Errorf("failed to transfer out product %d: %w", item.ProductID, err)
		}

		_, err = is.UpdateInventory(
			item.ProductID,
			transfer.ToStoreID,
			item.Quantity,
			TransactionTypeTransferIn,
			item.CostPrice,
			"transfer",
			transferNo,
			"调入",
			operatorID,
			operatorName,
		)
		if err != nil {
			return fmt.Errorf("failed to transfer in product %d: %w", item.ProductID, err)
		}
	}

	transfer.Status = TransferStatusCompleted
	transfer.UpdatedAt = time.Now()

	return nil
}

func (is *InventoryService) CreateCheck(storeID uint, storeName string, checkType int, items []InventoryCheckItem, creatorID uint, creatorName, remark string) (*InventoryCheck, error) {
	check := &InventoryCheck{
		CheckNo:     generateCheckNo(),
		StoreID:     storeID,
		StoreName:   storeName,
		CheckDate:   time.Now(),
		CheckType:   checkType,
		Status:      CheckStatusDraft,
		CreatorID:   creatorID,
		CreatorName: creatorName,
		Remark:      remark,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
		CheckItems:  items,
	}

	for i := range check.CheckItems {
		check.CheckItems[i].Diff = check.CheckItems[i].ActualStock - check.CheckItems[i].SystemStock
		check.CheckItems[i].DiffAmount = float64(check.CheckItems[i].Diff) * check.CheckItems[i].CostPrice
	}

	is.checks[check.CheckNo] = check

	return check, nil
}

func (is *InventoryService) ApproveCheck(checkNo string, approverID uint, approverName string) error {
	check, exists := is.checks[checkNo]
	if !exists {
		return errors.New("check not found")
	}

	if check.Status != CheckStatusPending {
		return errors.New("check cannot be approved in current status")
	}

	check.Status = CheckStatusApproved
	check.ApproverID = &approverID
	check.ApproverName = approverName
	check.UpdatedAt = time.Now()

	return nil
}

func (is *InventoryService) ExecuteCheck(checkNo string, operatorID uint, operatorName string) error {
	check, exists := is.checks[checkNo]
	if !exists {
		return errors.New("check not found")
	}

	if check.Status != CheckStatusApproved {
		return errors.New("check must be approved before execution")
	}

	for _, item := range check.CheckItems {
		if item.Diff != 0 {
			_, err := is.UpdateInventory(
				item.ProductID,
				check.StoreID,
				item.ActualStock,
				TransactionTypeCheckAdjust,
				item.CostPrice,
				"check",
				checkNo,
				item.Remark,
				operatorID,
				operatorName,
			)
			if err != nil {
				return fmt.Errorf("failed to adjust inventory for product %d: %w", item.ProductID, err)
			}
		}
	}

	return nil
}

func (is *InventoryService) checkInventoryAlert(inventory *Inventory) {
	if inventory.Stock <= inventory.MinStock {
		alert := &InventoryAlert{
			ProductID:     inventory.ProductID,
			ProductBarcode: inventory.ProductBarcode,
			ProductName:   inventory.ProductName,
			StoreID:       inventory.StoreID,
			StoreName:     inventory.StoreName,
			AlertType:     AlertTypeLowStock,
			CurrentStock:  inventory.Stock,
			Threshold:     inventory.MinStock,
			Message:       fmt.Sprintf("库存不足：当前库存 %d，最低库存阈值 %d", inventory.Stock, inventory.MinStock),
			IsRead:        false,
			CreatedAt:     time.Now(),
		}
		is.alerts = append(is.alerts, alert)
	}

	if inventory.MaxStock > 0 && inventory.Stock > inventory.MaxStock {
		alert := &InventoryAlert{
			ProductID:     inventory.ProductID,
			ProductBarcode: inventory.ProductBarcode,
			ProductName:   inventory.ProductName,
			StoreID:       inventory.StoreID,
			StoreName:     inventory.StoreName,
			AlertType:     AlertTypeOverStock,
			CurrentStock:  inventory.Stock,
			Threshold:     inventory.MaxStock,
			Message:       fmt.Sprintf("库存过高：当前库存 %d，最高库存阈值 %d", inventory.Stock, inventory.MaxStock),
			IsRead:        false,
			CreatedAt:     time.Now(),
		}
		is.alerts = append(is.alerts, alert)
	}
}

func (is *InventoryService) GetLowStockAlerts(storeID uint) []*InventoryAlert {
	alerts := make([]*InventoryAlert, 0)
	for _, alert := range is.alerts {
		if alert.AlertType == AlertTypeLowStock && !alert.IsRead {
			if storeID == 0 || alert.StoreID == storeID {
				alerts = append(alerts, alert)
			}
		}
	}
	return alerts
}

func (is *InventoryService) GetTransactions(storeID uint, productID uint, transactionType string, startDate, endDate time.Time) []*InventoryTransaction {
	transactions := make([]*InventoryTransaction, 0)
	for _, tx := range is.transactions {
		if storeID != 0 && tx.StoreID != storeID {
			continue
		}
		if productID != 0 && tx.ProductID != productID {
			continue
		}
		if transactionType != "" && tx.TransactionType != transactionType {
			continue
		}
		if !startDate.IsZero() && tx.CreatedAt.Before(startDate) {
			continue
		}
		if !endDate.IsZero() && tx.CreatedAt.After(endDate) {
			continue
		}
		transactions = append(transactions, tx)
	}
	return transactions
}

func generateTransactionNo() string {
	return "TX" + time.Now().Format("20060102150405")
}

func generateTransferNo() string {
	return "TF" + time.Now().Format("20060102150405")
}

func generateCheckNo() string {
	return "CK" + time.Now().Format("20060102150405")
}
