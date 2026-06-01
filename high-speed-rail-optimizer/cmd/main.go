package main

import (
	"fmt"
	"high-speed-rail-optimizer/internal/api"
	"high-speed-rail-optimizer/internal/data"
	"high-speed-rail-optimizer/internal/engine"
	"log"
)

func main() {
	dataPath := "./data"

	dl := data.NewDataLoader(dataPath)
	err := dl.LoadAll()
	if err != nil {
		log.Fatalf("Failed to load data: %v", err)
	}

	fmt.Printf("Loaded %d stations\n", len(dl.GetStations()))
	fmt.Printf("Loaded %d train schedules\n", len(dl.GetTimetable()))

	qe := engine.NewQueryEngine(dl)

	server := api.NewAPIServer(qe)

	fmt.Println("High-Speed Rail Optimizer starting on :8080")
	fmt.Println("API Endpoints:")
	fmt.Println("  GET /api/query?from=BJP&to=SHH&sort=time")
	fmt.Println("  GET /api/query?from=BJP&to=SHH&sort=price")
	fmt.Println("  GET /api/query?from=BJP&to=SHH&sort=balanced")
	fmt.Println("  GET /api/stations")

	err = server.Run(":8080")
	if err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
