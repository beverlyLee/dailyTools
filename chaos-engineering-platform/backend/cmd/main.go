package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"chaos-engineering-platform/pkg/api"
	"chaos-engineering-platform/pkg/controller"
	"chaos-engineering-platform/pkg/service"

	"github.com/gin-gonic/gin"
)

func main() {
	experimentService := service.NewExperimentService()
	faultInjectionService := service.NewFaultInjectionService()
	metricService := service.NewMetricService()
	circuitBreakerService := service.NewCircuitBreakerService()

	experimentController := controller.NewExperimentController(experimentService)
	faultController := controller.NewFaultController(faultInjectionService)
	metricController := controller.NewMetricController(metricService)
	circuitBreakerController := controller.NewCircuitBreakerController(circuitBreakerService)

	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()

	r.Use(corsMiddleware())

	api.RegisterRoutes(r, experimentController, faultController, metricController, circuitBreakerController)

	srv := &http.Server{
		Addr:    ":8080",
		Handler: r,
	}

	go func() {
		log.Printf("混沌工程实验平台后端服务启动，监听端口: %s", srv.Addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("服务器启动失败: %s", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("正在关闭服务器...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal("服务器强制关闭:", err)
	}

	log.Println("服务器已关闭")
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
