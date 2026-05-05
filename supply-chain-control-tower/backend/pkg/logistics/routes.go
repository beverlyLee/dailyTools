package logistics

import (
	"github.com/gofiber/fiber/v2"
)

func RegisterRoutes(router fiber.Router) {
	router.Get("/topology", GetTopology)
	router.Get("/orders", GetOrders)
	router.Get("/inventory", GetInventory)
	router.Get("/carriers/:id", GetCarrierDetail)
	router.Get("/alerts", GetAlerts)
	router.Post("/alerts/:id/ack", AcknowledgeAlert)
}
