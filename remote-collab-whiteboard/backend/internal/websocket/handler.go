package websocket

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
	"github.com/whiteboard/backend/internal/config"
	"github.com/whiteboard/backend/internal/hub"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 512 * 1024
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024 * 4,
	WriteBufferSize: 1024 * 4,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type Handler struct {
	hub    *hub.Hub
	config *config.Config
}

type ControlMessage struct {
	Type string `json:"type"`
}

func NewHandler(h *hub.Hub) *Handler {
	return &Handler{
		hub:    h,
		config: config.Load(),
	}
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	roomID := r.URL.Query().Get("room")
	if roomID == "" {
		http.Error(w, "room parameter is required", http.StatusBadRequest)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Failed to upgrade connection: %v", err)
		return
	}

	client := &hub.Client{
		ID:     generateClientID(),
		RoomID: roomID,
		Send:   make(chan hub.Message, 256),
	}

	h.hub.Register(client)

	go h.writePump(client, conn)
	go h.readPump(client, conn)
}

func (h *Handler) readPump(client *hub.Client, conn *websocket.Conn) {
	defer func() {
		h.hub.Unregister(client)
		conn.Close()
	}()

	conn.SetReadLimit(maxMessageSize)
	conn.SetReadDeadline(time.Now().Add(pongWait))
	conn.SetPongHandler(func(string) error {
		conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		messageType, data, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("Client %s read error: %v", client.ID, err)
			}
			break
		}

		if messageType == websocket.BinaryMessage {
			h.hub.Broadcast(hub.Message{
				RoomID: client.RoomID,
				Data:   data,
				Type:   hub.BinaryMessage,
				Sender: client,
			})
		} else if messageType == websocket.TextMessage {
			log.Printf("Client %s sent text message: %s", client.ID, string(data))
			
			var ctrlMsg ControlMessage
			if err := json.Unmarshal(data, &ctrlMsg); err != nil {
				continue
			}
			
			switch ctrlMsg.Type {
			case "request-sync":
				log.Printf("Client %s requested sync", client.ID)
			default:
				h.hub.Broadcast(hub.Message{
					RoomID: client.RoomID,
					Data:   data,
					Type:   hub.TextMessage,
					Sender: client,
				})
			}
		}
	}
}

func (h *Handler) writePump(client *hub.Client, conn *websocket.Conn) {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		conn.Close()
	}()

	for {
		select {
		case message, ok := <-client.Send:
			conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			var msgType int
			if message.Type == hub.TextMessage {
				msgType = websocket.TextMessage
			} else {
				msgType = websocket.BinaryMessage
			}

			w, err := conn.NextWriter(msgType)
			if err != nil {
				log.Printf("Client %s write error: %v", client.ID, err)
				return
			}
			w.Write(message.Data)

			n := len(client.Send)
			for i := 0; i < n; i++ {
				nextMsg := <-client.Send
				var nextMsgType int
				if nextMsg.Type == hub.TextMessage {
					nextMsgType = websocket.TextMessage
				} else {
					nextMsgType = websocket.BinaryMessage
				}
				
				if nextMsgType == msgType {
					w.Write(nextMsg.Data)
				} else {
					if err := w.Close(); err != nil {
						return
					}
					w, err = conn.NextWriter(nextMsgType)
					if err != nil {
						return
					}
					w.Write(nextMsg.Data)
					msgType = nextMsgType
				}
			}

			if err := w.Close(); err != nil {
				return
			}
		case <-ticker.C:
			conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func generateClientID() string {
	return time.Now().Format("20060102150405") + "_" + randomString(6)
}

func randomString(n int) string {
	const letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, n)
	for i := range b {
		b[i] = letters[time.Now().Nanosecond()%len(letters)]
	}
	return string(b)
}
