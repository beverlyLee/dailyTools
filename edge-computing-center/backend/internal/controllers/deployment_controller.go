package controllers

import (
	"math/rand"
	"net/http"
	"time"

	"edge-computing-center/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type DeploymentController struct {
	deployments       map[string]*models.Deployment
	nodeDeployStatus  map[string]map[string]*models.NodeDeploymentStatus
	logs              map[string][]string
}

func NewDeploymentController() *DeploymentController {
	dc := &DeploymentController{
		deployments:      make(map[string]*models.Deployment),
		nodeDeployStatus: make(map[string]map[string]*models.NodeDeploymentStatus),
		logs:             make(map[string][]string),
	}
	dc.initSampleData()
	return dc
}

func (dc *DeploymentController) initSampleData() {
	sampleDeployments := []*models.Deployment{
		{
			ID:              uuid.New().String(),
			AppID:           uuid.New().String(),
			AppName:         "Web应用服务",
			Image:           "nginx",
			Tag:             "1.25",
			NodeIDs:         []string{"node-001", "node-002", "node-003"},
			Strategy:        models.StrategyCanary,
			CanaryPercentage: 20,
			Status:          models.DeploymentStatusCompleted,
			Progress:        100,
			CreatedAt:       time.Now().Add(-24 * time.Hour),
			UpdatedAt:       time.Now().Add(-20 * time.Hour),
		},
		{
			ID:              uuid.New().String(),
			AppID:           uuid.New().String(),
			AppName:         "Redis缓存服务",
			Image:           "redis",
			Tag:             "7-alpine",
			NodeIDs:         []string{"node-001", "node-004"},
			Strategy:        models.StrategyRolling,
			Status:          models.DeploymentStatusRunning,
			Progress:        65,
			CreatedAt:       time.Now().Add(-30 * time.Minute),
			UpdatedAt:       time.Now().Add(-10 * time.Minute),
		},
	}

	for _, deploy := range sampleDeployments {
		dc.deployments[deploy.ID] = deploy
		dc.nodeDeployStatus[deploy.ID] = make(map[string]*models.NodeDeploymentStatus)
		
		for _, nodeID := range deploy.NodeIDs {
			status := models.DeploymentStatusCompleted
			if deploy.Status == models.DeploymentStatusRunning {
				if rand.Float64() > 0.5 {
					status = models.DeploymentStatusRunning
				}
			}
			
			nodeStatus := &models.NodeDeploymentStatus{
				NodeID:   nodeID,
				NodeName: "节点-" + nodeID,
				Status:   status,
			}
			
			if status == models.DeploymentStatusCompleted {
				nodeStatus.ContainerID = "container-" + uuid.New().String()[:12]
				completedAt := time.Now()
				nodeStatus.CompletedAt = &completedAt
			}
			
			dc.nodeDeployStatus[deploy.ID][nodeID] = nodeStatus
		}
		
		dc.logs[deploy.ID] = dc.generateSampleLogs()
	}
}

func (dc *DeploymentController) generateSampleLogs() []string {
	logs := []string{
		"[INFO] 开始部署流程...",
		"[INFO] 拉取镜像: nginx:1.25",
		"[INFO] 镜像拉取成功",
		"[INFO] 准备容器配置...",
		"[INFO] 端口映射: 80->8080",
		"[INFO] 环境变量已设置",
		"[INFO] 创建容器...",
		"[INFO] 容器创建成功",
		"[INFO] 启动容器...",
		"[INFO] 容器健康检查通过",
		"[INFO] 部署完成",
	}
	return logs
}

func (dc *DeploymentController) GetAllDeployments(c *gin.Context) {
	var deployments []*models.Deployment
	for _, deploy := range dc.deployments {
		deployments = append(deployments, deploy)
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    deployments,
	})
}

func (dc *DeploymentController) GetDeploymentByID(c *gin.Context) {
	id := c.Param("id")
	deploy, exists := dc.deployments[id]
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "部署任务未找到",
		})
		return
	}

	nodeStatuses := make([]*models.NodeDeploymentStatus, 0)
	for _, status := range dc.nodeDeployStatus[id] {
		nodeStatuses = append(nodeStatuses, status)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"deployment":       deploy,
			"node_statuses":    nodeStatuses,
		},
	})
}

func (dc *DeploymentController) CreateDeployment(c *gin.Context) {
	var req struct {
		AppID            string                `json:"app_id" binding:"required"`
		AppName          string                `json:"app_name"`
		Image            string                `json:"image" binding:"required"`
		Tag              string                `json:"tag" binding:"required"`
		NodeIDs          []string              `json:"node_ids" binding:"required"`
		Strategy         models.DeploymentStrategy `json:"strategy"`
		CanaryPercentage int                   `json:"canary_percentage"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的请求数据",
			"error":   err.Error(),
		})
		return
	}

	if req.Strategy == "" {
		req.Strategy = models.StrategyRolling
	}

	deployment := &models.Deployment{
		ID:              uuid.New().String(),
		AppID:           req.AppID,
		AppName:         req.AppName,
		Image:           req.Image,
		Tag:             req.Tag,
		NodeIDs:         req.NodeIDs,
		Strategy:        req.Strategy,
		CanaryPercentage: req.CanaryPercentage,
		Status:          models.DeploymentStatusPending,
		Progress:        0,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	dc.deployments[deployment.ID] = deployment
	dc.nodeDeployStatus[deployment.ID] = make(map[string]*models.NodeDeploymentStatus)
	
	for _, nodeID := range req.NodeIDs {
		dc.nodeDeployStatus[deployment.ID][nodeID] = &models.NodeDeploymentStatus{
			NodeID:   nodeID,
			NodeName: "节点-" + nodeID,
			Status:   models.DeploymentStatusPending,
		}
	}
	
	dc.logs[deployment.ID] = []string{
		"[INFO] 部署任务已创建，ID: " + deployment.ID,
		"[INFO] 等待执行...",
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    deployment,
		"message": "部署任务创建成功",
	})
}

func (dc *DeploymentController) RollbackDeployment(c *gin.Context) {
	id := c.Param("id")
	deploy, exists := dc.deployments[id]
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "部署任务未找到",
		})
		return
	}

	if deploy.PreviousTag == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "没有可回滚的版本",
		})
		return
	}

	deploy.Status = models.DeploymentStatusRollingBack
	deploy.UpdatedAt = time.Now()

	dc.logs[deploy.ID] = append(dc.logs[deploy.ID],
		"[INFO] 开始回滚操作...",
		"[INFO] 回滚到版本: " + deploy.PreviousTag,
	)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    deploy,
		"message": "回滚操作已启动",
	})
}

func (dc *DeploymentController) StreamLogs(c *gin.Context) {
	id := c.Param("id")
	logs, exists := dc.logs[id]
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "部署任务未找到",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    logs,
	})
}

func (dc *DeploymentController) LogsWebSocket(c *gin.Context) {
	id := c.Param("id")
	_, exists := dc.deployments[id]
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "部署任务未找到",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "WebSocket 日志流已建立",
	})
}
