package handlers

import (
	"household-bill-splitter/database"
	"household-bill-splitter/models"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

type BillHandler struct{}

func NewBillHandler() *BillHandler {
	return &BillHandler{}
}

func (h *BillHandler) GetBills(c *gin.Context) {
	var bills []models.Bill
	if err := database.DB.Preload("Payer").Preload("BillItems").Find(&bills).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, bills)
}

func (h *BillHandler) GetBill(c *gin.Context) {
	id := c.Param("bill_id")
	var bill models.Bill
	if err := database.DB.Preload("Payer").Preload("BillItems").First(&bill, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Bill not found"})
		return
	}
	c.JSON(http.StatusOK, bill)
}

type CreateBillRequest struct {
	Type        string              `json:"type"`
	Amount      float64             `json:"amount"`
	Date        string              `json:"date"`
	Description string              `json:"description"`
	PayerID     uint                `json:"payer_id"`
	Status      string              `json:"status"`
	BillItems   []models.BillItem   `json:"bill_items"`
}

func (h *BillHandler) CreateBill(c *gin.Context) {
	var req CreateBillRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	date, err := time.Parse("2006-01-02", req.Date)
	if err != nil {
		date = time.Now()
	}

	bill := models.Bill{
		Type:        req.Type,
		Amount:      req.Amount,
		Date:        date,
		Description: req.Description,
		PayerID:     req.PayerID,
		Status:      req.Status,
		BillItems:   req.BillItems,
	}

	if err := database.DB.Create(&bill).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	database.DB.Preload("Payer").Preload("BillItems").First(&bill, bill.ID)
	c.JSON(http.StatusCreated, bill)
}

func (h *BillHandler) UpdateBill(c *gin.Context) {
	id := c.Param("bill_id")
	var bill models.Bill
	if err := database.DB.First(&bill, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Bill not found"})
		return
	}

	var req CreateBillRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	date, err := time.Parse("2006-01-02", req.Date)
	if err != nil {
		date = bill.Date
	}

	bill.Type = req.Type
	bill.Amount = req.Amount
	bill.Date = date
	bill.Description = req.Description
	bill.PayerID = req.PayerID
	if req.Status != "" {
		bill.Status = req.Status
	}

	if err := database.DB.Save(&bill).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	database.DB.Preload("Payer").Preload("BillItems").First(&bill, bill.ID)
	c.JSON(http.StatusOK, bill)
}

func (h *BillHandler) DeleteBill(c *gin.Context) {
	id := c.Param("bill_id")
	if err := database.DB.Delete(&models.Bill{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Bill deleted successfully"})
}

func (h *BillHandler) UpdateBillItemCategory(c *gin.Context) {
	billID := c.Param("bill_id")
	itemID := c.Param("item_id")

	var req struct {
		Category string `json:"category"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var billItem models.BillItem
	if err := database.DB.Where("id = ? AND bill_id = ?", itemID, billID).First(&billItem).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Bill item not found"})
		return
	}

	billItem.Category = req.Category
	if err := database.DB.Save(&billItem).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, billItem)
}
