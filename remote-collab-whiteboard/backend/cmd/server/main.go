package main

import (
	"log"
	"net/http"

	"github.com/whiteboard/backend/internal/config"
	"github.com/whiteboard/backend/internal/hub"
	"github.com/whiteboard/backend/internal/websocket"
)

func main() {
	cfg := config.Load()
	
	roomHub := hub.NewHub()
	go roomHub.Run()
	
	handler := websocket.NewHandler(roomHub)
	
	http.HandleFunc("/health", healthHandler)
	http.HandleFunc("/ws", handler.ServeHTTP)
	
	log.Printf("Server starting on port %s", cfg.Port)
	log.Printf("WebSocket endpoint: ws://localhost:%s/ws?room=<room-id>", cfg.Port)
	log.Printf("Press Ctrl+C to stop")
	
	if err := http.ListenAndServe(":"+cfg.Port, nil); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status":"ok"}`))
}
