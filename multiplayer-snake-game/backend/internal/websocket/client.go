package websocket

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

type Client struct {
	ID         string
	Conn       *websocket.Conn
	Server     *Server
	Send       chan []byte
	RoomID     string
	PlayerName string
	mu         sync.Mutex
}

func NewClient(id string, conn *websocket.Conn, server *Server) *Client {
	return &Client{
		ID:     id,
		Conn:   conn,
		Server: server,
		Send:   make(chan []byte, 256),
	}
}

func (c *Client) ReadPump() {
	defer func() {
		c.Server.Unregister <- c
		c.Conn.Close()
	}()

	c.Conn.SetReadLimit(512)
	c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v", err)
			}
			break
		}

		c.handleMessage(message)
	}
}

func (c *Client) WritePump() {
	ticker := time.NewTicker(30 * time.Second)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.Conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			n := len(c.Send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-c.Send)
			}

			if err := w.Close(); err != nil {
				return
			}
		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (c *Client) handleMessage(data []byte) {
	msg, err := ParseMessage(data)
	if err != nil {
		c.sendError("Invalid message format")
		return
	}

	switch msg.Type {
	case TypeCreateRoom:
		c.handleCreateRoom(msg.Payload)
	case TypeJoinRoom:
		c.handleJoinRoom(msg.Payload)
	case TypeLeaveRoom:
		c.handleLeaveRoom()
	case TypeStartGame:
		c.handleStartGame()
	case TypeDirection:
		c.handleDirection(msg.Payload)
	case TypeRoomList:
		c.handleRoomList()
	default:
		c.sendError("Unknown message type")
	}
}

func (c *Client) handleCreateRoom(payload json.RawMessage) {
	var p CreateRoomPayload
	if err := json.Unmarshal(payload, &p); err != nil {
		c.sendError("Invalid create room payload")
		return
	}

	if p.MaxPlayers < 2 || p.MaxPlayers > 8 {
		p.MaxPlayers = 4
	}

	if p.RoomName == "" {
		p.RoomName = "Game Room"
	}

	if p.PlayerName == "" {
		c.sendError("Player name is required")
		return
	}

	c.PlayerName = p.PlayerName

	room := c.Server.RoomManager.CreateRoom(c.ID, p.PlayerName, p.RoomName, p.MaxPlayers)
	c.RoomID = room.ID

	c.Server.BroadcastToRoom(c.RoomID, c)

	roomInfo := RoomInfoPayload{
		RoomID:      room.ID,
		RoomName:    room.Name,
		Status:      string(room.Status),
		PlayerNames: room.PlayerNames,
		MaxPlayers:  room.MaxPlayers,
		InviteLink:  room.GenerateInviteLink(""),
	}

	msg, _ := NewMessage(TypeRoomInfo, roomInfo)
	c.SendMessage(msg)
}

func (c *Client) handleJoinRoom(payload json.RawMessage) {
	var p JoinRoomPayload
	if err := json.Unmarshal(payload, &p); err != nil {
		c.sendError("Invalid join room payload")
		return
	}

	if p.PlayerName == "" {
		c.sendError("Player name is required")
		return
	}

	c.PlayerName = p.PlayerName

	var roomID string
	if p.InviteCode != "" {
		room, exists := c.Server.RoomManager.GetRoomByInviteCode(p.InviteCode)
		if !exists {
			c.sendError("Invalid invite code")
			return
		}
		roomID = room.ID
	} else if p.RoomID != "" {
		roomID = p.RoomID
	} else {
		c.sendError("Room ID or invite code is required")
		return
	}

	room, success := c.Server.RoomManager.JoinRoom(roomID, c.ID, p.PlayerName)
	if !success {
		c.sendError("Failed to join room. Room may be full or game already started.")
		return
	}

	c.RoomID = roomID
	c.Server.BroadcastToRoom(c.RoomID, c)

	joinMsg, _ := NewMessage(TypePlayerJoined, PlayerJoinedPayload{
		PlayerID:   c.ID,
		PlayerName: p.PlayerName,
	})
	c.Server.BroadcastToRoomExcept(roomID, c, joinMsg)

	roomInfo := RoomInfoPayload{
		RoomID:      room.ID,
		RoomName:    room.Name,
		Status:      string(room.Status),
		PlayerNames: room.PlayerNames,
		MaxPlayers:  room.MaxPlayers,
	}

	msg, _ := NewMessage(TypeRoomInfo, roomInfo)
	c.SendMessage(msg)
}

func (c *Client) handleLeaveRoom() {
	if c.RoomID == "" {
		return
	}

	roomID := c.RoomID
	c.Server.RoomManager.LeaveRoom(roomID, c.ID)

	leaveMsg, _ := NewMessage(TypePlayerLeft, PlayerJoinedPayload{
		PlayerID:   c.ID,
		PlayerName: c.PlayerName,
	})
	c.Server.BroadcastToRoomExcept(roomID, c, leaveMsg)

	c.RoomID = ""
}

func (c *Client) handleStartGame() {
	if c.RoomID == "" {
		c.sendError("Not in a room")
		return
	}

	room, exists := c.Server.RoomManager.GetRoom(c.RoomID)
	if !exists {
		c.sendError("Room not found")
		return
	}

	if room.OwnerID != c.ID {
		c.sendError("Only room owner can start game")
		return
	}

	if !c.Server.RoomManager.StartGame(c.RoomID) {
		c.sendError("Failed to start game. Need at least 2 players.")
		return
	}

	c.Server.GameLoopManager.StartGameLoop(c.RoomID)
}

func (c *Client) handleDirection(payload json.RawMessage) {
	if c.RoomID == "" {
		return
	}

	room, exists := c.Server.RoomManager.GetRoom(c.RoomID)
	if !exists || room.Status != "playing" {
		return
	}

	var p DirectionPayload
	if err := json.Unmarshal(payload, &p); err != nil {
		return
	}

	room.Game.ChangeDirection(c.ID, p.Direction)
}

func (c *Client) handleRoomList() {
	rooms := c.Server.RoomManager.GetAllRooms()
	roomList := make([]RoomListItem, 0, len(rooms))

	for _, room := range rooms {
		roomList = append(roomList, RoomListItem{
			ID:          room.ID,
			Name:        room.Name,
			Status:      string(room.Status),
			PlayerCount: len(room.PlayerNames),
			MaxPlayers:  room.MaxPlayers,
		})
	}

	msg, _ := NewMessage(TypeRoomList, RoomListPayload{Rooms: roomList})
	c.SendMessage(msg)
}

func (c *Client) sendError(message string) {
	msg, _ := NewMessage(TypeError, ErrorPayload{Message: message})
	c.SendMessage(msg)
}

func (c *Client) SendMessage(msg *Message) {
	data, _ := json.Marshal(msg)
	select {
	case c.Send <- data:
	default:
		log.Printf("Client %s send channel full, dropping message", c.ID)
	}
}
