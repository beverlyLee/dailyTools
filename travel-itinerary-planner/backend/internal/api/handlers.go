package api

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"travel-itinerary-planner-backend/internal/algorithm"
	"travel-itinerary-planner-backend/internal/database"
	"travel-itinerary-planner-backend/internal/service"
)

var knowledgeGraph *algorithm.KnowledgeGraph
var pdfGenerator *service.PDFGenerator

func InitAPI() error {
	knowledgeGraph = algorithm.NewKnowledgeGraph()
	initSampleData()

	var err error
	pdfGenerator, err = service.NewPDFGenerator()
	if err != nil {
		return fmt.Errorf("failed to initialize PDF generator: %v", err)
	}

	return nil
}

func initSampleData() {
	knowledgeGraph.AddNode("beijing", algorithm.NodeTypeCity, "北京", map[string]interface{}{
		"latitude":  39.9042,
		"longitude": 116.4074,
		"country":   "中国",
	})

	knowledgeGraph.AddNode("forbidden_city", algorithm.NodeTypeAttraction, "故宫博物院", map[string]interface{}{
		"latitude":      39.9163,
		"longitude":     116.3972,
		"city_id":       "beijing",
		"entry_fee":     60.0,
		"visit_duration": 180,
		"rating":        4.9,
		"open_time":     "08:30",
		"close_time":    "17:00",
	})

	knowledgeGraph.AddNode("summer_palace", algorithm.NodeTypeAttraction, "颐和园", map[string]interface{}{
		"latitude":      39.9999,
		"longitude":     116.2755,
		"city_id":       "beijing",
		"entry_fee":     30.0,
		"visit_duration": 120,
		"rating":        4.7,
		"open_time":     "06:30",
		"close_time":    "18:00",
	})

	knowledgeGraph.AddNode("great_wall", algorithm.NodeTypeAttraction, "长城(八达岭)", map[string]interface{}{
		"latitude":      40.3576,
		"longitude":     116.0200,
		"city_id":       "beijing",
		"entry_fee":     45.0,
		"visit_duration": 240,
		"rating":        4.8,
		"open_time":     "06:30",
		"close_time":    "19:00",
	})

	knowledgeGraph.AddNode("temple_heaven", algorithm.NodeTypeAttraction, "天坛公园", map[string]interface{}{
		"latitude":      39.8882,
		"longitude":     116.4172,
		"city_id":       "beijing",
		"entry_fee":     15.0,
		"visit_duration": 90,
		"rating":        4.6,
		"open_time":     "06:00",
		"close_time":    "22:00",
	})

	knowledgeGraph.AddEdge("beijing", "forbidden_city", algorithm.RelationLocatedIn, 1.0, nil)
	knowledgeGraph.AddEdge("beijing", "summer_palace", algorithm.RelationLocatedIn, 1.0, nil)
	knowledgeGraph.AddEdge("beijing", "great_wall", algorithm.RelationLocatedIn, 1.0, nil)
	knowledgeGraph.AddEdge("beijing", "temple_heaven", algorithm.RelationLocatedIn, 1.0, nil)

	knowledgeGraph.AddNode("quanjude", algorithm.NodeTypeRestaurant, "全聚德(王府井店)", map[string]interface{}{
		"latitude":    39.9147,
		"longitude":   116.4104,
		"city_id":     "beijing",
		"cuisine_type": "北京菜",
		"avg_price":   200.0,
		"rating":      4.5,
		"open_time":   "11:00",
		"close_time":  "21:00",
	})

	knowledgeGraph.AddNode("din_tai_fung", algorithm.NodeTypeRestaurant, "鼎泰丰", map[string]interface{}{
		"latitude":    39.9089,
		"longitude":   116.4012,
		"city_id":     "beijing",
		"cuisine_type": "台湾菜",
		"avg_price":   150.0,
		"rating":      4.6,
		"open_time":   "10:00",
		"close_time":  "22:00",
	})
}

func ListCities(c *gin.Context) {
	cities := knowledgeGraph.GetAllCities()
	result := make([]map[string]interface{}, 0, len(cities))

	for _, city := range cities {
		result = append(result, map[string]interface{}{
			"id":          city.ID,
			"name":        city.Label,
			"type":        city.Type,
			"latitude":   city.Data["latitude"],
			"longitude":  city.Data["longitude"],
			"country":    city.Data["country"],
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result,
	})
}

func GetCity(c *gin.Context) {
	id := c.Param("id")
	city := knowledgeGraph.GetNode(id)

	if city == nil || city.Type != algorithm.NodeTypeCity {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "City not found",
		})
		return
	}

	attractions := knowledgeGraph.GetAttractionsInCity(id)
	restaurants := knowledgeGraph.GetRestaurantsInCity(id)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": map[string]interface{}{
			"id":          city.ID,
			"name":        city.Label,
			"type":        city.Type,
			"latitude":   city.Data["latitude"],
			"longitude":  city.Data["longitude"],
			"country":    city.Data["country"],
			"attractions": attractions,
			"restaurants": restaurants,
		},
	})
}

