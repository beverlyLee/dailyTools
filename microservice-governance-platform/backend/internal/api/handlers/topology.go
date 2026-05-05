package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"microservice-governance-platform/internal/model"
)

var mockServices = []model.Service{
	{
		ID:        "gateway",
		Name:      "api-gateway",
		Namespace: "default",
		Version:   "v1.0.0",
		Status:    "healthy",
		Instances: 3,
		Category:  "gateway",
		CreatedAt: time.Now().Add(-24 * time.Hour),
		UpdatedAt: time.Now(),
	},
	{
		ID:        "user",
		Name:      "user-service",
		Namespace: "default",
		Version:   "v2.0.1",
		Status:    "healthy",
		Instances: 4,
		Category:  "service",
		CreatedAt: time.Now().Add(-48 * time.Hour),
		UpdatedAt: time.Now(),
	},
	{
		ID:        "order",
		Name:      "order-service",
		Namespace: "default",
		Version:   "v1.5.0",
		Status:    "warning",
		Instances: 3,
		Category:  "service",
		CreatedAt: time.Now().Add(-72 * time.Hour),
		UpdatedAt: time.Now(),
	},
	{
		ID:        "payment",
		Name:      "payment-service",
		Namespace: "default",
		Version:   "v3.2.0",
		Status:    "unhealthy",
		Instances: 2,
		Category:  "service",
		CreatedAt: time.Now().Add(-96 * time.Hour),
		UpdatedAt: time.Now(),
	},
	{
		ID:        "product",
		Name:      "product-service",
		Namespace: "default",
		Version:   "v1.0.0",
		Status:    "healthy",
		Instances: 3,
		Category:  "service",
		CreatedAt: time.Now().Add(-120 * time.Hour),
		UpdatedAt: time.Now(),
	},
	{
		ID:        "user-db",
		Name:      "user-db",
		Namespace: "default",
		Version:   "MySQL 8.0",
		Status:    "healthy",
		Instances: 2,
		Category:  "db",
		CreatedAt: time.Now().Add(-144 * time.Hour),
		UpdatedAt: time.Now(),
	},
	{
		ID:        "order-db",
		Name:      "order-db",
		Namespace: "default",
		Version:   "PostgreSQL 14",
		Status:    "healthy",
		Instances: 3,
		Category:  "db",
		CreatedAt: time.Now().Add(-168 * time.Hour),
		UpdatedAt: time.Now(),
	},
}

var mockServiceMetrics = map[string]model.ServiceMetrics{
	"gateway": {
		ServiceID:      "gateway",
		ServiceName:    "api-gateway",
		QPS:            1250,
		AvgLatency:     15,
		P99Latency:     45,
		ErrorRate:      0.1,
		SuccessRequests: 124875,
		FailedRequests:  125,
		Timestamp:        time.Now(),
	},
	"user": {
		ServiceID:      "user",
		ServiceName:    "user-service",
		QPS:            500,
		AvgLatency:     10,
		P99Latency:     35,
		ErrorRate:      0.01,
		SuccessRequests: 49995,
		FailedRequests:  5,
		Timestamp:        time.Now(),
	},
	"order": {
		ServiceID:      "order",
		ServiceName:    "order-service",
		QPS:            300,
		AvgLatency:     25,
		P99Latency:     65,
		ErrorRate:      1.2,
		SuccessRequests: 29640,
		FailedRequests:  360,
		Timestamp:        time.Now(),
	},
	"payment": {
		ServiceID:      "payment",
		ServiceName:    "payment-service",
		QPS:            200,
		AvgLatency:     30,
		P99Latency:     95,
		ErrorRate:      5.0,
		SuccessRequests: 19000,
		FailedRequests:  1000,
		Timestamp:        time.Now(),
	},
	"product": {
		ServiceID:      "product",
		ServiceName:    "product-service",
		QPS:            400,
		AvgLatency:     8,
		P99Latency:     25,
		ErrorRate:      0.05,
		SuccessRequests: 39980,
		FailedRequests:  20,
		Timestamp:        time.Now(),
	},
}

