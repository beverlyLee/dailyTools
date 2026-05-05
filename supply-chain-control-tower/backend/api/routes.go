package api

import (
	"supply-chain-control-tower/pkg/logistics"
	"supply-chain-control-tower/pkg/demand"
	"supply-chain-control-tower/pkg/websocket"

	"github.com/gofiber/fiber/v2"
)

func RegisterRoutes(app *fiber.App) {
	api := app.Group("/api")

	logisticsGroup := api.Group("/logistics")
	logistics.RegisterRoutes(logisticsGroup)

	demandGroup := api.Group("/demand")
	demand.RegisterRoutes(demandGroup)

	app.Get("/ws", websocket.HandleWebSocket)
}
