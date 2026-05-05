package topology

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// Service 表示服务信息
type Service struct {
	Name        string            `json:"name"`
	Namespace   string            `json:"namespace"`
	Version     string            `json:"version"`
	Status      string            `json:"status"`
	Instances   int               `json:"instances"`
	Labels      map[string]string `json:"labels"`
	CreatedAt   string            `json:"createdAt"`
}

// ServiceInstance 表示服务实例信息
type ServiceInstance struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	PodName   string `json:"podName"`
	Namespace string `json:"namespace"`
	IP        string `json:"ip"`
	Port      int    `json:"port"`
	Status    string `json:"status"`
	Version   string `json:"version"`
	Node      string `json:"node"`
}

// ServiceMetrics 表示服务指标
type ServiceMetrics struct {
	ServiceName     string  `json:"serviceName"`
	RequestsPerSec  float64 `json:"requestsPerSec"`
	ErrorRate       float64 `json:"errorRate"`
	AvgLatencyMs    float64 `json:"avgLatencyMs"`
	P95LatencyMs    float64 `json:"p95LatencyMs"`
	P99LatencyMs    float64 `json:"p99LatencyMs"`
	RequestsTotal   int64   `json:"requestsTotal"`
	ErrorsTotal     int64   `json:"errorsTotal"`
}

// TopologyNode 表示拓扑图节点
type TopologyNode struct {
	ID          string            `json:"id"`
	ServiceName string            `json:"serviceName"`
	Namespace   string            `json:"namespace"`
	Version     string            `json:"version"`
	Type        string            `json:"type"`
	Status      string            `json:"status"`
	Metrics     ServiceMetrics    `json:"metrics"`
	Labels      map[string]string `json:"labels"`
	Instances   int               `json:"instances"`
}

// TopologyEdge 表示拓扑图边（调用关系）
type TopologyEdge struct {
	ID              string         `json:"id"`
	Source          string         `json:"source"`
	Target          string         `json:"target"`
	Protocol        string         `json:"protocol"`
	Metrics         ServiceMetrics `json:"metrics"`
	TrafficDirection string        `json:"trafficDirection"`
	IsAbnormal      bool           `json:"isAbnormal"`
	AbnormalReason  string         `json:"abnormalReason,omitempty"`
}

// Topology 表示完整的服务拓扑
type Topology struct {
	Nodes []TopologyNode `json:"nodes"`
	Edges []TopologyEdge `json:"edges"`
}

// 模拟数据 - 服务列表
var mockServices = []Service{
	{
		Name:      "product-service",
		Namespace: "default",
		Version:   "v1",
		Status:    "healthy",
		Instances: 3,
		Labels:    map[string]string{"app": "product-service", "version": "v1"},
		CreatedAt: "2024-01-15T08:30:00Z",
	},
	{
		Name:      "order-service",
		Namespace: "default",
		Version:   "v1",
		Status:    "healthy",
		Instances: 2,
		Labels:    map[string]string{"app": "order-service", "version": "v1"},
		CreatedAt: "2024-01-15T08:35:00Z",
	},
	{
		Name:      "payment-service",
		Namespace: "default",
		Version:   "v1",
		Status:    "degraded",
		Instances: 2,
		Labels:    map[string]string{"app": "payment-service", "version": "v1"},
		CreatedAt: "2024-01-15T08:40:00Z",
	},
	{
		Name:      "user-service",
		Namespace: "default",
		Version:   "v1",
		Status:    "healthy",
		Instances: 4,
		Labels:    map[string]string{"app": "user-service", "version": "v1"},
		CreatedAt: "2024-01-15T08:45:00Z",
	},
	{
		Name:      "api-gateway",
		Namespace: "default",
		Version:   "v1",
		Status:    "healthy",
		Instances: 2,
		Labels:    map[string]string{"app": "api-gateway", "version": "v1"},
		CreatedAt: "2024-01-15T08:25:00Z",
	},
}

