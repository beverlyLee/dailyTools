package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"live-edu-interaction/backend/internal/room"
	"live-edu-interaction/backend/internal/sfu"

	"github.com/gorilla/websocket"
	"github.com/sirupsen/logrus"
)

type Message struct {
	Type    string          `json:"type"`
	RoomID  string          `json:"roomId,omitempty"`
	UserID  string          `json:"userId,omitempty"`
	Data    json.RawMessage `json:"data,omitempty"`
	To      string          `json:"to,omitempty"`
}

type JoinRoomData struct {
	UserName string `json:"userName"`
	Role     string `json:"role"`
}

type WebSocketHandler struct {
	logger      *logrus.Logger
	roomManager *room.Manager
	sfuServer   *sfu.Server
	upgrader    *websocket.Upgrader
	clients     map[string]*websocket.Conn
	rooms       map[string]map[string]bool
}

func NewWebSocketHandler(
	logger *logrus.Logger,
	roomManager *room.Manager,
	sfuServer *sfu.Server,
	upgrader *websocket.Upgrader,
) *WebSocketHandler {
	return &WebSocketHandler{
		logger:      logger,
		roomManager: roomManager,
		sfuServer:   sfuServer,
		upgrader:    upgrader,
		clients:     make(map[string]*websocket.Conn),
		rooms:       make(map[string]map[string]bool),
	}
}

func (h *WebSocketHandler) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		h.logger.Errorf("Failed to upgrade connection: %v", err)
		return
	}

	userID := generateUserID()
	h.clients[userID] = conn

	h.logger.Infof("New WebSocket connection: %s", userID)

	defer func() {
		conn.Close()
		h.cleanupUser(userID)
		h.logger.Infof("WebSocket connection closed: %s", userID)
	}()

	for {
		var msg Message
		err := conn.ReadJSON(&msg)
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				h.logger.Errorf("WebSocket read error: %v", err)
			}
			break
		}

		msg.UserID = userID
		h.handleMessage(msg)
	}
}

func (h *WebSocketHandler) handleMessage(msg Message) {
	switch msg.Type {
	case "join-room":
		h.handleJoinRoom(msg)
	case "leave-room":
		h.handleLeaveRoom(msg)
	case "raise-hand":
		h.handleRaiseHand(msg)
	case "lower-hand":
		h.handleLowerHand(msg)
	case "whiteboard-action":
		h.handleWhiteboardAction(msg)
	case "webrtc-offer":
		h.handleWebRTCOffer(msg)
	case "webrtc-answer":
		h.handleWebRTCAnswer(msg)
	case "webrtc-ice-candidate":
		h.handleWebRTCIceCandidate(msg)
	case "create-breakout":
		h.handleCreateBreakout(msg)
	case "assign-breakout":
		h.handleAssignBreakout(msg)
	case "close-breakout":
		h.handleCloseBreakout(msg)
	case "focus-score":
		h.handleFocusScore(msg)
	default:
		h.logger.Warnf("Unknown message type: %s", msg.Type)
	}
}

func (h *WebSocketHandler) handleJoinRoom(msg Message) {
	var data JoinRoomData
	if err := json.Unmarshal(msg.Data, &data); err != nil {
		h.logger.Errorf("Failed to unmarshal join room data: %v", err)
		return
	}

	user := &room.User{
		ID:         msg.UserID,
		Name:       data.UserName,
		Role:       data.Role,
	}

	roomObj, err := h.roomManager.AddUserToRoom(msg.RoomID, user)
	if err != nil {
		h.logger.Errorf("Failed to add user to room: %v", err)
		return
	}

	if h.rooms[msg.RoomID] == nil {
		h.rooms[msg.RoomID] = make(map[string]bool)
	}
	h.rooms[msg.RoomID][msg.UserID] = true

	h.broadcastToRoom(msg.RoomID, Message{
		Type:   "user-joined",
		RoomID: msg.RoomID,
		UserID: msg.UserID,
		Data:   mustMarshal(map[string]interface{}{
			"id":   msg.UserID,
			"name": data.UserName,
			"role": data.Role,
		}),
	})

	h.sendToUser(msg.UserID, Message{
		Type:   "classroom-update",
		RoomID: msg.RoomID,
		Data:   mustMarshal(roomObj),
	})

	h.logger.Infof("User %s (%s) joined room %s", data.UserName, data.Role, msg.RoomID)
}

