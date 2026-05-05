package main

import (
	"log"
	"os"

	"supply-chain-control-tower/api"

	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
)

func main() {
	app := fiber.New(fiber.Config{
		Prefork:      false,
		ServerHeader: "SupplyChainControlTower",
		AppName:      "Supply Chain Control Tower v1.0.0",
	})

	app.Use(cors.New(cors.Config{
		AllowOrigins:     "*",
		AllowMethods:     "GET,POST,PUT,DELETE,OPTIONS",
		AllowHeaders:     "Origin, Content-Type, Authorization",
		AllowCredentials: true,
	}))

	app.Use(logger.New())

	app.Use("/ws", func(c *fiber.Ctx) error {
		if websocket.IsWebSocketUpgrade(c) {
			c.Locals("allowed", true)
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	})

	api.RegisterRoutes(app)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("供应链控制塔后端启动，端口: %s", port)
	if err := app.Listen(":" + port); err != nil {
		log.Fatalf("服务器启动失败: %v", err)
	}
}
