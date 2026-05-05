package demand

import (
	"github.com/gofiber/fiber/v2"
)

func RegisterRoutes(router fiber.Router) {
	router.Get("/forecast", GetForecast)
	router.Get("/history", GetHistoryData)
	router.Post("/simulate", RunSimulation)
	router.Get("/replenishment", GetReplenishmentSuggestions)
	router.Post("/replenishment/:id/approve", ApproveReplenishment)
	router.Get("/external-factors", GetExternalFactors)
}
