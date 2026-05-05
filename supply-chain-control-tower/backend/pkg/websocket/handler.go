package websocket

import (
	"encoding/json"
	"log"
	"time"

	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
)

type Message struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
	Time    string      `json:"time"`
}

var (
	clients   = make(map[*websocket.Conn]bool)
	broadcast = make(chan Message)
)

func HandleWebSocket(c *websocket.Conn) {
	defer func() {
		delete(clients, c)
		c.Close()
	}()

	clients[c] = true
	log.Printf("新的WebSocket连接: %s", c.RemoteAddr().String())

	for {
		_, msg, err := c.ReadMessage()
		if err != nil {
			log.Printf("WebSocket读取错误: %v", err)
			break
		}

		var message Message
		if err := json.Unmarshal(msg, &message); err != nil {
			log.Printf("消息解析错误: %v", err)
			continue
		}

		handleIncomingMessage(message, c)
	}
}

func handleIncomingMessage(msg Message, conn *websocket.Conn) {
	switch msg.Type {
	case "ping":
		response := Message{
			Type:    "pong",
			Payload: "pong",
			Time:    time.Now().Format(time.RFC3339),
		}
		sendMessage(conn, response)
	case "subscribe":
		topic, ok := msg.Payload.(string)
		if !ok {
			return
		}
		log.Printf("客户端订阅主题: %s", topic)
		startTopicStream(conn, topic)
	}
}

func sendMessage(conn *websocket.Conn, msg Message) {
	data, err := json.Marshal(msg)
	if err != nil {
		log.Printf("消息序列化错误: %v", err)
		return
	}

	if err := conn.WriteMessage(websocket.TextMessage, data); err != nil {
		log.Printf("消息发送错误: %v", err)
	}
}

func startTopicStream(conn *websocket.Conn, topic string) {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		if _, exists := clients[conn]; !exists {
			return
		}

		var payload interface{}
		switch topic {
		case "orders":
			payload = generateOrderUpdate()
		case "alerts":
			payload = generateAlertUpdate()
		case "inventory":
			payload = generateInventoryUpdate()
		default:
			continue
		}

		msg := Message{
			Type:    topic + "_update",
			Payload: payload,
			Time:    time.Now().Format(time.RFC3339),
		}
		sendMessage(conn, msg)
	}
}

func generateOrderUpdate() map[string]interface{} {
	return map[string]interface{}{
		"orderId":     "SO-2024-" + string(rune(100+time.Now().Second())),
		"status":      "in_transit",
		"progress":    float64(time.Now().Second()%100),
		"updatedAt":   time.Now().Format("2006-01-02 15:04:05"),
	}
}

func generateAlertUpdate() map[string]interface{} {
	alertTypes := []string{"delay", "inventory", "carrier"}
	severities := []string{"high", "medium", "low"}
	
	return map[string]interface{}{
		"alertId":     "ALERT-" + time.Now().Format("20060102150405"),
		"type":        alertTypes[time.Now().Second()%3],
		"severity":    severities[time.Now().Second()%3],
		"title":       "新的系统告警",
		"description": "检测到异常情况，需要关注",
		"createdAt":   time.Now().Format("2006-01-02 15:04:05"),
	}
}

func generateInventoryUpdate() map[string]interface{} {
	return map[string]interface{}{
		"sku":         "SKU-00" + string(rune(49+time.Now().Second()%3)),
		"action":      "stock_change",
		"oldStock":    1000 + time.Now().Second()%500,
		"newStock":    800 + time.Now().Second()%500,
		"updatedAt":   time.Now().Format("2006-01-02 15:04:05"),
	}
}

func StartBroadcast() {
	for msg := range broadcast {
		for client := range clients {
			sendMessage(client, msg)
		}
	}
}

func Broadcast(msg Message) {
	broadcast <- msg
}
