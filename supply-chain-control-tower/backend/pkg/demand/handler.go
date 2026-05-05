package demand

import (
	"math/rand"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type ForecastData struct {
	ProductID   string  `json:"productId"`
	ProductName string  `json:"productName"`
	SKU         string  `json:"sku"`
	Forecast    []struct {
		Date        string  `json:"date"`
		Forecasted  float64 `json:"forecasted"`
		LowerBound  float64 `json:"lowerBound"`
		UpperBound  float64 `json:"upperBound"`
		Confidence  float64 `json:"confidence"`
	} `json:"forecast"`
	ModelInfo struct {
		ModelName    string  `json:"modelName"`
		MAE          float64 `json:"mae"`
		RMSE         float64 `json:"rmse"`
		LastTrained  string  `json:"lastTrained"`
	} `json:"modelInfo"`
}

type HistoricalData struct {
	ProductID   string `json:"productId"`
	ProductName string `json:"productName"`
	Data        []struct {
		Date       string  `json:"date"`
		Sales      float64 `json:"sales"`
		IsHoliday  bool    `json:"isHoliday"`
		Temperature float64 `json:"temperature"`
		Promotion  string  `json:"promotion,omitempty"`
	} `json:"data"`
}

type SimulationRequest struct {
	ProductID    string  `json:"productId"`
	Scenario     string  `json:"scenario"`
	DemandChange float64 `json:"demandChange"`
	LeadTimeChange float64 `json:"leadTimeChange"`
}

type SimulationResult struct {
	Scenario       string  `json:"scenario"`
	ProductID      string  `json:"productId"`
	ProductName    string  `json:"productName"`
	BaseForecast   float64 `json:"baseForecast"`
	SimulatedDemand float64 `json:"simulatedDemand"`
	InventoryImpact struct {
		CurrentStock int     `json:"currentStock"`
		ProjectedStock float64 `json:"projectedStock"`
		StockoutRisk  float64 `json:"stockoutRisk"`
		OverstockRisk float64 `json:"overstockRisk"`
	} `json:"inventoryImpact"`
	CostImpact struct {
		BaseCost       float64 `json:"baseCost"`
		SimulatedCost  float64 `json:"simulatedCost"`
		CostDifference float64 `json:"costDifference"`
	} `json:"costImpact"`
	Recommendations []string `json:"recommendations"`
}

type ReplenishmentSuggestion struct {
	ID             string `json:"id"`
	ProductID      string `json:"productId"`
	ProductName    string `json:"productName"`
	SKU            string `json:"sku"`
	Warehouse      string `json:"warehouse"`
	CurrentStock   int    `json:"currentStock"`
	MinStockLevel  int    `json:"minStockLevel"`
	RecommendedQty int    `json:"recommendedQty"`
	Urgency        string `json:"urgency"`
	Reason         string `json:"reason"`
	Status         string `json:"status"`
	CreatedAt      string `json:"createdAt"`
	EstimatedArrival string `json:"estimatedArrival"`
}

type ExternalFactor struct {
	Date        string  `json:"date"`
	IsHoliday   bool    `json:"isHoliday"`
	HolidayName string  `json:"holidayName,omitempty"`
	Temperature float64 `json:"temperature"`
	Weather     string  `json:"weather"`
	EconomicIndicator float64 `json:"economicIndicator"`
}

func GetForecast(c *fiber.Ctx) error {
	productID := c.Query("productId", "all")
	days, _ := strconv.Atoi(c.Query("days", "30"))

	if productID == "all" {
		forecasts := []ForecastData{
			generateForecast("PROD-001", "产品A", "SKU-001", days),
			generateForecast("PROD-002", "产品B", "SKU-002", days),
			generateForecast("PROD-003", "产品C", "SKU-003", days),
		}
		return c.JSON(forecasts)
	}

	forecast := generateForecast(productID, "产品A", "SKU-001", days)
	return c.JSON(forecast)
}

func generateForecast(productID, productName, sku string, days int) ForecastData {
	forecast := ForecastData{
		ProductID:   productID,
		ProductName: productName,
		SKU:         sku,
	}

	baseValue := 100.0 + rand.Float64()*50
	now := time.Now()

	for i := 0; i < days; i++ {
		date := now.AddDate(0, 0, i+1)
		variation := (rand.Float64() - 0.5) * 20
		forecasted := baseValue + variation

		forecast.Forecast = append(forecast.Forecast, struct {
			Date        string  `json:"date"`
			Forecasted  float64 `json:"forecasted"`
			LowerBound  float64 `json:"lowerBound"`
			UpperBound  float64 `json:"upperBound"`
			Confidence  float64 `json:"confidence"`
		}{
			Date:       date.Format("2006-01-02"),
			Forecasted: forecasted,
			LowerBound: forecasted * 0.85,
			UpperBound: forecasted * 1.15,
			Confidence: 0.75 + rand.Float64()*0.2,
		})
	}

	forecast.ModelInfo.ModelName = "SARIMA-X"
	forecast.ModelInfo.MAE = 12.5
	forecast.ModelInfo.RMSE = 18.3
	forecast.ModelInfo.LastTrained = time.Now().Add(-2 * time.Hour).Format("2006-01-02 15:04:05")

	return forecast
}

func GetHistoryData(c *fiber.Ctx) error {
	productID := c.Query("productId", "PROD-001")
	days, _ := strconv.Atoi(c.Query("days", "90"))

	historical := HistoricalData{
		ProductID:   productID,
		ProductName: "产品A",
	}

	now := time.Now()
	baseSales := 100.0

	for i := days; i > 0; i-- {
		date := now.AddDate(0, 0, -i)
		weekDay := date.Weekday()
		
		salesVariation := (rand.Float64() - 0.5) * 30
		dailySales := baseSales + salesVariation

		if weekDay == time.Saturday || weekDay == time.Sunday {
			dailySales *= 1.3
		}

		isHoliday := false
		holidayName := ""
		if date.Month() == time.January && date.Day() == 1 {
			isHoliday = true
			holidayName = "元旦"
			dailySales *= 1.5
		}
		if date.Month() == time.October && date.Day() == 1 {
			isHoliday = true
			holidayName = "国庆节"
			dailySales *= 1.8
		}

		temperature := 15.0 + rand.Float64()*15

		historical.Data = append(historical.Data, struct {
			Date       string  `json:"date"`
			Sales      float64 `json:"sales"`
			IsHoliday  bool    `json:"isHoliday"`
			Temperature float64 `json:"temperature"`
			Promotion  string  `json:"promotion,omitempty"`
		}{
			Date:        date.Format("2006-01-02"),
			Sales:       dailySales,
			IsHoliday:   isHoliday,
			Temperature: temperature,
		})
	}

	return c.JSON(historical)
}

func RunSimulation(c *fiber.Ctx) error {
	var req SimulationRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "无效的请求参数",
		})
	}

	baseForecast := 1000.0
	simulatedDemand := baseForecast * (1 + req.DemandChange/100)

	result := SimulationResult{
		Scenario:        req.Scenario,
		ProductID:       req.ProductID,
		ProductName:     "产品A",
		BaseForecast:    baseForecast,
		SimulatedDemand: simulatedDemand,
	}

	result.InventoryImpact.CurrentStock = 500
	result.InventoryImpact.ProjectedStock = float64(result.InventoryImpact.CurrentStock) - simulatedDemand + 300
	result.InventoryImpact.StockoutRisk = 0.0
	result.InventoryImpact.OverstockRisk = 0.0

	if result.InventoryImpact.ProjectedStock < 100 {
		result.InventoryImpact.StockoutRisk = 0.8
	}
	if result.InventoryImpact.ProjectedStock > 800 {
		result.InventoryImpact.OverstockRisk = 0.6
	}

	result.CostImpact.BaseCost = 50000.0
	result.CostImpact.SimulatedCost = 50000.0 * (1 + req.DemandChange/100*0.3)
	result.CostImpact.CostDifference = result.CostImpact.SimulatedCost - result.CostImpact.BaseCost

	result.Recommendations = []string{
		"建议提前与供应商沟通，确保原材料供应",
		"考虑调整安全库存水平",
		"监控承运商运力情况",
	}

	return c.JSON(result)
}

