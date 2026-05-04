package websocket

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"

	"multiplayer-snake-game/internal/room"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type Server struct {
	Clients        map[string]*Client
	Rooms          map[string]map[string]*Client
	Broadcast      chan []byte
	Register       chan *Client
	Unregister     chan *Client
	RoomManager    *room.RoomManager
	GameLoopManager *GameLoopManager
	mu             sync.RWMutex
}

func NewServer() *Server {
	return &Server{
		Clients:         make(map[string]*Client),
		Rooms:           make(map[string]map[string]*Client),
		Broadcast:       make(chan []byte),
		Register:        make(chan *Client),
		Unregister:      make(chan *Client),
		RoomManager:     room.NewRoomManager(),
		GameLoopManager: NewGameLoopManager(),
	}
}

func (s *Server) Run() {
	for {
		select {
		case client := <-s.Register:
			s.mu.Lock()
			s.Clients[client.ID] = client
			s.mu.Unlock()
			log.Printf("Client %s connected", client.ID)

		case client := <-s.Unregister:
			s.mu.Lock()
			if _, ok := s.Clients[client.ID]; ok {
				delete(s.Clients, client.ID)
				close(client.Send)
				log.Printf("Client %s disconnected", client.ID)

				if client.RoomID != "" {
					client.handleLeaveRoom()
					s.removeClientFromRoom(client.RoomID, client)
				}
			}
			s.mu.Unlock()

		case message := <-s.Broadcast:
			s.mu.RLock()
			for _, client := range s.Clients {
				select {
				case client.Send <- message:
				default:
					close(client.Send)
					delete(s.Clients, client.ID)
				}
			}
			s.mu.RUnlock()
		}
	}
}

func (s *Server) BroadcastToRoom(roomID string, client *Client) {
	s.mu.Lock()
	if s.Rooms[roomID] == nil {
		s.Rooms[roomID] = make(map[string]*Client)
	}
	s.Rooms[roomID][client.ID] = client
	s.mu.Unlock()
}

func (s *Server) BroadcastToRoomExcept(roomID string, exceptClient *Client, msg *Message) {
	data, _ := json.Marshal(msg)

	s.mu.RLock()
	roomClients := s.Rooms[roomID]
	s.mu.RUnlock()

	if roomClients == nil {
		return
	}

	for _, client := range roomClients {
		if client.ID != exceptClient.ID {
			select {
			case client.Send <- data:
			default:
				close(client.Send)
				s.mu.Lock()
				delete(roomClients, client.ID)
				s.mu.Unlock()
			}
		}
	}
}

func (s *Server) BroadcastToAllInRoom(roomID string, msg *Message) {
	data, _ := json.Marshal(msg)

	s.mu.RLock()
	roomClients := s.Rooms[roomID]
	s.mu.RUnlock()

	if roomClients == nil {
		return
	}

	for _, client := range roomClients {
		select {
		case client.Send <- data:
		default:
			close(client.Send)
			s.mu.Lock()
			delete(roomClients, client.ID)
			s.mu.Unlock()
		}
	}
}

func (s *Server) removeClientFromRoom(roomID string, client *Client) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if roomClients, ok := s.Rooms[roomID]; ok {
		delete(roomClients, client.ID)
		if len(roomClients) == 0 {
			delete(s.Rooms, roomID)
		}
	}
}

func (s *Server) ServeWS(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}

	clientID := uuid.New().String()
	client := NewClient(clientID, conn, s)

	client.Server.Register <- client

	go client.WritePump()
	client.ReadPump()
}

type GameLoopManager struct {
	activeLoops map[string]*GameLoop
	mu          sync.RWMutex
}

func NewGameLoopManager() *GameLoopManager {
	return &GameLoopManager{
		activeLoops: make(map[string]*GameLoop),
	}
}

func (glm *GameLoopManager) StartGameLoop(roomID string) {
	glm.mu.Lock()
	defer glm.mu.Unlock()

	if _, exists := glm.activeLoops[roomID]; exists {
		return
	}

	loop := NewGameLoop(roomID)
	glm.activeLoops[roomID] = loop

	go loop.Run()
}

func (glm *GameLoopManager) StopGameLoop(roomID string) {
	glm.mu.Lock()
	defer glm.mu.Unlock()

	if loop, exists := glm.activeLoops[roomID]; exists {
		loop.Stop()
		delete(glm.activeLoops, roomID)
	}
}

type GameLoop struct {
	RoomID   string
	TickRate time.Duration
	stopChan chan struct{}
}

func NewGameLoop(roomID string) *GameLoop {
	return &GameLoop{
		RoomID:   roomID,
		TickRate: 150 * time.Millisecond,
		stopChan: make(chan struct{}),
	}
}

func (gl *GameLoop) Run() {
	ticker := time.NewTicker(gl.TickRate)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			gl.updateGame()
		case <-gl.stopChan:
			return
		}
	}
}

func (gl *GameLoop) updateGame() {
	r, exists := serverInstance.RoomManager.GetRoom(gl.RoomID)
	if !exists || r.Status != room.Playing {
		gl.Stop()
		return
	}

	r.Lock()
	defer r.Unlock()

	r.Game.MoveSnakes()

	foodNeeded := 3 - len(r.Game.State.Foods)
	if foodNeeded > 0 {
		r.Game.GenerateFood(foodNeeded)
	}

	r.Game.CheckGameOver()

	gameStateMsg, _ := NewMessage(TypeGameState, r.Game.State)
	serverInstance.BroadcastToAllInRoom(gl.RoomID, gameStateMsg)

	if r.Game.State.GameOver {
		gameOverMsg, _ := NewMessage(TypeGameOver, GameOverPayload{
			Winner: r.Game.State.Winner,
		})
		serverInstance.BroadcastToAllInRoom(gl.RoomID, gameOverMsg)

		r.Status = room.Finished
		serverInstance.GameLoopManager.StopGameLoop(gl.RoomID)
	}
}

func (gl *GameLoop) Stop() {
	select {
	case gl.stopChan <- struct{}{}:
	default:
	}
}

var serverInstance *Server

func SetServerInstance(s *Server) {
	serverInstance = s
}
