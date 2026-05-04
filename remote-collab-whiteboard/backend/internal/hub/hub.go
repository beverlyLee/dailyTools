package hub

import (
	"encoding/json"
	"log"
	"sync"
)

type MessageType int

const (
	BinaryMessage MessageType = iota
	TextMessage
)

type Message struct {
	RoomID  string
	Data    []byte
	Type    MessageType
	Sender  *Client
}

type Client struct {
	ID     string
	RoomID string
	Send   chan Message
	hub    *Hub
}

type Room struct {
	ID      string
	Clients map[*Client]bool
}

type Hub struct {
	rooms      map[string]*Room
	register   chan *Client
	unregister chan *Client
	broadcast  chan Message
	mu         sync.RWMutex
}

type SyncMessage struct {
	Type string `json:"type"`
}

func NewHub() *Hub {
	return &Hub{
		rooms:      make(map[string]*Room),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		broadcast:  make(chan Message, 256),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.handleRegister(client)
		case client := <-h.unregister:
			h.handleUnregister(client)
		case message := <-h.broadcast:
			h.handleBroadcast(message)
		}
	}
}

func (h *Hub) handleRegister(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	room, exists := h.rooms[client.RoomID]
	if !exists {
		room = &Room{
			ID:      client.RoomID,
			Clients: make(map[*Client]bool),
		}
		h.rooms[client.RoomID] = room
		log.Printf("Room created: %s", client.RoomID)
	}

	clientCount := len(room.Clients)
	room.Clients[client] = true
	log.Printf("Client %s joined room %s (total: %d)", client.ID, client.RoomID, len(room.Clients))

	if clientCount > 0 {
		syncMsg := SyncMessage{Type: "sync-required"}
		msgData, _ := json.Marshal(syncMsg)

		for c := range room.Clients {
			if c != client {
				select {
				case c.Send <- Message{
					RoomID: client.RoomID,
					Data:   msgData,
					Type:   TextMessage,
					Sender: client,
				}:
				default:
				}
			}
		}
		log.Printf("Requested sync from existing clients for new client %s", client.ID)
	}
}

func (h *Hub) handleUnregister(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	room, exists := h.rooms[client.RoomID]
	if !exists {
		return
	}

	if _, ok := room.Clients[client]; ok {
		delete(room.Clients, client)
		close(client.Send)
		log.Printf("Client %s left room %s (remaining: %d)", client.ID, client.RoomID, len(room.Clients))
	}

	if len(room.Clients) == 0 {
		delete(h.rooms, client.RoomID)
		log.Printf("Room deleted: %s (no clients left)", client.RoomID)
	}
}

func (h *Hub) handleBroadcast(message Message) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	room, exists := h.rooms[message.RoomID]
	if !exists {
		return
	}

	for client := range room.Clients {
		if client != message.Sender {
			select {
			case client.Send <- message:
			default:
				close(client.Send)
				delete(room.Clients, client)
			}
		}
	}
}

func (h *Hub) Register(client *Client) {
	client.hub = h
	h.register <- client
}

func (h *Hub) Unregister(client *Client) {
	h.unregister <- client
}

func (h *Hub) Broadcast(message Message) {
	h.broadcast <- message
}

func (h *Hub) GetRoomClientCount(roomID string) int {
	h.mu.RLock()
	defer h.mu.RUnlock()

	if room, exists := h.rooms[roomID]; exists {
		return len(room.Clients)
	}
	return 0
}