func GetReplenishmentSuggestions(c *fiber.Ctx) error {
	suggestions := []ReplenishmentSuggestion{
		{
			ID:             uuid.New().String(),
			ProductID:      "PROD-002",
			ProductName:    "产品B",
			SKU:            "SKU-002",
			Warehouse:      "华东配送中心",
			CurrentStock:   800,
			MinStockLevel:  1000,
			RecommendedQty: 1200,
			Urgency:        "high",
			Reason:         "库存已低于安全线，且未来30天需求预测呈上升趋势",
			Status:         "pending",
			CreatedAt:      time.Now().Format("2006-01-02 10:30:00"),
			EstimatedArrival: time.Now().AddDate(0, 0, 3).Format("2006-01-02"),
		},
		{
			ID:             uuid.New().String(),
			ProductID:      "PROD-003",
			ProductName:    "产品C",
			SKU:            "SKU-003",
			Warehouse:      "华北配送中心",
			CurrentStock:   0,
			MinStockLevel:  300,
			RecommendedQty: 800,
			Urgency:        "critical",
			Reason:         "产品已缺货，存在订单延误风险",
			Status:         "pending",
			CreatedAt:      time.Now().Add(-1 * time.Hour).Format("2006-01-02 09:30:00"),
			EstimatedArrival: time.Now().AddDate(0, 0, 2).Format("2006-01-02"),
		},
		{
			ID:             uuid.New().String(),
			ProductID:      "PROD-001",
			ProductName:    "产品A",
			SKU:            "SKU-001",
			Warehouse:      "华南配送中心",
			CurrentStock:   1500,
			MinStockLevel:  500,
			RecommendedQty: 500,
			Urgency:        "low",
			Reason:         "库存充足，但根据预测建议提前备货",
			Status:         "review",
			CreatedAt:      time.Now().Add(-2 * time.Hour).Format("2006-01-02 08:30:00"),
			EstimatedArrival: time.Now().AddDate(0, 0, 5).Format("2006-01-02"),
		},
	}

	return c.JSON(suggestions)
}

