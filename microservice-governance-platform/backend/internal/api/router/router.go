package router

import (
	"github.com/gin-gonic/gin"
	"microservice-governance-platform/internal/api/handlers"
	"microservice-governance-platform/internal/api/middleware"
)

func SetupRouter() *gin.Engine {
	r := gin.New()

	r.Use(middleware.Logger())
	r.Use(middleware.Recovery())
	r.Use(middleware.CORS())

	api := r.Group("/api")
	{
		api.GET("/health", func(c *gin.Context) {
			c.JSON(200, gin.H{
				"success": true,
				"message": "Service is healthy",
			})
		})

		topology := api.Group("/topology")
		{
			topology.GET("", handlers.GetTopology)
			topology.GET("/services", handlers.GetServices)
			topology.POST("/services", handlers.CreateService)
			topology.GET("/services/:serviceId", handlers.GetServiceHealth)
			topology.PUT("/services/:serviceId", handlers.UpdateService)
			topology.DELETE("/services/:serviceId", handlers.DeleteService)
			topology.GET("/services/:serviceId/metrics", handlers.GetServiceMetrics)
			topology.GET("/services/:serviceId/dependencies", handlers.GetServiceDependencies)
		}

		traffic := api.Group("/traffic")
		{
			canary := traffic.Group("/canary")
			{
				canary.GET("", handlers.GetCanaryRules)
				canary.POST("", handlers.CreateCanaryRule)
				canary.GET("/:id", handlers.GetCanaryRuleByID)
				canary.PUT("/:id", handlers.UpdateCanaryRule)
				canary.DELETE("/:id", handlers.DeleteCanaryRule)
				canary.PUT("/:id/toggle", handlers.ToggleCanaryStatus)
			}

			bluegreen := traffic.Group("/bluegreen")
			{
				bluegreen.GET("", handlers.GetBlueGreenRules)
				bluegreen.POST("", handlers.CreateBlueGreenRule)
				bluegreen.GET("/:id", handlers.GetBlueGreenRuleByID)
				bluegreen.PUT("/:id/complete", handlers.CompleteBlueGreenDeploy)
				bluegreen.PUT("/:id/rollback", handlers.RollbackBlueGreenDeploy)
			}

			circuitbreaker := traffic.Group("/circuitbreaker")
			{
				circuitbreaker.GET("", handlers.GetCircuitBreakerRules)
				circuitbreaker.POST("", handlers.CreateCircuitBreakerRule)
				circuitbreaker.GET("/:id", handlers.GetCircuitBreakerRuleByID)
				circuitbreaker.PUT("/:id", handlers.UpdateCircuitBreakerRule)
				circuitbreaker.DELETE("/:id", handlers.DeleteCircuitBreakerRule)
				circuitbreaker.PUT("/:id/toggle", handlers.ToggleCircuitBreakerStatus)
			}

			mirror := traffic.Group("/mirror")
			{
				mirror.GET("", handlers.GetMirrorRules)
				mirror.POST("", handlers.CreateMirrorRule)
				mirror.GET("/:id", handlers.GetMirrorRuleByID)
				mirror.PUT("/:id", handlers.UpdateMirrorRule)
				mirror.DELETE("/:id", handlers.DeleteMirrorRule)
				mirror.PUT("/:id/toggle", handlers.ToggleMirrorStatus)
			}

			fault := traffic.Group("/fault")
			{
				fault.GET("", handlers.GetFaultRules)
				fault.POST("", handlers.CreateFaultRule)
				fault.GET("/:id", handlers.GetFaultRuleByID)
				fault.POST("/:id/start", handlers.StartFaultInjection)
				fault.POST("/:id/stop", handlers.StopFaultInjection)
				fault.DELETE("/:id", handlers.DeleteFaultRule)
			}

			traffic.GET("/envoy/:serviceName", handlers.GenerateEnvoyConfig)
		}
	}

	return r
}
