package websocket

import (
	"encoding/json"

	"multiplayer-snake-game/internal/game"
)

type MessageType string

const (
	TypeJoinRoom       MessageType = "joinRoom"
	TypeCreateRoom     MessageType = "createRoom"
	TypeLeaveRoom      MessageType = "leaveRoom"
	TypeStartGame      MessageType = "startGame"
	TypeGameState      MessageType = "gameState"
	TypeDirection      MessageType = "direction"
	TypePlayerJoined   MessageType = "playerJoined"
	TypePlayerLeft     MessageType = "playerLeft"
	TypeGameOver       MessageType = "gameOver"
	TypeError          MessageType = "error"
	TypeRoomInfo       MessageType = "roomInfo"
	TypeRoomList       MessageType = "roomList"
	TypeInviteLink     MessageType = "inviteLink"
)

type Message struct {
	Type    MessageType     `json:"type"`
	Payload json.RawMessage `json:"payload"`
}

type JoinRoomPayload struct {
	RoomID     string `json:"roomId"`
	InviteCode string `json:"inviteCode,omitempty"`
	PlayerName string `json:"playerName"`
}

type CreateRoomPayload struct {
	RoomName   string `json:"roomName"`
	PlayerName string `json:"playerName"`
	MaxPlayers int    `json:"maxPlayers"`
}

type DirectionPayload struct {
	Direction game.Direction `json:"direction"`
}

type ErrorPayload struct {
	Message string `json:"message"`
}

type RoomInfoPayload struct {
	RoomID      string            `json:"roomId"`
	RoomName    string            `json:"roomName"`
	Status      string            `json:"status"`
	PlayerNames map[string]string `json:"playerNames"`
	MaxPlayers  int               `json:"maxPlayers"`
	InviteLink  string            `json:"inviteLink,omitempty"`
}

type PlayerJoinedPayload struct {
	PlayerID   string `json:"playerId"`
	PlayerName string `json:"playerName"`
}

type GameOverPayload struct {
	Winner string `json:"winner"`
}

type RoomListPayload struct {
	Rooms []RoomListItem `json:"rooms"`
}

type RoomListItem struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	Status       string `json:"status"`
	PlayerCount  int    `json:"playerCount"`
	MaxPlayers   int    `json:"maxPlayers"`
}

func NewMessage(msgType MessageType, payload interface{}) (*Message, error) {
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	return &Message{
		Type:    msgType,
		Payload: payloadBytes,
	}, nil
}

func ParseMessage(data []byte) (*Message, error) {
	var msg Message
	if err := json.Unmarshal(data, &msg); err != nil {
		return nil, err
	}
	return &msg, nil
}
