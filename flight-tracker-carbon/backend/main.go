package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"flight-tracker-carbon/api"
	"flight-tracker-carbon/internal/carbon"
	"flight-tracker-carbon/internal/database"
	"flight-tracker-carbon/internal/flights"
)

type Config struct {
	Port        string
	DBPath      string
	SimFlightCount int
}

func loadConfig() *Config {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	
	dbPath := os.Getenv("DB_PATH")
	
	simCount := 20
	if count := os.Getenv("SIM_FLIGHT_COUNT"); count != "" {
		var c int
		if _, err := os.Stdout.WriteString(count); err == nil {
			simCount = c
		}
	}
	
	return &Config{
		Port:            port,
		DBPath:          dbPath,
		SimFlightCount:  simCount,
	}
}

func main() {
	config := loadConfig()
	
	log.Println("Starting Flight Tracker Carbon Service...")
	
	log.Println("Initializing database...")
	db, err := database.NewDatabase(config.DBPath)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()
	log.Println("Database initialized successfully")
	
	log.Println("Initializing carbon calculator...")
	calc := carbon.NewCalculator()
	log.Println("Carbon calculator initialized")
	
	log.Println("Initializing flight simulator...")
	sim := flights.NewFlightSimulator(calc, db)
	sim.GenerateInitialFlights(config.SimFlightCount)
	log.Printf("Generated %d simulated flights", config.SimFlightCount)
	
	log.Println("Initializing WebSocket server...")
	wsServer := api.NewWebSocketServer(sim)
	
	mux := http.NewServeMux()
	
	mux.HandleFunc("/ws", wsServer.HandleConnection)
	
	mux.HandleFunc("/api/flights", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Access-Control-Allow-Origin", "*")
		
		flights := sim.GetAllFlights()
		snapshots := make([]map[string]interface{}, len(flights))
		for i, f := range flights {
			snapshots[i] = sim.GetFlightSnapshot(f)
		}
		
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"data":    snapshots,
		})
	})
	
	mux.HandleFunc("/api/stats", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Access-Control-Allow-Origin", "*")
		
		flights := sim.GetAllFlights()
		var totalCO2 float64
		for _, f := range flights {
			snapshot := sim.GetFlightSnapshot(f)
			if co2, ok := snapshot["co2_estimate"].(float64); ok {
				totalCO2 += co2
			}
		}
		
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success":       true,
			"flight_count":  len(flights),
			"ws_connections": wsServer.GetClientCount(),
			"total_co2_kg":  totalCO2,
		})
	})
	
	mux.HandleFunc("/api/carbon/calculate", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Access-Control-Allow-Origin", "*")
		
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"success": false,
				"error":   "Method not allowed",
			})
			return
		}
		
		var req struct {
			FromLat  float64 `json:"from_lat"`
			FromLon  float64 `json:"from_lon"`
			ToLat    float64 `json:"to_lat"`
			ToLon    float64 `json:"to_lon"`
			Aircraft string  `json:"aircraft_type"`
			LoadFactor float64 `json:"load_factor"`
		}
		
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"success": false,
				"error":   "Invalid request body",
			})
			return
		}
		
		acType := carbon.AircraftType(req.Aircraft)
		if req.Aircraft == "" {
			acType = carbon.AircraftA320
		}
		
		result, err := calc.CalculateEmission(
			req.FromLat, req.FromLon,
			req.ToLat, req.ToLon,
			acType,
			req.LoadFactor,
		)
		
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"success": false,
				"error":   err.Error(),
			})
			return
		}
		
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"data": map[string]interface{}{
				"distance_km":           result.DistanceKm,
				"total_co2_kg":          result.TotalCO2Kg,
				"co2_per_passenger_kg":  result.CO2PerPassengerKg,
				"fuel_used_liters":      result.FuelUsedLiters,
			},
		})
	})
	
	server := &http.Server{
		Addr:    ":" + config.Port,
		Handler: mux,
	}
	
	go wsServer.BroadcastUpdates()
	
	go func() {
		log.Printf("Server starting on port %s...", config.Port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()
	
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop
	
	log.Println("Shutting down server...")
	
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	
	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("Server shutdown failed: %v", err)
	}
	
	log.Println("Server stopped gracefully")
}
