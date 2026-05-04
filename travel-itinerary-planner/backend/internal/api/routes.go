package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"travel-itinerary-planner-backend/internal/config"
)

func SetupRoutes() *gin.Engine {
	if config.AppConfig.Server.Mode == "release" {
		gin.SetMode(gin.ReleaseMode)
	} else {
		gin.SetMode(gin.DebugMode)
	}

	router := gin.Default()

	router.Use(gin.Logger())
	router.Use(gin.Recovery())
	router.Use(CORSMiddleware())

	api := router.Group("/api/v1")
	{
		api.GET("/health", HealthCheck)

		cities := api.Group("/cities")
		{
			cities.GET("", ListCities)
			cities.GET("/:id", GetCity)
		}

		attractions := api.Group("/attractions")
		{
			attractions.GET("", ListAttractions)
			attractions.GET("/:id", GetAttraction)
			attractions.GET("/city/:cityId", GetAttractionsByCity)
		}

		restaurants := api.Group("/restaurants")
		{
			restaurants.GET("", ListRestaurants)
			restaurants.GET("/:id", GetRestaurant)
			restaurants.GET("/city/:cityId", GetRestaurantsByCity)
		}

		planning := api.Group("/planning")
		{
			planning.POST("/optimize-route", OptimizeRoute)
			planning.POST("/budget-optimize", BudgetOptimize)
			planning.POST("/generate-itinerary", GenerateItinerary)
		}

		itinerary := api.Group("/itineraries")
		{
			itinerary.POST("", CreateItinerary)
			itinerary.GET("/:id", GetItinerary)
			itinerary.PUT("/:id", UpdateItinerary)
			itinerary.DELETE("/:id", DeleteItinerary)
			itinerary.GET("/:id/export-pdf", ExportItineraryPDF)
		}
	}

	return router
}

func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

func HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "ok",
		"message": "Travel Itinerary Planner API is running",
	})
}
