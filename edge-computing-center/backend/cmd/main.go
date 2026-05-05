package main

import (
	"log"
	"edge-computing-center/internal/controllers"
	"edge-computing-center/internal/middleware"
	"github.com/gin-gonic/gin"
)

func main() {
	r := gin.Default()

	// Middleware
	r.Use(middleware.CORSMiddleware())
	r.Use(middleware.LoggerMiddleware())

	// API routes
	api := r.Group("/api")
	{
		// Node management
		nodeController := controllers.NewNodeController()
		api.GET("/nodes", nodeController.GetAllNodes)
		api.GET("/nodes/:id", nodeController.GetNodeByID)
		api.POST("/nodes", nodeController.CreateNode)
		api.PUT("/nodes/:id", nodeController.UpdateNode)
		api.DELETE("/nodes/:id", nodeController.DeleteNode)

		// Resource monitoring
		api.GET("/nodes/:id/stats", nodeController.GetNodeStats)
		api.GET("/nodes/:id/metrics", nodeController.GetNodeMetrics)

		// SSH terminal
		api.GET("/nodes/:id/ssh", nodeController.ConnectSSH)
		api.GET("/nodes/:id/ssh/ws", nodeController.SSHWebSocket)

		// Application management
		appController := controllers.NewAppController()
		api.GET("/apps", appController.GetAllApps)
		api.GET("/apps/:id", appController.GetAppByID)
		api.POST("/apps", appController.CreateApp)
		api.DELETE("/apps/:id", appController.DeleteApp)

		// Deployment management
		deployController := controllers.NewDeploymentController()
		api.POST("/deployments", deployController.CreateDeployment)
		api.GET("/deployments/:id", deployController.GetDeploymentByID)
		api.GET("/deployments", deployController.GetAllDeployments)
		api.POST("/deployments/:id/rollback", deployController.RollbackDeployment)

		// Log streaming
		api.GET("/deployments/:id/logs", deployController.StreamLogs)
		api.GET("/deployments/:id/logs/ws", deployController.LogsWebSocket)
	}

	// Start server
	log.Println("Edge Computing Center backend starting on :8080")
	if err := r.Run(":8080"); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
