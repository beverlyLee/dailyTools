package handlers

import (
	"household-bill-splitter/config"
	"household-bill-splitter/database"
	"household-bill-splitter/models"
	"household-bill-splitter/services/ocr"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
)

type OCRHandler struct {
	ocrService *ocr.OCRService
}

func NewOCRHandler(cfg *config.OCRConfig) *OCRHandler {
	return &OCRHandler{
		ocrService: ocr.NewOCRService(cfg),
	}
}

func (h *OCRHandler) UploadAndRecognize(c *gin.Context) {
	file, header, err := c.Request.FormFile("image")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No image file provided"})
		return
	}
	defer file.Close()

	uploadDir := "./uploads"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create upload directory"})
		return
	}

	fileExt := filepath.Ext(header.Filename)
	newFileName := time.Now().Format("20060102150405") + fileExt
	filePath := filepath.Join(uploadDir, newFileName)

	dst, err := os.Create(filePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}

	result, err := h.ocrService.RecognizeBill(filePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ocrRecord := models.OCRRecord{
		ImagePath:   filePath,
		RawText:     result.RawText,
		BillType:    result.BillType,
		TotalAmount: result.TotalAmount,
		Status:      "completed",
	}
	database.DB.Create(&ocrRecord)

	c.JSON(http.StatusOK, gin.H{
		"ocr_record_id": ocrRecord.ID,
		"result":        result,
	})
}

func (h *OCRHandler) RecognizeFromText(c *gin.Context) {
	var req struct {
		Text string `json:"text"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result := h.ocrService.ParseText(req.Text)

	c.JSON(http.StatusOK, result)
}

func (h *OCRHandler) GetOCRRecords(c *gin.Context) {
	var records []models.OCRRecord
	if err := database.DB.Order("created_at DESC").Find(&records).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, records)
}

func (h *OCRHandler) GetOCRRecord(c *gin.Context) {
	id := c.Param("id")
	var record models.OCRRecord
	if err := database.DB.First(&record, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "OCR record not found"})
		return
	}
	c.JSON(http.StatusOK, record)
}
