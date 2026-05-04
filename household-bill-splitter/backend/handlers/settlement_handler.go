package handlers

import (
	"household-bill-splitter/database"
	"household-bill-splitter/models"
	"household-bill-splitter/services/settlement"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

type SettlementHandler struct {
	calculator *settlement.MinCashFlowCalculator
}

func NewSettlementHandler() *SettlementHandler {
	return &SettlementHandler{
		calculator: settlement.NewMinCashFlowCalculator(),
	}
}

type CalculateSettlementRequest struct {
	BillIDs []uint `json:"bill_ids"`
}

func (h *SettlementHandler) CalculateSettlement(c *gin.Context) {
	var req CalculateSettlementRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var bills []models.Bill
	if err := database.DB.Preload("Payer").Preload("BillItems").
		Where("id IN ?", req.BillIDs).Find(&bills).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if len(bills) == 0 {
		c.JSON(http.StatusOK, gin.H{
			"transfers": []interface{}{},
			"balances":  []interface{}{},
		})
		return
	}

	balances := make(map[uint]float64)

	for _, bill := range bills {
		var splitResults []models.SplitResult
		if err := database.DB.Where("bill_id = ?", bill.ID).Find(&splitResults).Error; err != nil {
			continue
		}

		balances[bill.PayerID] += bill.Amount

		for _, result := range splitResults {
			balances[result.UserID] -= result.Amount
		}
	}

	transfers := h.calculator.CalculateTransfers(balances)
	balanceList := h.calculator.CalculateBalances(balances)

	c.JSON(http.StatusOK, gin.H{
		"balances":  balanceList,
		"transfers": transfers,
	})
}

func (h *SettlementHandler) CalculateAllSettlement(c *gin.Context) {
	var bills []models.Bill
	if err := database.DB.Preload("Payer").
		Where("status = ?", "split").Find(&bills).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if len(bills) == 0 {
		c.JSON(http.StatusOK, gin.H{
			"transfers": []interface{}{},
			"balances":  []interface{}{},
		})
		return
	}

	balances := make(map[uint]float64)
	var billIDs []string

	for _, bill := range bills {
		billIDs = append(billIDs, string(rune(bill.ID)))

		var splitResults []models.SplitResult
		if err := database.DB.Where("bill_id = ?", bill.ID).Find(&splitResults).Error; err != nil {
			continue
		}

		balances[bill.PayerID] += bill.Amount

		for _, result := range splitResults {
			balances[result.UserID] -= result.Amount
		}
	}

	transfers := h.calculator.CalculateTransfers(balances)
	balanceList := h.calculator.CalculateBalances(balances)

	type UserBalance struct {
		settlement.Balance
		UserName string `json:"user_name"`
	}

	var userBalances []UserBalance
	for _, bal := range balanceList {
		var user models.User
		database.DB.First(&user, bal.UserID)
		userBalances = append(userBalances, UserBalance{
			Balance:  bal,
			UserName: user.Name,
		})
	}

	type UserTransfer struct {
		settlement.Transfer
		FromUserName string `json:"from_user_name"`
		ToUserName   string `json:"to_user_name"`
	}

	var userTransfers []UserTransfer
	for _, transfer := range transfers {
		var fromUser, toUser models.User
		database.DB.First(&fromUser, transfer.FromUserID)
		database.DB.First(&toUser, transfer.ToUserID)
		userTransfers = append(userTransfers, UserTransfer{
			Transfer:     transfer,
			FromUserName: fromUser.Name,
			ToUserName:   toUser.Name,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"balances":  userBalances,
		"transfers": userTransfers,
		"bill_ids":  billIDs,
	})
}

func (h *SettlementHandler) SaveSettlement(c *gin.Context) {
	var req struct {
		Transfers []struct {
			FromUserID uint    `json:"from_user_id"`
			ToUserID   uint    `json:"to_user_id"`
			Amount     float64 `json:"amount"`
		} `json:"transfers"`
		BillIDs []uint `json:"bill_ids"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tx := database.DB.Begin()

	var billIDStrs []string
	for _, id := range req.BillIDs {
		billIDStrs = append(billIDStrs, string(rune(id)))
	}
	billIDsJoined := strings.Join(billIDStrs, ",")

	for _, transfer := range req.Transfers {
		settlement := models.Settlement{
			FromUserID: transfer.FromUserID,
			ToUserID:   transfer.ToUserID,
			Amount:     transfer.Amount,
			BillIDs:    billIDsJoined,
			Status:     "pending",
		}
		if err := tx.Create(&settlement).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	if len(req.BillIDs) > 0 {
		if err := tx.Model(&models.Bill{}).
			Where("id IN ?", req.BillIDs).
			Update("status", "settled").Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	tx.Commit()

	c.JSON(http.StatusCreated, gin.H{
		"message": "Settlement saved successfully",
		"count":   len(req.Transfers),
	})
}

func (h *SettlementHandler) GetSettlements(c *gin.Context) {
	var settlements []models.Settlement
	if err := database.DB.Preload("FromUser").Preload("ToUser").
		Order("created_at DESC").Find(&settlements).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, settlements)
}

func (h *SettlementHandler) MarkSettlementPaid(c *gin.Context) {
	id := c.Param("id")
	var settlement models.Settlement
	if err := database.DB.First(&settlement, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Settlement not found"})
		return
	}

	settlement.Status = "paid"
	if err := database.DB.Save(&settlement).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, settlement)
}