var mockServiceDependencies = map[string]model.ServiceDependency{
	"gateway": {
		ServiceID:       "gateway",
		ServiceName:     "api-gateway",
		UpstreamServices:  []model.DependencyService{},
		DownstreamServices: []model.DependencyService{
			{ServiceName: "user-service", QPS: 500, ErrorRate: 0.1, Latency: 15},
			{ServiceName: "order-service", QPS: 300, ErrorRate: 1.2, Latency: 25},
			{ServiceName: "product-service", QPS: 400, ErrorRate: 0.05, Latency: 10},
		},
	},
	"user": {
		ServiceID:       "user",
		ServiceName:     "user-service",
		UpstreamServices:  []model.DependencyService{
			{ServiceName: "api-gateway", QPS: 500, ErrorRate: 0.1, Latency: 15},
		},
		DownstreamServices: []model.DependencyService{
			{ServiceName: "user-db", QPS: 500, ErrorRate: 0.01, Latency: 5},
		},
	},
	"order": {
		ServiceID:       "order",
		ServiceName:     "order-service",
		UpstreamServices:  []model.DependencyService{
			{ServiceName: "api-gateway", QPS: 300, ErrorRate: 1.2, Latency: 25},
		},
		DownstreamServices: []model.DependencyService{
			{ServiceName: "payment-service", QPS: 200, ErrorRate: 5.0, Latency: 30},
			{ServiceName: "order-db", QPS: 300, ErrorRate: 0.02, Latency: 8},
		},
	},
	"payment": {
		ServiceID:       "payment",
		ServiceName:     "payment-service",
		UpstreamServices:  []model.DependencyService{
			{ServiceName: "order-service", QPS: 200, ErrorRate: 5.0, Latency: 30},
		},
		DownstreamServices: []model.DependencyService{
			{ServiceName: "order-db", QPS: 200, ErrorRate: 3.5, Latency: 12},
		},
	},
	"product": {
		ServiceID:       "product",
		ServiceName:     "product-service",
		UpstreamServices:  []model.DependencyService{
			{ServiceName: "api-gateway", QPS: 400, ErrorRate: 0.05, Latency: 10},
		},
		DownstreamServices: []model.DependencyService{},
	},
	"user-db": {
		ServiceID:       "user-db",
		ServiceName:     "user-db",
		UpstreamServices:  []model.DependencyService{
			{ServiceName: "user-service", QPS: 500, ErrorRate: 0.01, Latency: 5},
		},
		DownstreamServices: []model.DependencyService{},
	},
	"order-db": {
		ServiceID:       "order-db",
		ServiceName:     "order-db",
		UpstreamServices:  []model.DependencyService{
			{ServiceName: "order-service", QPS: 300, ErrorRate: 0.02, Latency: 8},
			{ServiceName: "payment-service", QPS: 200, ErrorRate: 3.5, Latency: 12},
		},
		DownstreamServices: []model.DependencyService{},
	},
}

func GetTopology(c *gin.Context) {
	topology := model.TopologyData{
		Nodes: []model.TopologyNode{},
		Edges: []model.TopologyEdge{},
	}

	for _, svc := range mockServices {
		topology.Nodes = append(topology.Nodes, model.TopologyNode{
			ID:       svc.ID,
			Name:     svc.Name,
			Status:   svc.Status,
			Category: svc.Category,
		})
	}

	topology.Edges = []model.TopologyEdge{
		{Source: "gateway", Target: "user", Latency: 15, QPS: 500, ErrorRate: 0.1},
		{Source: "gateway", Target: "order", Latency: 25, QPS: 300, ErrorRate: 1.2},
		{Source: "gateway", Target: "product", Latency: 10, QPS: 400, ErrorRate: 0.05},
		{Source: "user", Target: "user-db", Latency: 5, QPS: 500, ErrorRate: 0.01},
		{Source: "order", Target: "payment", Latency: 30, QPS: 200, ErrorRate: 5.0},
		{Source: "order", Target: "order-db", Latency: 8, QPS: 300, ErrorRate: 0.02},
		{Source: "payment", Target: "order-db", Latency: 12, QPS: 200, ErrorRate: 3.5},
	}

	c.JSON(http.StatusOK, model.APIResponse{
		Success: true,
		Data:    topology,
	})
}

