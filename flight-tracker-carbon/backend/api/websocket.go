package api

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"

	"flight-tracker-carbon/internal/flights"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type WebSocketServer struct {
	clients   map[*websocket.Conn]bool
	broadcast chan []byte
	simulator *flights.FlightSimulator
	mu        sync.RWMutex
}

func NewWebSocketServer(sim *flights.FlightSimulator) *WebSocketServer {
	return &WebSocketServer{
		clients:   make(map[*websocket.Conn]bool),
		broadcast: make(chan []byte, 256),
		simulator: sim,
	}
}

func (s *WebSocketServer) HandleConnection(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}
	
	s.mu.Lock()
	s.clients[conn] = true
	s.mu.Unlock()
	
	log.Printf("New WebSocket client connected. Total clients: %d", len(s.clients))
	
	s.sendFlightList(conn)
	
	defer func() {
		s.mu.Lock()
		delete(s.clients, conn)
		s.mu.Unlock()
		conn.Close()
		log.Printf("WebSocket client disconnected. Total clients: %d", len(s.clients))
	}()
	
	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
			break
		}
	}
}

func (s *WebSocketServer) sendFlightList(conn *websocket.Conn) {
	flights := s.simulator.GetAllFlights()
	
	snapshots := make([]map[string]interface{}, len(flights))
	for i, f := range flights {
		snapshots[i] = s.simulator.GetFlightSnapshot(f)
	}
	
	msg := map[string]interface{}{
		"type":    "flight_list",
		"payload": snapshots,
	}
	
	data, err := json.Marshal(msg)
	if err != nil {
		log.Printf("JSON marshal error: %v", err)
		return
	}
	
	s.mu.RLock()
	conn.WriteMessage(websocket.TextMessage, data)
	s.mu.RUnlock()
}

func (s *WebSocketServer) BroadcastUpdates() {
	ticker := time.NewTicker(500 * time.Millisecond)
	defer ticker.Stop()
	
	for range ticker.C {
		s.simulator.UpdateAllFlights()
		
		flights := s.simulator.GetAllFlights()
		for _, f := range flights {
			snapshot := s.simulator.GetFlightSnapshot(f)
			
			msg := map[string]interface{}{
				"type":    "flight_update",
				"payload": snapshot,
			}
			
			data, err := json.Marshal(msg)
			if err != nil {
				log.Printf("JSON marshal error: %v", err)
				continue
			}
			
			s.mu.RLock()
			for client := range s.clients {
				err := client.WriteMessage(websocket.TextMessage, data)
				if err != nil {
					log.Printf("WebSocket write error: %v", err)
					client.Close()
					s.mu.RUnlock()
					s.mu.Lock()
					delete(s.clients, client)
					s.mu.Unlock()
					s.mu.RLock()
				}
			}
			s.mu.RUnlock()
		}
	}
}

func (s *WebSocketServer) GetClientCount() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.clients)
}
