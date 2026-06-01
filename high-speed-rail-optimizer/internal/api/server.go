package api

import (
	"high-speed-rail-optimizer/internal/engine"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

type APIServer struct {
	queryEngine *engine.QueryEngine
	router      *gin.Engine
}

func NewAPIServer(qe *engine.QueryEngine) *APIServer {
	server := &APIServer{
		queryEngine: qe,
		router:      gin.Default(),
	}

	server.setupRoutes()
	return server
}

func (s *APIServer) setupRoutes() {
	s.router.Use(CORS())

	api := s.router.Group("/api")
	{
		api.GET("/query", s.handleQuery)
		api.GET("/stations", s.handleGetStations)
		api.GET("/train-detail", s.handleGetTrainDetail)
		api.POST("/refresh-data", s.handleRefreshData)
		api.GET("/data-sources", s.handleGetDataSources)
	}

	s.router.Static("/assets", "./web/dist/assets")
	s.router.GET("/", s.handleIndex)
	s.router.NoRoute(s.handleIndex)
}

func (s *APIServer) handleIndex(c *gin.Context) {
	c.File("./web/dist/index.html")
}

type QueryRequest struct {
	From       string `form:"from" binding:"required"`
	To         string `form:"to" binding:"required"`
	Date       string `form:"date"`
	TrainTypes string `form:"trainTypes"`
	SeatTypes  string `form:"seatTypes"`
	SortBy     string `form:"sort"`
	DataSource string `form:"dataSource"`
}

func (s *APIServer) handleQuery(c *gin.Context) {
	var req QueryRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "缺少必要参数: from 和 to",
		})
		return
	}

	// 解析车次类型
	var trainTypes []string
	if req.TrainTypes != "" {
		trainTypes = strings.Split(req.TrainTypes, ",")
	}

	// 解析座位类型
	var seatTypes []string
	if req.SeatTypes != "" {
		seatTypes = strings.Split(req.SeatTypes, ",")
	}

	// 解析排序方式
	var sortBy engine.SortType
	switch req.SortBy {
	case "price":
		sortBy = engine.SortByPrice
	case "balanced":
		sortBy = engine.SortByBalanced
	default:
		sortBy = engine.SortByTime
	}

	params := engine.QueryParams{
		From:       req.From,
		To:         req.To,
		Date:       req.Date,
		TrainTypes: trainTypes,
		SeatTypes:  seatTypes,
		SortBy:     sortBy,
		DataSource: req.DataSource,
	}

	results := s.queryEngine.Query(params)

	c.JSON(http.StatusOK, gin.H{
		"success":       true,
		"data":          results,
		"count":         len(results),
		"sortBy":        sortBy,
		"dataSource":    params.DataSource,
		"dataSourceName": getDataSourceName(params.DataSource),
	})
}

func (s *APIServer) handleGetStations(c *gin.Context) {
	stations := s.queryEngine.GetStations()
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    stations,
	})
}

func (s *APIServer) handleGetTrainDetail(c *gin.Context) {
	trainCode := c.Query("trainCode")
	date := c.Query("date")

	if trainCode == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "缺少参数: trainCode",
		})
		return
	}

	detail := s.queryEngine.GetTrainDetail(trainCode, date)
	if detail == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "未找到该车次信息",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    detail,
	})
}

func (s *APIServer) handleRefreshData(c *gin.Context) {
	var req struct {
		From string `json:"from" binding:"required"`
		To   string `json:"to" binding:"required"`
		Date string `json:"date" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "参数错误",
		})
		return
	}

	err := s.queryEngine.RefreshRealTimeData(req.From, req.To, req.Date)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "数据刷新失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "数据刷新成功",
	})
}

func (s *APIServer) handleGetDataSources(c *gin.Context) {
	sources := []map[string]interface{}{
		{
			"id":          "hybrid",
			"name":        "混合模式",
			"description": "优先使用真实数据，回退到模拟数据",
			"priority":    1,
		},
		{
			"id":          "real",
			"name":        "真实数据",
			"description": "仅使用12306官方API数据",
			"priority":    2,
		},
		{
			"id":          "mock",
			"name":        "模拟数据",
			"description": "仅使用模拟数据（开发测试用）",
			"priority":    3,
		},
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    sources,
	})
}

func (s *APIServer) Run(addr string) error {
	return s.router.Run(addr)
}

func getDataSourceName(ds string) string {
	switch ds {
	case "real":
		return "12306实时"
	case "mock":
		return "模拟数据"
	default:
		return "混合模式"
	}
}

func CORS() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}