func GetServiceMetrics(c *gin.Context) {
	serviceID := c.Param("serviceId")

	metrics, exists := mockServiceMetrics[serviceID]
	if !exists {
		c.JSON(http.StatusNotFound, model.APIResponse{
			Success: false,
			Message: "Service not found",
		})
		return
	}

	c.JSON(http.StatusOK, model.APIResponse{
		Success: true,
		Data:    metrics,
	})
}

func GetServiceDependencies(c *gin.Context) {
	serviceID := c.Param("serviceId")

	deps, exists := mockServiceDependencies[serviceID]
	if !exists {
		c.JSON(http.StatusNotFound, model.APIResponse{
			Success: false,
			Message: "Service not found",
		})
		return
	}

	c.JSON(http.StatusOK, model.APIResponse{
		Success: true,
		Data:    deps,
	})
}

func GetServices(c *gin.Context) {
	c.JSON(http.StatusOK, model.APIResponse{
		Success: true,
		Data:    mockServices,
	})
}

func GetServiceHealth(c *gin.Context) {
	serviceID := c.Param("serviceId")

	var svc *model.Service
	for i := range mockServices {
		if mockServices[i].ID == serviceID {
			svc = &mockServices[i]
			break
		}
	}

	if svc == nil {
		c.JSON(http.StatusNotFound, model.APIResponse{
			Success: false,
			Message: "Service not found",
		})
		return
	}

	c.JSON(http.StatusOK, model.APIResponse{
		Success: true,
		Data: gin.H{
			"serviceId": svc.ID,
			"name":      svc.Name,
			"status":    svc.Status,
			"instances": svc.Instances,
			"version":   svc.Version,
		},
	})
}

func CreateService(c *gin.Context) {
	var svc model.Service
	if err := c.ShouldBindJSON(&svc); err != nil {
		c.JSON(http.StatusBadRequest, model.APIResponse{
			Success: false,
			Message: err.Error(),
		})
		return
	}

	svc.ID = uuid.New().String()
	svc.CreatedAt = time.Now()
	svc.UpdatedAt = time.Now()

	mockServices = append(mockServices, svc)

	c.JSON(http.StatusCreated, model.APIResponse{
		Success: true,
		Data:    svc,
	})
}

func UpdateService(c *gin.Context) {
	serviceID := c.Param("serviceId")

	var updateData model.Service
	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, model.APIResponse{
			Success: false,
			Message: err.Error(),
		})
		return
	}

	for i := range mockServices {
		if mockServices[i].ID == serviceID {
			if updateData.Name != "" {
				mockServices[i].Name = updateData.Name
			}
			if updateData.Version != "" {
				mockServices[i].Version = updateData.Version
			}
			if updateData.Status != "" {
				mockServices[i].Status = updateData.Status
			}
			mockServices[i].UpdatedAt = time.Now()

			c.JSON(http.StatusOK, model.APIResponse{
				Success: true,
				Data:    mockServices[i],
			})
			return
		}
	}

	c.JSON(http.StatusNotFound, model.APIResponse{
		Success: false,
		Message: "Service not found",
	})
}

func DeleteService(c *gin.Context) {
	serviceID := c.Param("serviceId")

	for i := range mockServices {
		if mockServices[i].ID == serviceID {
			mockServices = append(mockServices[:i], mockServices[i+1:]...)
			c.JSON(http.StatusOK, model.APIResponse{
				Success: true,
				Message: "Service deleted successfully",
			})
			return
		}
	}

	c.JSON(http.StatusNotFound, model.APIResponse{
		Success: false,
		Message: "Service not found",
	})
}
