package main

import (
	"log"
	"monte-carlo-pi-estimator/database"
	"monte-carlo-pi-estimator/routers"
)

func main() {
	if err := database.InitDB(); err != nil {
		log.Printf("Warning: Failed to initialize database: %v", err)
	}

	r := routers.SetupRouter()

	log.Println("Starting Monte Carlo Pi Estimation Server on :8002...")
	log.Println("Visit http://localhost:8002 to use the web interface")
	log.Println("API endpoints:")
	log.Println("  POST /api/estimate     - Start Pi estimation")
	log.Println("  GET  /api/history      - Get estimation history")
	log.Println("  GET  /api/sample-points - Get sample points for animation")

	if err := r.Run(":8002"); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
