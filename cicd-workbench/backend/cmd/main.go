package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"cicd-workbench/api"
	"cicd-workbench/pkg/artifacts"
	"cicd-workbench/pkg/notifications"
	"cicd-workbench/pkg/pipeline"

	"github.com/gin-gonic/gin"
)

func main() {
	// 初始化组件
	pipelineService := pipeline.NewService()
	artifactsService := artifacts.NewService()
	notificationsService := notifications.NewService()

	// 设置 Gin
	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()

	// 注册路由
	api.RegisterRoutes(r, pipelineService, artifactsService, notificationsService)

	// 创建 HTTP 服务器
	srv := &http.Server{
		Addr:    ":8080",
		Handler: r,
	}

	// 启动服务器
	go func() {
		log.Printf("CI/CD Workbench 后端服务启动，监听端口: %s", srv.Addr)
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
