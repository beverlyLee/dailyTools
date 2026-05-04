package main

import (
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"

	"travel-itinerary-planner-backend/internal/api"
	"travel-itinerary-planner-backend/internal/config"
	"travel-itinerary-planner-backend/internal/database"
)

func main() {
	config.LoadConfig()

	log.Println("Starting Travel Itinerary Planner Backend...")
	log.Printf("Server mode: %s", config.AppConfig.Server.Mode)

	if err := api.InitAPI(); err != nil {
		log.Printf("Warning: Failed to initialize PDF generator: %v", err)
	}

	router := api.SetupRoutes()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		addr := fmt.Sprintf(":%d", config.AppConfig.Server.Port)
		log.Printf("Server starting on %s", addr)
		if err := router.Run(addr); err != nil {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	<-stop
	log.Println("\nShutting down server...")

	database.CloseDB()
	log.Println("Server stopped gracefully")
}