func ListAttractions(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "List attractions endpoint",
	})
}

func GetAttraction(c *gin.Context) {
	id := c.Param("id")
	attraction := knowledgeGraph.GetNode(id)

	if attraction == nil || attraction.Type != algorithm.NodeTypeAttraction {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Attraction not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": map[string]interface{}{
			"id":             attraction.ID,
			"name":           attraction.Label,
			"type":           attraction.Type,
			"latitude":       attraction.Data["latitude"],
			"longitude":      attraction.Data["longitude"],
			"city_id":        attraction.Data["city_id"],
			"entry_fee":      attraction.Data["entry_fee"],
			"visit_duration": attraction.Data["visit_duration"],
			"rating":         attraction.Data["rating"],
			"open_time":      attraction.Data["open_time"],
			"close_time":     attraction.Data["close_time"],
		},
	})
}

func GetAttractionsByCity(c *gin.Context) {
	cityID := c.Param("cityId")

	attractions := knowledgeGraph.FindNearbyAttractions(cityID, 100.0)
	result := make([]map[string]interface{}, 0, len(attractions))

	for _, attr := range attractions {
		result = append(result, map[string]interface{}{
			"id":             attr.ID,
			"name":           attr.Label,
			"latitude":       attr.Data["latitude"],
			"longitude":      attr.Data["longitude"],
			"entry_fee":      attr.Data["entry_fee"],
			"visit_duration": attr.Data["visit_duration"],
			"rating":         attr.Data["rating"],
			"open_time":      attr.Data["open_time"],
			"close_time":     attr.Data["close_time"],
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result,
	})
}

func ListRestaurants(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "List restaurants endpoint",
	})
}

func GetRestaurant(c *gin.Context) {
	id := c.Param("id")
	restaurant := knowledgeGraph.GetNode(id)

	if restaurant == nil || restaurant.Type != algorithm.NodeTypeRestaurant {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Restaurant not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": map[string]interface{}{
			"id":           restaurant.ID,
			"name":         restaurant.Label,
			"type":         restaurant.Type,
			"latitude":     restaurant.Data["latitude"],
			"longitude":    restaurant.Data["longitude"],
			"city_id":      restaurant.Data["city_id"],
			"cuisine_type": restaurant.Data["cuisine_type"],
			"avg_price":    restaurant.Data["avg_price"],
			"rating":       restaurant.Data["rating"],
			"open_time":    restaurant.Data["open_time"],
			"close_time":   restaurant.Data["close_time"],
		},
	})
}

