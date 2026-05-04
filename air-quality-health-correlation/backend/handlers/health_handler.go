package handlers

import (
	"net/http"
	"strconv"
	"time"

	"air-quality-health-correlation/models"
	"air-quality-health-correlation/services"

	"github.com/gin-gonic/gin"
)

type HealthHandler struct {
	service *services.HealthService
}

func NewHealthHandler() *HealthHandler {
	return &HealthHandler{
		service: services.NewHealthService(),
	}
}

type CreateHealthRecordRequest struct {
	Date     string `json:"date" binding:"required"`
	IsSick   bool   `json:"is_sick"`
	Symptoms string `json:"symptoms"`
	Severity int    `json:"severity"`
	Notes    string `json:"notes"`
}

func (h *HealthHandler) CreateHealthRecord(c *gin.Context) {
	var req CreateHealthRecordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}

	date, err := time.Parse("2006-01-02", req.Date)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format, use YYYY-MM-DD"})
		return
	}

	record := &models.HealthRecord{
		Date:     date,
		IsSick:   req.IsSick,
		Symptoms: req.Symptoms,
		Severity: req.Severity,
		Notes:    req.Notes,
	}

	if err := h.service.CreateHealthRecord(record); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create health record: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, record)
}

func (h *HealthHandler) GetHealthRecordByDate(c *gin.Context) {
	dateStr := c.Query("date")
	if dateStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Date parameter is required"})
		return
	}

	date, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format, use YYYY-MM-DD"})
		return
	}

	record, err := h.service.GetHealthRecordByDate(date)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Health record not found"})
		return
	}

	c.JSON(http.StatusOK, record)
}

func (h *HealthHandler) GetAllHealthRecords(c *gin.Context) {
	records, err := h.service.GetAllHealthRecords()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get health records: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, records)
}

func (h *HealthHandler) GetHealthRecordsByDateRange(c *gin.Context) {
	startDateStr := c.Query("start_date")
	endDateStr := c.Query("end_date")

	if startDateStr == "" || endDateStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "start_date and end_date parameters are required"})
		return
	}

	startDate, err := time.Parse("2006-01-02", startDateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid start_date format, use YYYY-MM-DD"})
		return
	}

	endDate, err := time.Parse("2006-01-02", endDateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid end_date format, use YYYY-MM-DD"})
		return
	}

	records, err := h.service.GetHealthRecordsByDateRange(startDate, endDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get health records: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, records)
}

func (h *HealthHandler) UpdateHealthRecord(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	var req CreateHealthRecordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}

	date, err := time.Parse("2006-01-02", req.Date)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format, use YYYY-MM-DD"})
		return
	}

	record := &models.HealthRecord{
		ID:       uint(id),
		Date:     date,
		IsSick:   req.IsSick,
		Symptoms: req.Symptoms,
		Severity: req.Severity,
		Notes:    req.Notes,
	}

	if err := h.service.UpdateHealthRecord(record); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update health record: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, record)
}

func (h *HealthHandler) DeleteHealthRecord(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	if err := h.service.DeleteHealthRecord(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete health record: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Health record deleted successfully"})
}
