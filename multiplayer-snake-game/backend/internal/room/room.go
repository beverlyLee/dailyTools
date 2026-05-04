package room

import (
	"crypto/rand"
	"encoding/hex"
	"sync"
	"time"

	"multiplayer-snake-game/internal/game"
)

type RoomStatus string

const (
	Waiting  RoomStatus = "waiting"
	Playing  RoomStatus = "playing"
	Finished RoomStatus = "finished"
)

type Room struct {
	ID          string              `json:"id"`
	Name        string              `json:"name"`
	OwnerID     string              `json:"ownerId"`
	Status      RoomStatus          `json:"status"`
	CreatedAt   time.Time           `json:"createdAt"`
	MaxPlayers  int                 `json:"maxPlayers"`
	Game        *game.Game          `json:"-"`
	PlayerNames map[string]string   `json:"playerNames"`
	InviteCode  string              `json:"inviteCode"`
	mu          sync.RWMutex
}

type RoomManager struct {
	rooms map[string]*Room
	mu    sync.RWMutex
}

func NewRoomManager() *RoomManager {
	return &RoomManager{
		rooms: make(map[string]*Room),
	}
}

func generateRandomID(length int) string {
	bytes := make([]byte, length/2)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}

func (rm *RoomManager) CreateRoom(ownerID, ownerName, roomName string, maxPlayers int) *Room {
	roomID := generateRandomID(8)
	inviteCode := generateRandomID(6)

	gameInstance := game.NewGame(20, 20)

	room := &Room{
		ID:          roomID,
		Name:        roomName,
		OwnerID:     ownerID,
		Status:      Waiting,
		CreatedAt:   time.Now(),
		MaxPlayers:  maxPlayers,
		Game:        gameInstance,
		PlayerNames: map[string]string{ownerID: ownerName},
		InviteCode:  inviteCode,
	}

	rm.mu.Lock()
	rm.rooms[roomID] = room
	rm.mu.Unlock()

	return room
}

func (rm *RoomManager) GetRoom(roomID string) (*Room, bool) {
	rm.mu.RLock()
	room, exists := rm.rooms[roomID]
	rm.mu.RUnlock()
	return room, exists
}

func (rm *RoomManager) GetRoomByInviteCode(inviteCode string) (*Room, bool) {
	rm.mu.RLock()
	defer rm.mu.RUnlock()

	for _, room := range rm.rooms {
		if room.InviteCode == inviteCode {
			return room, true
		}
	}
	return nil, false
}

func (rm *RoomManager) JoinRoom(roomID, playerID, playerName string) (*Room, bool) {
	rm.mu.Lock()
	defer rm.mu.Unlock()

	room, exists := rm.rooms[roomID]
	if !exists {
		return nil, false
	}

	room.mu.Lock()
	defer room.mu.Unlock()

	if room.Status != Waiting {
		return nil, false
	}

	if len(room.PlayerNames) >= room.MaxPlayers {
		return nil, false
	}

	if _, alreadyJoined := room.PlayerNames[playerID]; alreadyJoined {
		return room, true
	}

	room.PlayerNames[playerID] = playerName
	return room, true
}

func (rm *RoomManager) LeaveRoom(roomID, playerID string) {
	rm.mu.Lock()
	defer rm.mu.Unlock()

	room, exists := rm.rooms[roomID]
	if !exists {
		return
	}

	room.mu.Lock()
	defer room.mu.Unlock()

	delete(room.PlayerNames, playerID)
	room.Game.RemoveSnake(playerID)

	if len(room.PlayerNames) == 0 {
		delete(rm.rooms, roomID)
	}
}

func (rm *RoomManager) StartGame(roomID string) bool {
	room, exists := rm.GetRoom(roomID)
	if !exists {
		return false
	}

	room.mu.Lock()
	defer room.mu.Unlock()

	if room.Status != Waiting {
		return false
	}

	if len(room.PlayerNames) < 2 {
		return false
	}

	colors := []string{"#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6", "#1abc9c"}
	colorIndex := 0

	for playerID, playerName := range room.PlayerNames {
		startX := 5 + (colorIndex * 3)
		startY := 5 + (colorIndex * 2)
		color := colors[colorIndex%len(colors)]

		snake := game.NewSnake(playerID, playerName, color, startX, startY, 3)
		room.Game.AddSnake(snake)
		colorIndex++
	}

	room.Game.GenerateFood(3)
	room.Status = Playing
	return true
}

func (rm *RoomManager) GetAllRooms() []*Room {
	rm.mu.RLock()
	defer rm.mu.RUnlock()

	rooms := make([]*Room, 0, len(rm.rooms))
	for _, room := range rm.rooms {
		rooms = append(rooms, room)
	}
	return rooms
}

func (r *Room) GenerateInviteLink(baseURL string) string {
	return baseURL + "?room=" + r.ID + "&invite=" + r.InviteCode
}

func (r *Room) Lock() {
	r.mu.Lock()
}

func (r *Room) Unlock() {
	r.mu.Unlock()
}

func (r *Room) RLock() {
	r.mu.RLock()
}

func (r *Room) RUnlock() {
	r.mu.RUnlock()
}
