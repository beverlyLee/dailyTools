package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"service-monitoring-system/api"
	"service-monitoring-system/pkg/config"
	"service-monitoring-system/pkg/monitoring"
	"service-monitoring-system/pkg/selfhealing"

	"github.com/gin-gonic/gin"
)

func main() {
	// 加载配置
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("加载配置失败: %s", err)
	}

	// 初始化组件
	monitoringService := monitoring.NewService(cfg)
	selfHealingService := selfhealing.NewService(cfg, monitoringService)

	// 设置 Gin
	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()

	// 注册路由
	api.RegisterRoutes(r, monitoringService, selfHealingService)

	// 创建 HTTP 服务器
	srv := &http.Server{
		Addr:    ":" + cfg.Server.Port,
		Handler: r,
	}

	// 启动服务器
	go func() {
		log.Printf("服务监控与自愈系统后端服务启动，监听端口: %s", srv.Addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("服务器启动失败: %s", err)
		}
	}()

	// 优雅关闭
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
