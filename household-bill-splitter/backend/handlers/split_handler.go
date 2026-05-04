package handlers

import (
	"household-bill-splitter/database"
	"household-bill-splitter/models"
	"household-bill-splitter/services/splitter"
	"net/http"

	"github.com/gin-gonic/gin"
)

type SplitHandler struct {
	splitManager *splitter.SplitManager
}

func NewSplitHandler() *SplitHandler {
	return &SplitHandler{
		splitManager: splitter.NewSplitManager(),
	}
}

type SplitRequest struct {
	BillID   uint                   `json:"bill_id"`
	Strategy string                 `json:"strategy"`
	UserIDs  []uint                 `json:"user_ids"`
	Params   map[string]interface{} `json:"params"`
}

func (h *SplitHandler) CalculateSplit(c *gin.Context) {
	var req SplitRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var bill models.Bill
	if err := database.DB.First(&bill, req.BillID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Bill not found"})
		return
	}

	var users []models.User
	if err := database.DB.Find(&users, req.UserIDs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if len(users) != len(req.UserIDs) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Some users not found"})
		return
	}

	shares, err := h.splitManager.Split(bill.Amount, users, req.Strategy, req.Params)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"bill_id":   req.BillID,
		"strategy":  req.Strategy,
		"total":     bill.Amount,
		"shares":    shares,
	})
}

func (h *SplitHandler) SaveSplitResult(c *gin.Context) {
	var req SplitRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var bill models.Bill
	if err := database.DB.First(&bill, req.BillID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Bill not found"})
		return
	}

	var users []models.User
	if err := database.DB.Find(&users, req.UserIDs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	shares, err := h.splitManager.Split(bill.Amount, users, req.Strategy, req.Params)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tx := database.DB.Begin()

	for _, share := range shares {
		splitResult := models.SplitResult{
			BillID: req.BillID,
			UserID: share.UserID,
			Amount: share.Amount,
			Ratio:  share.Ratio,
			Status: "pending",
		}
		if err := tx.Create(&splitResult).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	splitRule := models.SplitRule{
		BillID:   req.BillID,
		Strategy: req.Strategy,
	}
	if paramsStr, ok := req.Params["ratios_str"].(string); ok {
		splitRule.CustomRatio = paramsStr
	} else if paramsStr, ok := req.Params["usages_str"].(string); ok {
		splitRule.CustomRatio = paramsStr
	}
	if err := tx.Create(&splitRule).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	bill.Status = "split"
	if err := tx.Save(&bill).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	tx.Commit()

	var savedResults []models.SplitResult
	database.DB.Preload("User").Where("bill_id = ?", req.BillID).Find(&savedResults)

	c.JSON(http.StatusCreated, gin.H{
		"bill_id":      req.BillID,
		"strategy":     req.Strategy,
		"split_results": savedResults,
	})
}

func (h *SplitHandler) GetSplitStrategies(c *gin.Context) {
	strategies := []map[string]interface{}{
		{
			"name":        "equal",
			"description": "平摊 - 所有参与人均分金额",
			"params":      []string{},
		},
		{
			"name":        "ratio",
			"description": "按比例分摊 - 根据自定义比例分配",
			"params":      []string{"ratios"},
		},
		{
			"name":        "usage",
			"description": "按用量分摊 - 根据实际使用量分配",
			"params":      []string{"usages"},
		},
	}
	c.JSON(http.StatusOK, strategies)
}

func (h *SplitHandler) GetSplitResults(c *gin.Context) {
	billID := c.Param("bill_id")
	var results []models.SplitResult
	if err := database.DB.Preload("User").Where("bill_id = ?", billID).Find(&results).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, results)
}