func GetRestaurantsByCity(c *gin.Context) {
	cityID := c.Param("cityId")

	restaurants := knowledgeGraph.GetRestaurantsInCity(cityID)
	result := make([]map[string]interface{}, 0, len(restaurants))

	for _, rest := range restaurants {
		result = append(result, map[string]interface{}{
			"id":           rest.ID,
			"name":         rest.Label,
			"latitude":     rest.Data["latitude"],
			"longitude":    rest.Data["longitude"],
			"cuisine_type": rest.Data["cuisine_type"],
			"avg_price":    rest.Data["avg_price"],
			"rating":       rest.Data["rating"],
			"open_time":    rest.Data["open_time"],
			"close_time":   rest.Data["close_time"],
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result,
	})
}

type OptimizeRouteRequest struct {
	Points []struct {
		ID         string  `json:"id"`
		Latitude   float64 `json:"latitude"`
		Longitude  float64 `json:"longitude"`
		OpenTime   string  `json:"open_time"`
		CloseTime  string  `json:"close_time"`
		Duration   int     `json:"duration"`
		Cost       float64 `json:"cost"`
	} `json:"points"`
	SpeedKmh float64 `json:"speed_kmh"`
}

func OptimizeRoute(c *gin.Context) {
	var req OptimizeRouteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	points := make([]algorithm.VisitPoint, 0, len(req.Points))
	baseDate := time.Now().Truncate(24 * time.Hour)

	for _, p := range req.Points {
		var startTime, endTime time.Time

		if p.OpenTime != "" && p.CloseTime != "" {
			openHour, _ := strconv.Atoi(p.OpenTime[:2])
			openMin, _ := strconv.Atoi(p.OpenTime[3:])
			closeHour, _ := strconv.Atoi(p.CloseTime[:2])
			closeMin, _ := strconv.Atoi(p.CloseTime[3:])

			startTime = baseDate.Add(time.Duration(openHour)*time.Hour + time.Duration(openMin)*time.Minute)
			endTime = baseDate.Add(time.Duration(closeHour)*time.Hour + time.Duration(closeMin)*time.Minute)
		} else {
			startTime = baseDate.Add(8 * time.Hour)
			endTime = baseDate.Add(20 * time.Hour)
		}

		points = append(points, algorithm.VisitPoint{
			Location: algorithm.Location{
				ID:        p.ID,
				Latitude:  p.Latitude,
				Longitude: p.Longitude,
			},
			TimeWindow: algorithm.TimeWindow{
				Start: startTime,
				End:   endTime,
			},
			Duration: p.Duration,
			Cost:     p.Cost,
		})
	}

	result, err := algorithm.OptimizePath(points, req.SpeedKmh)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	optimizedPath := make([]map[string]interface{}, 0, len(result.Path))
	for i, idx := range result.Path {
		optimizedPath = append(optimizedPath, map[string]interface{}{
			"order":       i + 1,
			"point_id":    req.Points[idx].ID,
			"arrival_time": result.VisitTimes[i].Format("15:04"),
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"optimized_path":  optimizedPath,
			"total_distance":  result.TotalDistance,
			"is_valid":        result.Valid,
			"original_points": req.Points,
		},
	})
}

type BudgetOptimizeRequest struct {
	Items []struct {
		ID       string  `json:"id"`
		Name     string  `json:"name"`
		Cost     float64 `json:"cost"`
		Value    float64 `json:"value"`
		Duration int     `json:"duration"`
	} `json:"items"`
	Budget       float64 `json:"budget"`
	MaxDuration  int     `json:"max_duration"`
	Days         int     `json:"days"`
	DailyHours   int     `json:"daily_hours"`
}

func BudgetOptimize(c *gin.Context) {
	var req BudgetOptimizeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	items := make([]*algorithm.BudgetItem, 0, len(req.Items))
	for _, item := range req.Items {
		value := item.Value
		if value <= 0 {
			value = algorithm.CalculateItemValue(map[string]interface{}{
				"rating":         4.5,
				"visit_duration": item.Duration,
			})
		}
		items = append(items, &algorithm.BudgetItem{
			ID:       item.ID,
			Name:     item.Name,
			Cost:     item.Cost,
			Value:    value,
			Duration: item.Duration,
		})
	}

	var dailyResults []*algorithm.BudgetResult
	if req.Days > 1 {
		dailyBudget := req.Budget / float64(req.Days)
		dailyResults = algorithm.OptimizeItineraryWithConstraints(items, dailyBudget, req.Days, req.DailyHours)
	} else {
		result := algorithm.MaximizeCoverageWithBudget(items, req.Budget, req.MaxDuration)
		dailyResults = []*algorithm.BudgetResult{result}
	}

	response := make([]map[string]interface{}, 0, len(dailyResults))
	for day, result := range dailyResults {
		selectedItems := make([]map[string]interface{}, 0, len(result.SelectedItems))
		for _, item := range result.SelectedItems {
			selectedItems = append(selectedItems, map[string]interface{}{
				"id":       item.ID,
				"name":     item.Name,
				"cost":     item.Cost,
				"value":    item.Value,
				"duration": item.Duration,
			})
		}

		response = append(response, map[string]interface{}{
			"day":             day + 1,
			"selected_items":  selectedItems,
			"total_cost":      result.TotalCost,
			"total_value":     result.TotalValue,
			"total_duration":  result.TotalDuration,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"daily_plans": response,
			"total_budget": req.Budget,
			"days":         req.Days,
		},
	})
}

type GenerateItineraryRequest struct {
	CityID       string  `json:"city_id"`
	StartDate    string  `json:"start_date"`
	EndDate      string  `json:"end_date"`
	TotalBudget  float64 `json:"total_budget"`
	DailyHours   int     `json:"daily_hours"`
}

func GenerateItinerary(c *gin.Context) {
	var req GenerateItineraryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	attractions := knowledgeGraph.FindNearbyAttractions(req.CityID, 100.0)
	restaurants := knowledgeGraph.GetRestaurantsInCity(req.CityID)

	items := make([]*algorithm.BudgetItem, 0, len(attractions))
	for _, attr := range attractions {
		cost, _ := attr.Data["entry_fee"].(float64)
		duration, _ := attr.Data["visit_duration"].(int)
		rating, _ := attr.Data["rating"].(float64)

		value := rating * 10
		if value <= 0 {
			value = 5.0
		}

		items = append(items, &algorithm.BudgetItem{
			ID:       attr.ID,
			Name:     attr.Label,
			Cost:     cost,
			Value:    value,
			Duration: duration,
		})
	}

	startDate, _ := time.Parse("2006-01-02", req.StartDate)
	endDate, _ := time.Parse("2006-01-02", req.EndDate)
	days := int(endDate.Sub(startDate).Hours()/24) + 1

	if days < 1 {
		days = 1
	}

	dailyBudget := req.TotalBudget / float64(days)
	if req.DailyHours <= 0 {
		req.DailyHours = 8
	}

	dailyResults := algorithm.OptimizeItineraryWithConstraints(items, dailyBudget, days, req.DailyHours)

	itinerary := make([]map[string]interface{}, 0, len(dailyResults))
	for dayIdx, result := range dailyResults {
		dayItems := make([]map[string]interface{}, 0, len(result.SelectedItems))
		currentTime := 8 * 60

		for _, item := range result.SelectedItems {
			startHour := currentTime / 60
			startMin := currentTime % 60
			endHour := (currentTime + item.Duration) / 60
			endMin := (currentTime + item.Duration) % 60

			dayItems = append(dayItems, map[string]interface{}{
				"id":          item.ID,
				"name":        item.Name,
				"type":        "attraction",
				"start_time":  fmt.Sprintf("%02d:%02d", startHour, startMin),
				"end_time":    fmt.Sprintf("%02d:%02d", endHour, endMin),
				"cost":        item.Cost,
				"duration":    item.Duration,
			})

			currentTime += item.Duration + 30
		}

		for _, rest := range restaurants {
			price, _ := rest.Data["avg_price"].(float64)
			if price <= dailyBudget/3 {
				dayItems = append(dayItems, map[string]interface{}{
					"id":         rest.ID,
					"name":       rest.Label,
					"type":       "restaurant",
					"start_time": "12:00",
					"end_time":   "13:00",
					"cost":       price,
				})
				break
			}
		}

		itinerary = append(itinerary, map[string]interface{}{
			"day_number":     dayIdx + 1,
			"items":          dayItems,
			"total_cost":     result.TotalCost,
			"total_duration": result.TotalDuration,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"city_id":      req.CityID,
			"start_date":   req.StartDate,
			"end_date":     req.EndDate,
			"total_budget": req.TotalBudget,
			"days":         days,
			"itinerary":    itinerary,
		},
	})
}

func CreateItinerary(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Create itinerary endpoint",
	})
}

