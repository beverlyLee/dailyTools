package controllers

import (
	"math/rand"
	"net/http"
	"strconv"
	"time"

	"edge-computing-center/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type NodeController struct {
	nodes       map[string]*models.Node
	nodeStats   map[string]*models.NodeStats
}

func NewNodeController() *NodeController {
	nc := &NodeController{
		nodes:     make(map[string]*models.Node),
		nodeStats: make(map[string]*models.NodeStats),
	}
	nc.initSampleData()
	return nc
}

func (nc *NodeController) initSampleData() {
	sampleNodes := []*models.Node{
		{
			ID:          uuid.New().String(),
			Name:        "北京节点-01",
			Description: "北京数据中心边缘节点",
			IPAddress:   "192.168.1.10",
			SSHPort:     22,
			SSHUser:     "admin",
			Location: models.Location{
				Latitude:  39.9042,
				Longitude: 116.4074,
				City:      "北京",
				Country:   "中国",
				Region:    "华北",
			},
			Status:    models.NodeStatusOnline,
			Tags:      []string{"production", "high-availability"},
			CreatedAt: time.Now().Add(-7 * 24 * time.Hour),
			UpdatedAt: time.Now(),
		},
		{
			ID:          uuid.New().String(),
			Name:        "上海节点-01",
			Description: "上海数据中心边缘节点",
			IPAddress:   "192.168.2.20",
			SSHPort:     22,
			SSHUser:     "admin",
			Location: models.Location{
				Latitude:  31.2304,
				Longitude: 121.4737,
				City:      "上海",
				Country:   "中国",
				Region:    "华东",
			},
			Status:    models.NodeStatusWarning,
			Tags:      []string{"production", "high-availability"},
			CreatedAt: time.Now().Add(-14 * 24 * time.Hour),
			UpdatedAt: time.Now(),
		},
		{
			ID:          uuid.New().String(),
			Name:        "新加坡节点-01",
			Description: "新加坡数据中心边缘节点",
			IPAddress:   "192.168.3.30",
			SSHPort:     22,
			SSHUser:     "ubuntu",
			Location: models.Location{
				Latitude:  1.3521,
				Longitude: 103.8198,
				City:      "新加坡",
				Country:   "新加坡",
				Region:    "东南亚",
			},
			Status:    models.NodeStatusOnline,
			Tags:      []string{"global", "high-availability"},
			CreatedAt: time.Now().Add(-30 * 24 * time.Hour),
			UpdatedAt: time.Now(),
		},
		{
			ID:          uuid.New().String(),
			Name:        "东京节点-01",
			Description: "东京数据中心边缘节点",
			IPAddress:   "192.168.4.40",
			SSHPort:     22,
			SSHUser:     "ubuntu",
			Location: models.Location{
				Latitude:  35.6762,
				Longitude: 139.6503,
				City:      "东京",
				Country:   "日本",
				Region:    "东亚",
			},
			Status:    models.NodeStatusOnline,
			Tags:      []string{"global", "high-availability"},
			CreatedAt: time.Now().Add(-45 * 24 * time.Hour),
			UpdatedAt: time.Now(),
		},
		{
			ID:          uuid.New().String(),
			Name:        "法兰克福节点-01",
			Description: "法兰克福数据中心边缘节点",
			IPAddress:   "192.168.5.50",
			SSHPort:     22,
			SSHUser:     "root",
			Location: models.Location{
				Latitude:  50.1109,
				Longitude: 8.6821,
				City:      "法兰克福",
				Country:   "德国",
				Region:    "欧洲",
			},
			Status:    models.NodeStatusCritical,
			Tags:      []string{"global", "high-availability"},
			CreatedAt: time.Now().Add(-60 * 24 * time.Hour),
			UpdatedAt: time.Now(),
		},
	}

	for _, node := range sampleNodes {
		nc.nodes[node.ID] = node
		nc.nodeStats[node.ID] = nc.generateRandomStats()
	}
}

func (nc *NodeController) generateRandomStats() *models.NodeStats {
	return &models.NodeStats{
		CPUUsage:     20 + rand.Float64()*60,
		MemoryUsage:  30 + rand.Float64()*50,
		MemoryTotal:  32 * 1024 * 1024 * 1024, // 32GB
		MemoryUsed:   10 * 1024 * 1024 * 1024,  // 10GB
		DiskUsage:    40 + rand.Float64()*40,
		DiskTotal:    500 * 1024 * 1024 * 1024, // 500GB
		DiskUsed:     200 * 1024 * 1024 * 1024, // 200GB
		Temperature:  35 + rand.Float64()*25,
		NetworkIn:    rand.Float64() * 100,
		NetworkOut:   rand.Float64() * 50,
		LastUpdated:  time.Now(),
	}
}

