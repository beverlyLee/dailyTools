package api

import (
	"chaos-engineering-platform/pkg/controller"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(
	r *gin.Engine,
	experimentController *controller.ExperimentController,
	faultController *controller.FaultController,
	metricController *controller.MetricController,
	circuitBreakerController *controller.CircuitBreakerController,
) {
	api := r.Group("/api/v1")
	{
		experiments := api.Group("/experiments")
		{
			experiments.GET("", experimentController.List)
			experiments.GET("/:id", experimentController.Get)
			experiments.POST("", experimentController.Create)
			experiments.PUT("/:id", experimentController.Update)
			experiments.DELETE("/:id", experimentController.Delete)
			experiments.POST("/:id/start", experimentController.Start)
			experiments.POST("/:id/pause", experimentController.Pause)
			experiments.POST("/:id/resume", experimentController.Resume)
			experiments.POST("/:id/abort", experimentController.Abort)
			experiments.GET("/:id/logs", experimentController.GetLogs)
			experiments.GET("/:id/status", experimentController.GetStatus)
		}

		faultTypes := api.Group("/fault-types")
		{
			faultTypes.GET("", faultController.ListFaultTypes)
			faultTypes.GET("/:id", faultController.GetFaultType)
		}

		targets := api.Group("/targets")
		{
			targets.GET("/namespaces", faultController.ListNamespaces)
			targets.GET("/pods", faultController.ListPods)
			targets.GET("/services", faultController.ListServices)
		}

		metrics := api.Group("/metrics")
		{
			metrics.GET("", metricController.ListMetrics)
			metrics.GET("/current", metricController.GetCurrent)
			metrics.GET("/:id/history", metricController.GetHistory)
			metrics.GET("/thresholds", metricController.ListThresholds)
			metrics.POST("/thresholds", metricController.CreateThreshold)
			metrics.PUT("/thresholds/:id", metricController.UpdateThreshold)
			metrics.DELETE("/thresholds/:id", metricController.DeleteThreshold)
		}

		steadyStateChecks := api.Group("/steady-state-checks")
		{
			steadyStateChecks.GET("", metricController.ListChecks)
			steadyStateChecks.GET("/:id", metricController.GetCheck)
			steadyStateChecks.POST("", metricController.CreateCheck)
			steadyStateChecks.PUT("/:id", metricController.UpdateCheck)
			steadyStateChecks.POST("/:id/start", metricController.StartCheck)
			steadyStateChecks.POST("/:id/stop", metricController.StopCheck)
		}

		violations := api.Group("/violations")
		{
			violations.GET("", metricController.ListViolations)
			violations.POST("/:id/acknowledge", metricController.AcknowledgeViolation)
		}

		circuitBreaker := api.Group("/circuit-breaker")
		{
			circuitBreaker.GET("/status", circuitBreakerController.GetStatus)
			circuitBreaker.GET("/events", circuitBreakerController.ListEvents)
			circuitBreaker.POST("/rollback", circuitBreakerController.TriggerRollback)
		}
	}
}
