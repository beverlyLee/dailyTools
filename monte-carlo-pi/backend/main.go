package main

import (
	"log"
	"monte-carlo-pi/database"
	"monte-carlo-pi/routers"
)

func main() {
	if err := database.InitDB(); err != nil {
		log.Printf("Warning: Failed to initialize database: %v", err)
	}

	r := routers.SetupRouter()

	log.Println("Starting server on :8080...")
	log.Println("Monte Carlo Pi Estimation Service")
	log.Println("Visit http://localhost:8080 to use the web interface")

	if err := r.Run(":8080"); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
