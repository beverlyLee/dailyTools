package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"cloud-native-console/pkg/api"
	"cloud-native-console/pkg/k8s"

	"github.com/gin-gonic/gin"
)

func main() {
	gin.SetMode(gin.ReleaseMode)
	if os.Getenv("DEBUG") == "true" {
		gin.SetMode(gin.DebugMode)
	}

	manager := k8s.NewClusterManager()
	apiHandler := api.NewAPI(manager)

	r := apiHandler.SetupRouter()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()

		for {
			select {
			case <-ticker.C:
				manager.RefreshAllClusters()
			case <-stop:
				return
			}
		}
	}()

	log.Printf("========================================")
	log.Printf("  云原生开发控制台 - 后端服务")
	log.Printf("  服务地址: http://localhost:%s", port)
	log.Printf("  API 版本: v1")
	log.Printf("========================================")
	log.Printf("API 端点:")
	log.Printf("  GET  /api/v1/health              - 健康检查")
	log.Printf("  GET  /api/v1/clusters           - 获取集群列表")
	log.Printf("  POST /api/v1/clusters           - 添加集群")
	log.Printf("  GET  /api/v1/clusters/:id       - 获取集群详情")
	log.Printf("  PUT  /api/v1/clusters/:id       - 更新集群")
	log.Printf("  DELETE /api/v1/clusters/:id     - 删除集群")
	log.Printf("  POST /api/v1/clusters/:id/refresh - 刷新集群状态")
	log.Printf("")
	log.Printf("资源 API:")
	log.Printf("  GET  /api/v1/clusters/:id/nodes      - 获取节点列表")
	log.Printf("  GET  /api/v1/clusters/:id/pods        - 获取 Pod 列表")
	log.Printf("  GET  /api/v1/clusters/:id/deployments - 获取 Deployment 列表")
	log.Printf("  GET  /api/v1/clusters/:id/services    - 获取 Service 列表")
	log.Printf("  GET  /api/v1/clusters/:id/ingresses   - 获取 Ingress 列表")
	log.Printf("")
	log.Printf("部署 API:")
	log.Printf("  POST /api/v1/deploy            - 部署应用")
	log.Printf("  POST /api/v1/deploy/preview    - 预览 YAML")
	log.Printf("")
	log.Printf("告警 API:")
	log.Printf("  GET  /api/v1/clusters/:id/alerts       - 获取告警规则")
	log.Printf("  POST /api/v1/clusters/:id/alerts       - 创建告警规则")
	log.Printf("  PUT  /api/v1/clusters/:id/alerts/:aid  - 更新告警规则")
	log.Printf("  DELETE /api/v1/clusters/:id/alerts/:aid - 删除告警规则")
	log.Printf("========================================")

	go func() {
		if err := r.Run(":" + port); err != nil {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	<-stop
	log.Println("\n正在关闭服务...")
	log.Println("服务已安全关闭")
}