func (nc *NodeController) GetAllNodes(c *gin.Context) {
	var nodes []*models.Node
	for _, node := range nc.nodes {
		nodes = append(nodes, node)
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    nodes,
	})
}

func (nc *NodeController) GetNodeByID(c *gin.Context) {
	id := c.Param("id")
	node, exists := nc.nodes[id]
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "节点未找到",
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    node,
	})
}

func (nc *NodeController) CreateNode(c *gin.Context) {
	var node models.Node
	if err := c.ShouldBindJSON(&node); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的请求数据",
			"error":   err.Error(),
		})
		return
	}

	node.ID = uuid.New().String()
	node.CreatedAt = time.Now()
	node.UpdatedAt = time.Now()
	node.Status = models.NodeStatusOnline

	nc.nodes[node.ID] = &node
	nc.nodeStats[node.ID] = nc.generateRandomStats()

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    node,
		"message": "节点创建成功",
	})
}

func (nc *NodeController) UpdateNode(c *gin.Context) {
	id := c.Param("id")
	node, exists := nc.nodes[id]
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "节点未找到",
		})
		return
	}

	var updateData models.Node
	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的请求数据",
			"error":   err.Error(),
		})
		return
	}

	if updateData.Name != "" {
		node.Name = updateData.Name
	}
	if updateData.Description != "" {
		node.Description = updateData.Description
	}
	if updateData.IPAddress != "" {
		node.IPAddress = updateData.IPAddress
	}
	if updateData.SSHPort != 0 {
		node.SSHPort = updateData.SSHPort
	}
	if updateData.SSHUser != "" {
		node.SSHUser = updateData.SSHUser
	}
	if updateData.Status != "" {
		node.Status = updateData.Status
	}
	node.UpdatedAt = time.Now()

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    node,
		"message": "节点更新成功",
	})
}

func (nc *NodeController) DeleteNode(c *gin.Context) {
	id := c.Param("id")
	_, exists := nc.nodes[id]
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "节点未找到",
		})
		return
	}

	delete(nc.nodes, id)
	delete(nc.nodeStats, id)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "节点删除成功",
	})
}

func (nc *NodeController) GetNodeStats(c *gin.Context) {
	id := c.Param("id")
	node, exists := nc.nodes[id]
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "节点未找到",
		})
		return
	}

	stats, exists := nc.nodeStats[id]
	if !exists {
		stats = nc.generateRandomStats()
		nc.nodeStats[id] = stats
	} else {
		stats = nc.generateRandomStats()
		nc.nodeStats[id] = stats
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"node":  node,
			"stats": stats,
		},
	})
}

func (nc *NodeController) GetNodeMetrics(c *gin.Context) {
	id := c.Param("id")
	_, exists := nc.nodes[id]
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "节点未找到",
		})
		return
	}

	hoursStr := c.DefaultQuery("hours", "24")
	hours, _ := strconv.Atoi(hoursStr)

	var metrics []models.NodeMetrics
	for i := hours; i > 0; i-- {
		metric := models.NodeMetrics{
			NodeID:    id,
			Timestamp: time.Now().Add(time.Duration(-i) * time.Hour),
			Metrics: map[string]interface{}{
				"cpu_usage":     20 + rand.Float64()*60,
				"memory_usage":  30 + rand.Float64()*50,
				"disk_usage":    40 + rand.Float64()*40,
				"temperature":   35 + rand.Float64()*25,
				"network_in":    rand.Float64() * 100,
				"network_out":   rand.Float64() * 50,
			},
		}
		metrics = append(metrics, metric)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    metrics,
	})
}

func (nc *NodeController) ConnectSSH(c *gin.Context) {
	id := c.Param("id")
	node, exists := nc.nodes[id]
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "节点未找到",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"node_id":    node.ID,
			"node_name":  node.Name,
			"ip_address": node.IPAddress,
			"ssh_port":   node.SSHPort,
			"ssh_user":   node.SSHUser,
			"status":     "ready",
		},
		"message": "SSH连接已就绪",
	})
}

func (nc *NodeController) SSHWebSocket(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "WebSocket SSH 连接已建立",
	})
}
