package main

import (
	"household-bill-splitter/config"
	"household-bill-splitter/database"
	"household-bill-splitter/handlers"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.Load()

	if err := database.InitDB(cfg); err != nil {
		panic("failed to initialize database: " + err.Error())
	}

	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	userHandler := handlers.NewUserHandler()
	billHandler := handlers.NewBillHandler()
	ocrHandler := handlers.NewOCRHandler(&cfg.OCRService)
	splitHandler := handlers.NewSplitHandler()
	settlementHandler := handlers.NewSettlementHandler()

	api := r.Group("/api")
	{
		users := api.Group("/users")
		{
			users.GET("", userHandler.GetUsers)
			users.GET("/:id", userHandler.GetUser)
			users.POST("", userHandler.CreateUser)
			users.PUT("/:id", userHandler.UpdateUser)
			users.DELETE("/:id", userHandler.DeleteUser)
		}

		bills := api.Group("/bills")
		{
			bills.GET("", billHandler.GetBills)
			bills.POST("", billHandler.CreateBill)
			bills.GET("/:bill_id", billHandler.GetBill)
			bills.PUT("/:bill_id", billHandler.UpdateBill)
			bills.DELETE("/:bill_id", billHandler.DeleteBill)
			bills.PUT("/:bill_id/items/:item_id/category", billHandler.UpdateBillItemCategory)
		}

		ocr := api.Group("/ocr")
		{
			ocr.POST("/upload", ocrHandler.UploadAndRecognize)
			ocr.POST("/parse-text", ocrHandler.RecognizeFromText)
			ocr.GET("/records", ocrHandler.GetOCRRecords)
			ocr.GET("/records/:id", ocrHandler.GetOCRRecord)
		}

		split := api.Group("/split")
		{
			split.GET("/strategies", splitHandler.GetSplitStrategies)
			split.POST("/calculate", splitHandler.CalculateSplit)
			split.POST("/save", splitHandler.SaveSplitResult)
			split.GET("/results/:bill_id", splitHandler.GetSplitResults)
		}

		settlement := api.Group("/settlement")
		{
			settlement.POST("/calculate", settlementHandler.CalculateSettlement)
			settlement.GET("/calculate-all", settlementHandler.CalculateAllSettlement)
			settlement.POST("/save", settlementHandler.SaveSettlement)
			settlement.GET("", settlementHandler.GetSettlements)
			settlement.PUT("/:id/paid", settlementHandler.MarkSettlementPaid)
		}
	}

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "ok",
		})
	})

	r.Run(cfg.ServerPort)
}