func ApproveReplenishment(c *fiber.Ctx) error {
	id := c.Params("id")
	_ = id

	return c.JSON(fiber.Map{
		"success": true,
		"message": "补货建议已批准，采购单已生成",
		"purchaseOrderId": "PO-" + time.Now().Format("20060102") + "-" + strconv.Itoa(rand.Intn(1000)),
	})
}

func GetExternalFactors(c *fiber.Ctx) error {
	days, _ := strconv.Atoi(c.Query("days", "30"))

	var factors []ExternalFactor
	now := time.Now()

	for i := days; i > 0; i-- {
		date := now.AddDate(0, 0, -i)
		
		isHoliday := false
		holidayName := ""
		if date.Month() == time.January && date.Day() == 1 {
			isHoliday = true
			holidayName = "元旦"
		}
		if date.Month() == time.October && date.Day() >= 1 && date.Day() <= 7 {
			isHoliday = true
			holidayName = "国庆假期"
		}
		if date.Month() == time.February && date.Day() >= 10 && date.Day() <= 17 {
			isHoliday = true
			holidayName = "春节"
		}

		temperature := 15.0 + rand.Float64()*20 - 10
		
		weather := "晴"
		if rand.Float64() < 0.3 {
			weather = "多云"
		} else if rand.Float64() < 0.15 {
			weather = "小雨"
		} else if rand.Float64() < 0.05 {
			weather = "大雨"
		}

		factors = append(factors, ExternalFactor{
			Date:              date.Format("2006-01-02"),
			IsHoliday:         isHoliday,
			HolidayName:       holidayName,
			Temperature:       temperature,
			Weather:           weather,
			EconomicIndicator: 100.0 + (rand.Float64()-0.5)*10,
		})
	}

	return c.JSON(factors)
}
