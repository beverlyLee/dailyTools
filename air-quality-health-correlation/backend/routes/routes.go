package routes

import (
	"net/http"

	"air-quality-health-correlation/handlers"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func SetupRoutes(r *gin.Engine) {
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	healthHandler := handlers.NewHealthHandler()
	airQualityHandler := handlers.NewAirQualityHandler()
	correlationHandler := handlers.NewCorrelationHandler()

	api := r.Group("/api")
	{
		api.GET("/health", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"status":  "ok",
				"message": "Air Quality Health Correlation API is running",
			})
		})

		health := api.Group("/health-records")
		{
			health.POST("", healthHandler.CreateHealthRecord)
			health.GET("", healthHandler.GetAllHealthRecords)
			health.GET("/date", healthHandler.GetHealthRecordByDate)
			health.GET("/range", healthHandler.GetHealthRecordsByDateRange)
			health.PUT("/:id", healthHandler.UpdateHealthRecord)
			health.DELETE("/:id", healthHandler.DeleteHealthRecord)
		}

		airQuality := api.Group("/air-quality")
		{
			airQuality.GET("/current", airQualityHandler.GetCurrentAirQuality)
			airQuality.GET("/locations", airQualityHandler.GetSupportedLocations)
			airQuality.GET("/data-source-status", airQualityHandler.GetDataSourceStatus)
		}

		correlation := api.Group("/correlation")
		{
			correlation.GET("/analyze", correlationHandler.AnalyzeCorrelation)
			correlation.GET("/mock", correlationHandler.AnalyzeCorrelationWithMockData)
		}
	}
}
