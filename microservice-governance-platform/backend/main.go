package main

import (
	"fmt"
	"github.com/gin-gonic/gin"
	"microservice-governance-platform/internal/api/router"
	"microservice-governance-platform/internal/config"
	"os"
)

func main() {
	fmt.Println("Starting Microservice Governance Platform...")

	if err := config.Load(); err != nil {
		fmt.Printf("Failed to load configuration: %v\n", err)
		os.Exit(1)
	}
	fmt.Println("Configuration loaded successfully")

	if config.AppConfig.Server.Mode == "release" {
		gin.SetMode(gin.ReleaseMode)
	} else {
		gin.SetMode(gin.DebugMode)
	}

	r := router.SetupRouter()

	port := config.AppConfig.Server.Port
	addr := fmt.Sprintf(":%d", port)

	fmt.Printf("Server starting on port %d...\n", port)
	fmt.Printf("API endpoints available at http://localhost:%d/api\n", port)
	fmt.Printf("Health check: http://localhost:%d/api/health\n", port)
	fmt.Println("Microservice Governance Platform is ready!")

	if err := r.Run(addr); err != nil {
		fmt.Printf("Failed to start server: %v\n", err)
		os.Exit(1)
	}
}
