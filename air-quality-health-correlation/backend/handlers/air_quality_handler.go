package handlers

import (
	"net/http"

	"air-quality-health-correlation/services"

	"github.com/gin-gonic/gin"
)

type AirQualityHandler struct {
	service *services.AirQualityService
}

func NewAirQualityHandler() *AirQualityHandler {
	return &AirQualityHandler{
		service: services.NewAirQualityService(),
	}
}

func (h *AirQualityHandler) GetCurrentAirQuality(c *gin.Context) {
	location := c.Query("location")
	if location == "" {
		location = "101010100"
	}

	airQuality, err := h.service.GetCurrentAirQuality(location)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get air quality data: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, airQuality)
}

func (h *AirQualityHandler) GetSupportedLocations(c *gin.Context) {
	locations := h.service.GetSupportedLocations()
	
	result := make([]map[string]string, 0, len(locations))
	for code, name := range locations {
		result = append(result, map[string]string{
			"code": code,
			"name": name,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"locations": result,
		"message": "这些是支持的主要城市。使用智能模式时，系统会根据日期和位置生成符合实际规律的空气质量模拟数据。",
		"note": "如需使用真实的和风天气API，请配置 QWEATHER_API_KEY 环境变量。",
	})
}

func (h *AirQualityHandler) GetDataSourceStatus(c *gin.Context) {
	hasAPIKey := h.service.HasAPIKey()
	
	c.JSON(http.StatusOK, gin.H{
		"has_real_api": hasAPIKey,
		"current_mode": map[string]string{
			"code":        "smart",
			"description": "智能模式：有API Key时使用真实API，否则使用智能模拟数据",
		},
		"mock_features": []string{
			"基于日期的季节性变化（冬季空气质量较差，夏季较好）",
			"工作日/周末差异（工作日污染较重）",
			"不同城市的空气质量特征",
			"可重现的确定性随机数据",
		},
	})
}
