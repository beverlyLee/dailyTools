package routers

import (
	"monte-carlo-pi/database"
	"monte-carlo-pi/models"
	"monte-carlo-pi/services"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type EstimateRequest struct {
	SampleSize int64 `json:"sample_size" binding:"required,min=100,max=100000000"`
	NumWorkers int   `json:"num_workers"`
}

func SetupRouter() *gin.Engine {
	r := gin.Default()

	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	api := r.Group("/api")
	{
		api.POST("/estimate", estimateHandler)
		api.GET("/history", historyHandler)
		api.GET("/history/:id", getHistoryHandler)
		api.DELETE("/history", clearHistoryHandler)
		api.GET("/sample-points", samplePointsHandler)
	}

	r.Static("/css", "../frontend/css")
	r.Static("/js", "../frontend/js")

	r.NoRoute(func(c *gin.Context) {
		if c.Request.Method == http.MethodGet {
			path := c.Request.URL.Path
			if path == "/" || path == "/index.html" {
				c.File("../frontend/index.html")
				return
			}
		}
		c.JSON(http.StatusNotFound, gin.H{"error": "Not Found"})
	})

	return r
}

func estimateHandler(c *gin.Context) {
	var req EstimateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.NumWorkers <= 0 {
		req.NumWorkers = 0
	}

	result := services.CalculatePiConcurrent(req.SampleSize, req.NumWorkers)

	record := models.EstimationRecord{
		SampleSize:      result.SampleSize,
		PointsInCircle:  result.PointsInCircle,
		PointsInSquare:  result.PointsInSquare,
		EstimatedPi:     result.EstimatedPi,
		ActualPi:        result.ActualPi,
		ErrorPercentage: result.ErrorPercentage,
		DurationMs:      result.DurationMs,
	}

	db := database.GetDB()
	if db != nil {
		db.Create(&record)
	}

	c.JSON(http.StatusOK, result)
}

func historyHandler(c *gin.Context) {
	var records []models.EstimationRecord

	limit := 100
	limitStr := c.Query("limit")
	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	db := database.GetDB()
	if db == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database not initialized"})
		return
	}

	db.Order("created_at DESC").Limit(limit).Find(&records)

	c.JSON(http.StatusOK, gin.H{
		"total": len(records),
		"data":  records,
	})
}

func getHistoryHandler(c *gin.Context) {
	id := c.Param("id")

	var record models.EstimationRecord
	db := database.GetDB()
	if db == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database not initialized"})
		return
	}

	if err := db.First(&record, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Record not found"})
		return
	}

	c.JSON(http.StatusOK, record)
}

func clearHistoryHandler(c *gin.Context) {
	db := database.GetDB()
	if db == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database not initialized"})
		return
	}

	db.Exec("DELETE FROM estimation_records")

	c.JSON(http.StatusOK, gin.H{"message": "History cleared"})
}

func samplePointsHandler(c *gin.Context) {
	count := 100
	countStr := c.Query("count")
	if countStr != "" {
		if c, err := strconv.Atoi(countStr); err == nil && c > 0 && c <= 10000 {
			count = c
		}
	}

	points := services.GenerateSamplePoints(count)

	c.JSON(http.StatusOK, points)
}
