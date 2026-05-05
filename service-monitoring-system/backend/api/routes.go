package api

import (
	"net/http"

	"service-monitoring-system/pkg/monitoring"
	"service-monitoring-system/pkg/selfhealing"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(r *gin.Engine, monitoringSvc *monitoring.Service, selfHealingSvc *selfhealing.Service) {
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "healthy"})
	})

	r.GET("/metrics", gin.WrapH(monitoringSvc.MetricsHandler()))

	api := r.Group("/api")
	{
		api.GET("/dashboard", func(c *gin.Context) {
			metrics := monitoringSvc.GetMetrics()
			healingData := selfHealingSvc.GetDashboardData()
			
			c.JSON(http.StatusOK, gin.H{
				"metrics":   metrics,
				"selfHealing": healingData,
			})
		})

		api.GET("/metrics/data", func(c *gin.Context) {
			c.JSON(http.StatusOK, monitoringSvc.GetMetrics())
		})

		api.GET("/probes", func(c *gin.Context) {
			targets := monitoringSvc.GetBlackboxTargets()
			c.JSON(http.StatusOK, gin.H{"targets": targets})
		})

		api.GET("/fault-scenarios", func(c *gin.Context) {
			scenarios := selfHealingSvc.GetFaultScenarios()
			c.JSON(http.StatusOK, gin.H{"scenarios": scenarios})
		})

		api.GET("/repair-scripts", func(c *gin.Context) {
			scripts := selfHealingSvc.GetRepairScripts()
			c.JSON(http.StatusOK, gin.H{"scripts": scripts})
		})

		api.GET("/fault-records", func(c *gin.Context) {
			records := selfHealingSvc.GetFaultRecords()
			c.JSON(http.StatusOK, gin.H{"records": records})
		})

		api.GET("/approval-queue", func(c *gin.Context) {
			queue := selfHealingSvc.GetApprovalQueue()
			c.JSON(http.StatusOK, gin.H{"queue": queue})
		})

		api.POST("/approve/:requestId", func(c *gin.Context) {
			requestId := c.Param("requestId")
			approver := c.DefaultQuery("approver", "system")
			
			if selfHealingSvc.ApproveRequest(requestId, approver) {
				c.JSON(http.StatusOK, gin.H{"message": "请求已批准"})
			} else {
				c.JSON(http.StatusNotFound, gin.H{"error": "请求不存在或已处理"})
			}
		})

		api.POST("/reject/:requestId", func(c *gin.Context) {
			requestId := c.Param("requestId")
			approver := c.DefaultQuery("approver", "system")
			
			if selfHealingSvc.RejectRequest(requestId, approver) {
				c.JSON(http.StatusOK, gin.H{"message": "请求已拒绝"})
			} else {
				c.JSON(http.StatusNotFound, gin.H{"error": "请求不存在或已处理"})
			}
		})
	}

	r.Use(corsMiddleware())
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
