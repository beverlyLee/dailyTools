package handlers

import (
	"net/http"
	"time"

	"air-quality-health-correlation/services"

	"github.com/gin-gonic/gin"
)

type CorrelationHandler struct {
	service *services.CorrelationService
}

func NewCorrelationHandler() *CorrelationHandler {
	return &CorrelationHandler{
		service: services.NewCorrelationService(),
	}
}

func (h *CorrelationHandler) AnalyzeCorrelation(c *gin.Context) {
	location := c.Query("location")
	if location == "" {
		location = "101010100"
	}

	startDateStr := c.Query("start_date")
	endDateStr := c.Query("end_date")

	var startDate, endDate time.Time
	var err error

	if startDateStr != "" {
		startDate, err = time.Parse("2006-01-02", startDateStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid start_date format, use YYYY-MM-DD"})
			return
		}
	} else {
		startDate = time.Now().AddDate(0, 0, -30)
	}

	if endDateStr != "" {
		endDate, err = time.Parse("2006-01-02", endDateStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid end_date format, use YYYY-MM-DD"})
			return
		}
	} else {
		endDate = time.Now()
	}

	result, err := h.service.AnalyzeCorrelation(location, startDate, endDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to analyze correlation: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

func (h *CorrelationHandler) AnalyzeCorrelationWithMockData(c *gin.Context) {
	result, err := h.service.AnalyzeCorrelationWithMockData()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to analyze correlation: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}