func (h *WebSocketHandler) handleLeaveRoom(msg Message) {
	h.cleanupUserFromRoom(msg.UserID, msg.RoomID)

	h.broadcastToRoom(msg.RoomID, Message{
		Type:   "user-left",
		RoomID: msg.RoomID,
		UserID: msg.UserID,
	})
}

func (h *WebSocketHandler) handleRaiseHand(msg Message) {
	user, exists := h.roomManager.GetUser(msg.UserID)
	if !exists {
		return
	}

	h.roomManager.AddHandRaise(user.RoomID, msg.UserID, user.Name)

	h.broadcastToRoom(user.RoomID, Message{
		Type:   "hand-raise",
		RoomID: user.RoomID,
		UserID: msg.UserID,
		Data:   mustMarshal(map[string]string{
			"userId":   msg.UserID,
			"userName": user.Name,
		}),
	})
}

func (h *WebSocketHandler) handleLowerHand(msg Message) {
	user, exists := h.roomManager.GetUser(msg.UserID)
	if !exists {
		return
	}

	h.roomManager.RemoveHandRaise(user.RoomID, msg.UserID)

	h.broadcastToRoom(user.RoomID, Message{
		Type:   "hand-lower",
		RoomID: user.RoomID,
		UserID: msg.UserID,
		Data:   mustMarshal(map[string]string{
			"userId": msg.UserID,
		}),
	})
}

func (h *WebSocketHandler) handleWhiteboardAction(msg Message) {
	user, exists := h.roomManager.GetUser(msg.UserID)
	if !exists {
		return
	}

	h.broadcastToRoom(user.RoomID, Message{
		Type:   "whiteboard-draw",
		RoomID: user.RoomID,
		UserID: msg.UserID,
		Data:   msg.Data,
	}, msg.UserID)
}

func (h *WebSocketHandler) handleWebRTCOffer(msg Message) {
	var data map[string]interface{}
	json.Unmarshal(msg.Data, &data)

	if msg.To != "" {
		h.sendToUser(msg.To, Message{
			Type:   "webrtc-offer",
			UserID: msg.UserID,
			Data:   msg.Data,
		})
	} else {
		user, exists := h.roomManager.GetUser(msg.UserID)
		if exists && user.RoomID != "" {
			h.broadcastToRoom(user.RoomID, Message{
				Type:   "webrtc-offer",
				UserID: msg.UserID,
				Data:   msg.Data,
			}, msg.UserID)
		}
	}
}

func (h *WebSocketHandler) handleWebRTCAnswer(msg Message) {
	if msg.To != "" {
		h.sendToUser(msg.To, Message{
			Type:   "webrtc-answer",
			UserID: msg.UserID,
			Data:   msg.Data,
		})
	}
}

func (h *WebSocketHandler) handleWebRTCIceCandidate(msg Message) {
	if msg.To != "" {
		h.sendToUser(msg.To, Message{
			Type:   "webrtc-ice-candidate",
			UserID: msg.UserID,
			Data:   msg.Data,
		})
	}
}

func (h *WebSocketHandler) handleCreateBreakout(msg Message) {
	user, exists := h.roomManager.GetUser(msg.UserID)
	if !exists || user.Role != "teacher" {
		return
	}

	var data struct {
		BreakoutID string `json:"breakoutId"`
		Name       string `json:"name"`
	}
	json.Unmarshal(msg.Data, &data)

	h.roomManager.CreateBreakoutRoom(user.RoomID, data.BreakoutID, data.Name)

	breakoutRoom, _ := h.roomManager.GetRoom(user.RoomID)
	breakoutData := breakoutRoom.BreakoutRooms[data.BreakoutID]

	h.broadcastToRoom(user.RoomID, Message{
		Type:   "breakout-created",
		RoomID: user.RoomID,
		Data:   mustMarshal(map[string]interface{}{"room": breakoutData}),
	})
}