// 模拟数据 - 服务实例
var mockServiceInstances = map[string][]ServiceInstance{
	"product-service": {
		{
			ID:        "product-service-1",
			Name:      "product-service",
			PodName:   "product-service-5d8f9c8d7f-abcde",
			Namespace: "default",
			IP:        "10.244.0.10",
			Port:      8080,
			Status:    "Running",
			Version:   "v1",
			Node:      "node-1",
		},
		{
			ID:        "product-service-2",
			Name:      "product-service",
			PodName:   "product-service-5d8f9c8d7f-fghij",
			Namespace: "default",
			IP:        "10.244.0.11",
			Port:      8080,
			Status:    "Running",
			Version:   "v1",
			Node:      "node-2",
		},
		{
			ID:        "product-service-3",
			Name:      "product-service",
			PodName:   "product-service-5d8f9c8d7f-klmno",
			Namespace: "default",
			IP:        "10.244.0.12",
			Port:      8080,
			Status:    "Running",
			Version:   "v1",
			Node:      "node-1",
		},
	},
	"order-service": {
		{
			ID:        "order-service-1",
			Name:      "order-service",
			PodName:   "order-service-7b9c8d7e6f-abcde",
			Namespace: "default",
			IP:        "10.244.0.20",
			Port:      8080,
			Status:    "Running",
			Version:   "v1",
			Node:      "node-1",
		},
		{
			ID:        "order-service-2",
			Name:      "order-service",
			PodName:   "order-service-7b9c8d7e6f-fghij",
			Namespace: "default",
			IP:        "10.244.0.21",
			Port:      8080,
			Status:    "Running",
			Version:   "v1",
			Node:      "node-2",
		},
	},
	"payment-service": {
		{
			ID:        "payment-service-1",
			Name:      "payment-service",
			PodName:   "payment-service-3c4d5e6f7g-abcde",
			Namespace: "default",
			IP:        "10.244.0.30",
			Port:      8080,
			Status:    "Running",
			Version:   "v1",
			Node:      "node-1",
		},
		{
			ID:        "payment-service-2",
			Name:      "payment-service",
			PodName:   "payment-service-3c4d5e6f7g-fghij",
			Namespace: "default",
			IP:        "10.244.0.31",
			Port:      8080,
			Status:    "Running",
			Version:   "v1",
			Node:      "node-2",
		},
	},
	"user-service": {
		{
			ID:        "user-service-1",
			Name:      "user-service",
			PodName:   "user-service-1a2b3c4d5e-abcde",
			Namespace: "default",
			IP:        "10.244.0.40",
			Port:      8080,
			Status:    "Running",
			Version:   "v1",
			Node:      "node-1",
		},
		{
			ID:        "user-service-2",
			Name:      "user-service",
			PodName:   "user-service-1a2b3c4d5e-fghij",
			Namespace: "default",
			IP:        "10.244.0.41",
			Port:      8080,
			Status:    "Running",
			Version:   "v1",
			Node:      "node-2",
		},
		{
			ID:        "user-service-3",
			Name:      "user-service",
			PodName:   "user-service-1a2b3c4d5e-klmno",
			Namespace: "default",
			IP:        "10.244.0.42",
			Port:      8080,
			Status:    "Running",
			Version:   "v1",
			Node:      "node-1",
		},
		{
			ID:        "user-service-4",
			Name:      "user-service",
			PodName:   "user-service-1a2b3c4d5e-pqrst",
			Namespace: "default",
			IP:        "10.244.0.43",
			Port:      8080,
			Status:    "Running",
			Version:   "v1",
			Node:      "node-2",
		},
	},
	"api-gateway": {
		{
			ID:        "api-gateway-1",
			Name:      "api-gateway",
			PodName:   "api-gateway-9x8y7z6w5v-abcde",
			Namespace: "default",
			IP:        "10.244.0.5",
			Port:      8080,
			Status:    "Running",
			Version:   "v1",
			Node:      "node-1",
		},
		{
			ID:        "api-gateway-2",
			Name:      "api-gateway",
			PodName:   "api-gateway-9x8y7z6w5v-fghij",
			Namespace: "default",
			IP:        "10.244.0.6",
			Port:      8080,
			Status:    "Running",
			Version:   "v1",
			Node:      "node-2",
		},
	},
}

// 模拟数据 - 服务指标
var mockMetrics = map[string]ServiceMetrics{
	"api-gateway": {
		ServiceName:    "api-gateway",
		RequestsPerSec: 150.5,
		ErrorRate:      0.002,
		AvgLatencyMs:   45.2,
		P95LatencyMs:   120.8,
		P99LatencyMs:   250.3,
		RequestsTotal:  125000,
		ErrorsTotal:    250,
	},
	"product-service": {
		ServiceName:    "product-service",
		RequestsPerSec: 85.3,
		ErrorRate:      0.001,
		AvgLatencyMs:   32.5,
		P95LatencyMs:   95.7,
		P99LatencyMs:   180.2,
		RequestsTotal:  95000,
		ErrorsTotal:    95,
	},
	"order-service": {
		ServiceName:    "order-service",
		RequestsPerSec: 60.2,
		ErrorRate:      0.005,
		AvgLatencyMs:   75.8,
		P95LatencyMs:   210.5,
		P99LatencyMs:   450.9,
		RequestsTotal:  45000,
		ErrorsTotal:    225,
	},
	"payment-service": {
		ServiceName:    "payment-service",
		RequestsPerSec: 40.1,
		ErrorRate:      0.085,
		AvgLatencyMs:   150.3,
		P95LatencyMs:   500.2,
		P99LatencyMs:   900.8,
		RequestsTotal:  32000,
		ErrorsTotal:    2720,
	},
	"user-service": {
		ServiceName:    "user-service",
		RequestsPerSec: 100.7,
		ErrorRate:      0.003,
		AvgLatencyMs:   28.4,
		P95LatencyMs:   85.3,
		P99LatencyMs:   160.5,
		RequestsTotal:  85000,
		ErrorsTotal:    255,
	},
}