func GetItinerary(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Get itinerary endpoint",
	})
}

func UpdateItinerary(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Update itinerary endpoint",
	})
}

func DeleteItinerary(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Delete itinerary endpoint",
	})
}

func ExportItineraryPDF(c *gin.Context) {
	id := c.Param("id")

	itineraryData := &service.ItineraryData{
		Title:       "北京三日游行程",
		City:        "北京",
		StartDate:   "2024-06-01",
		EndDate:     "2024-06-03",
		TotalBudget: 3000,
		Items: []*service.ItineraryItem{
			{
				ID:           1,
				ItemType:     "attraction",
				Name:         "故宫博物院",
				DayNumber:    1,
				StartTime:    "09:00",
				EndTime:      "12:00",
				Cost:         60,
				SequenceOrder: 1,
			},
			{
				ID:           2,
				ItemType:     "restaurant",
				Name:         "全聚德",
				DayNumber:    1,
				StartTime:    "12:30",
				EndTime:      "14:00",
				Cost:         200,
				SequenceOrder: 2,
			},
			{
				ID:           3,
				ItemType:     "attraction",
				Name:         "颐和园",
				DayNumber:    2,
				StartTime:    "09:00",
				EndTime:      "11:00",
				Cost:         30,
				SequenceOrder: 1,
			},
			{
				ID:           4,
				ItemType:     "attraction",
				Name:         "长城(八达岭)",
				DayNumber:    3,
				StartTime:    "08:00",
				EndTime:      "12:00",
				Cost:         45,
				SequenceOrder: 1,
			},
		},
	}

	pdf, err := pdfGenerator.GenerateItineraryPDF(context.Background(), itineraryData)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=itinerary_%s.pdf", id))
	c.Data(http.StatusOK, "application/pdf", pdf)
}