func (h *WebSocketHandler) handleAssignBreakout(msg Message) {
	user, exists := h.roomManager.GetUser(msg.UserID)
	if !exists || user.Role != "teacher" {
		return
	}

	var data struct {
		BreakoutID string `json:"breakoutId"`
		StudentID  string `json:"studentId"`
	}
	json.Unmarshal(msg.Data, &data)

	room, _ := h.roomManager.GetRoom(user.RoomID)
	breakoutRoom := room.BreakoutRooms[data.BreakoutID]

	if h.roomManager.AssignStudentToBreakout(user.RoomID, data.BreakoutID, data.StudentID) {
		h.sendToUser(data.StudentID, Message{
			Type:   "breakout-assigned",
			RoomID: user.RoomID,
			Data:   mustMarshal(map[string]interface{}{"room": breakoutRoom}),
		})
	}
}

func (h *WebSocketHandler) handleCloseBreakout(msg Message) {
	user, exists := h.roomManager.GetUser(msg.UserID)
	if !exists || user.Role != "teacher" {
		return
	}

	var data struct {
		BreakoutID string `json:"breakoutId"`
	}
	json.Unmarshal(msg.Data, &data)

	room, _ := h.roomManager.GetRoom(user.RoomID)
	breakoutRoom := room.BreakoutRooms[data.BreakoutID]

	for studentID := range breakoutRoom.Students {
		h.sendToUser(studentID, Message{
			Type:   "breakout-closed",
			RoomID: user.RoomID,
			Data:   mustMarshal(map[string]string{"roomId": data.BreakoutID}),
		})
	}

	h.roomManager.CloseBreakoutRoom(user.RoomID, data.BreakoutID)
}

func (h *WebSocketHandler) handleFocusScore(msg Message) {
	var data struct {
		Score int `json:"score"`
	}
	json.Unmarshal(msg.Data, &data)

	h.roomManager.UpdateFocusScore(msg.UserID, data.Score)
}

func (h *WebSocketHandler) broadcastToRoom(roomID string, msg Message, excludeIDs ...string) {
	roomUsers, exists := h.rooms[roomID]
	if !exists {
		return
	}

	excludeMap := make(map[string]bool)
	for _, id := range excludeIDs {
		excludeMap[id] = true
	}

	for userID := range roomUsers {
		if excludeMap[userID] {
			continue
		}
		h.sendToUser(userID, msg)
	}
}

func (h *WebSocketHandler) sendToUser(userID string, msg Message) {
	conn, exists := h.clients[userID]
	if !exists {
		return
	}

	err := conn.WriteJSON(msg)
	if err != nil {
		h.logger.Errorf("Failed to send message to user %s: %v", userID, err)
	}
}

func (h *WebSocketHandler) cleanupUser(userID string) {
	delete(h.clients, userID)

	for roomID, users := range h.rooms {
		if users[userID] {
			h.cleanupUserFromRoom(userID, roomID)
		}
	}

	h.roomManager.RemoveUser(userID)
}

func (h *WebSocketHandler) cleanupUserFromRoom(userID, roomID string) {
	if h.rooms[roomID] != nil {
		delete(h.rooms[roomID], userID)
		if len(h.rooms[roomID]) == 0 {
			delete(h.rooms, roomID)
		}
	}
}

func generateUserID() string {
	return "user_" + time.Now().Format("20060102150405") + "_" + randomString(6)
}

func randomString(n int) string {
	const letterBytes = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
	b := make([]byte, n)
	for i := range b {
		b[i] = letterBytes[time.Now().Nanosecond()%len(letterBytes)]
	}
	return string(b)
}

func mustMarshal(v interface{}) json.RawMessage {
	data, _ := json.Marshal(v)
	return data
}