// 模拟数据 - 服务拓扑
var mockTopology = Topology{
	Nodes: []TopologyNode{
		{
			ID:          "api-gateway",
			ServiceName: "api-gateway",
			Namespace:   "default",
			Version:     "v1",
			Type:        "gateway",
			Status:      "healthy",
			Metrics:     mockMetrics["api-gateway"],
			Labels:      map[string]string{"app": "api-gateway", "version": "v1"},
			Instances:   2,
		},
		{
			ID:          "product-service",
			ServiceName: "product-service",
			Namespace:   "default",
			Version:     "v1",
			Type:        "service",
			Status:      "healthy",
			Metrics:     mockMetrics["product-service"],
			Labels:      map[string]string{"app": "product-service", "version": "v1"},
			Instances:   3,
		},
		{
			ID:          "order-service",
			ServiceName: "order-service",
			Namespace:   "default",
			Version:     "v1",
			Type:        "service",
			Status:      "healthy",
			Metrics:     mockMetrics["order-service"],
			Labels:      map[string]string{"app": "order-service", "version": "v1"},
			Instances:   2,
		},
		{
			ID:          "payment-service",
			ServiceName: "payment-service",
			Namespace:   "default",
			Version:     "v1",
			Type:        "service",
			Status:      "degraded",
			Metrics:     mockMetrics["payment-service"],
			Labels:      map[string]string{"app": "payment-service", "version": "v1"},
			Instances:   2,
		},
		{
			ID:          "user-service",
			ServiceName: "user-service",
			Namespace:   "default",
			Version:     "v1",
			Type:        "service",
			Status:      "healthy",
			Metrics:     mockMetrics["user-service"],
			Labels:      map[string]string{"app": "user-service", "version": "v1"},
			Instances:   4,
		},
	},
	Edges: []TopologyEdge{
		{
			ID:              "api-gateway-product-service",
			Source:          "api-gateway",
			Target:          "product-service",
			Protocol:        "HTTP",
			Metrics:         mockMetrics["product-service"],
			TrafficDirection: "inbound",
			IsAbnormal:      false,
		},
		{
			ID:              "api-gateway-order-service",
			Source:          "api-gateway",
			Target:          "order-service",
			Protocol:        "HTTP",
			Metrics:         mockMetrics["order-service"],
			TrafficDirection: "inbound",
			IsAbnormal:      false,
		},
		{
			ID:              "api-gateway-user-service",
			Source:          "api-gateway",
			Target:          "user-service",
			Protocol:        "HTTP",
			Metrics:         mockMetrics["user-service"],
			TrafficDirection: "inbound",
			IsAbnormal:      false,
		},
		{
			ID:              "order-service-payment-service",
			Source:          "order-service",
			Target:          "payment-service",
			Protocol:        "HTTP",
			Metrics:         mockMetrics["payment-service"],
			TrafficDirection: "inbound",
			IsAbnormal:      true,
			AbnormalReason:  "高错误率 (8.5%) 和高延迟 (P99: 900ms)",
		},
		{
			ID:              "order-service-user-service",
			Source:          "order-service",
			Target:          "user-service",
			Protocol:        "HTTP",
			Metrics:         mockMetrics["user-service"],
			TrafficDirection: "inbound",
			IsAbnormal:      false,
		},
		{
			ID:              "product-service-user-service",
			Source:          "product-service",
			Target:          "user-service",
			Protocol:        "HTTP",
			Metrics:         mockMetrics["user-service"],
			TrafficDirection: "inbound",
			IsAbnormal:      false,
		},
	},
}

// GetTopology 获取服务拓扑图
func GetTopology(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    mockTopology,
	})
}

// GetServices 获取服务列表
func GetServices(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    mockServices,
	})
}

// GetServiceDetails 获取服务详情
func GetServiceDetails(c *gin.Context) {
	serviceName := c.Param("name")
	
	for _, service := range mockServices {
		if service.Name == serviceName {
			metrics, exists := mockMetrics[serviceName]
			if !exists {
				metrics = ServiceMetrics{
					ServiceName: serviceName,
				}
			}
			
			c.JSON(http.StatusOK, gin.H{
				"success": true,
				"data": gin.H{
					"service": service,
					"metrics": metrics,
				},
			})
			return
		}
	}
	
	c.JSON(http.StatusNotFound, gin.H{
		"success": false,
		"error":   "服务不存在",
	})
}

// GetServiceInstances 获取服务实例列表
func GetServiceInstances(c *gin.Context) {
	serviceName := c.Param("name")
	
	instances, exists := mockServiceInstances[serviceName]
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "服务不存在或无实例",
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    instances,
	})
}

// GetMetrics 获取服务指标
func GetMetrics(c *gin.Context) {
	// 可以通过查询参数筛选特定服务
	serviceName := c.Query("service")
	
	if serviceName != "" {
		metrics, exists := mockMetrics[serviceName]
		if !exists {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error":   "服务不存在",
			})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    metrics,
		})
		return
	}
	
	// 返回所有服务指标
	allMetrics := make([]ServiceMetrics, 0, len(mockMetrics))
	for _, m := range mockMetrics {
		allMetrics = append(allMetrics, m)
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    allMetrics,
	})
}
