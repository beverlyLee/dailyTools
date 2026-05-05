package logistics

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type Node struct {
	ID       string `json:"id"`
	Type     string `json:"type"`
	Name     string `json:"name"`
	Status   string `json:"status"`
	Location string `json:"location,omitempty"`
	Metrics  struct {
		OrdersInTransit int     `json:"ordersInTransit"`
		DeliveredToday  int     `json:"deliveredToday"`
		OnTimeRate      float64 `json:"onTimeRate"`
		AvgDeliveryTime float64 `json:"avgDeliveryTime"`
	} `json:"metrics"`
}

type Edge struct {
	ID         string  `json:"id"`
	Source     string  `json:"source"`
	Target     string  `json:"target"`
	Status     string  `json:"status"`
	IsAbnormal bool    `json:"isAbnormal"`
	Metrics    struct {
		TrafficVolume int     `json:"trafficVolume"`
		ErrorRate     float64 `json:"errorRate"`
		AvgLatency    float64 `json:"avgLatency"`
	} `json:"metrics"`
}

type Topology struct {
	Nodes []Node `json:"nodes"`
	Edges []Edge `json:"edges"`
}

type Order struct {
	ID            string  `json:"id"`
	OrderNumber   string  `json:"orderNumber"`
	Status        string  `json:"status"`
	Origin        string  `json:"origin"`
	Destination   string  `json:"destination"`
	Carrier       string  `json:"carrier"`
	Progress      float64 `json:"progress"`
	EstimatedTime string  `json:"estimatedTime"`
	ActualTime    string  `json:"actualTime,omitempty"`
	HasAlert      bool    `json:"hasAlert"`
}

type InventoryItem struct {
	ID            string `json:"id"`
	SKU           string `json:"sku"`
	Name          string `json:"name"`
	Warehouse     string `json:"warehouse"`
	Location      string `json:"location"`
	CurrentStock  int    `json:"currentStock"`
	MinStockLevel int    `json:"minStockLevel"`
	MaxStockLevel int    `json:"maxStockLevel"`
	Status        string `json:"status"`
	LastUpdated   string `json:"lastUpdated"`
}

type Carrier struct {
	ID           string  `json:"id"`
	Name         string  `json:"name"`
	Type         string  `json:"type"`
	Status       string  `json:"status"`
	OnTimeRate   float64 `json:"onTimeRate"`
	ActiveVehicles int   `json:"activeVehicles"`
	TotalVehicles  int   `json:"totalVehicles"`
	CurrentOrders  int   `json:"currentOrders"`
	DeliveredToday int  `json:"deliveredToday"`
	ContactInfo    struct {
		Phone   string `json:"phone"`
		Email   string `json:"email"`
		Address string `json:"address"`
	} `json:"contactInfo"`
	PerformanceHistory []struct {
		Date       string  `json:"date"`
		OnTimeRate float64 `json:"onTimeRate"`
		Delivered  int     `json:"delivered"`
		Incidents  int     `json:"incidents"`
	} `json:"performanceHistory"`
}

type Alert struct {
	ID          string `json:"id"`
	Type        string `json:"type"`
	Severity    string `json:"severity"`
	Status      string `json:"status"`
	Title       string `json:"title"`
	Description string `json:"description"`
	EntityID    string `json:"entityId"`
	EntityType  string `json:"entityType"`
	CreatedAt   string `json:"createdAt"`
	Acknowledged bool  `json:"acknowledged"`
	AcknowledgedBy string `json:"acknowledgedBy,omitempty"`
	AcknowledgedAt string `json:"acknowledgedAt,omitempty"`
}

func GetTopology(c *fiber.Ctx) error {
	topology := Topology{
		Nodes: []Node{
			{ID: "supplier-1", Type: "supplier", Name: "原材料供应商A", Status: "healthy", Location: "上海"},
			{ID: "supplier-2", Type: "supplier", Name: "原材料供应商B", Status: "degraded", Location: "广州"},
			{ID: "warehouse-1", Type: "warehouse", Name: "华东配送中心", Status: "healthy", Location: "杭州"},
			{ID: "warehouse-2", Type: "warehouse", Name: "华北配送中心", Status: "healthy", Location: "北京"},
			{ID: "warehouse-3", Type: "warehouse", Name: "华南配送中心", Status: "error", Location: "深圳"},
			{ID: "carrier-1", Type: "carrier", Name: "顺丰速运", Status: "healthy"},
			{ID: "carrier-2", Type: "carrier", Name: "京东物流", Status: "healthy"},
			{ID: "carrier-3", Type: "carrier", Name: "中通快递", Status: "degraded"},
			{ID: "retailer-1", Type: "retailer", Name: "天猫旗舰店", Status: "healthy", Location: "杭州"},
			{ID: "retailer-2", Type: "retailer", Name: "京东自营店", Status: "healthy", Location: "北京"},
			{ID: "retailer-3", Type: "retailer", Name: "线下门店", Status: "healthy", Location: "全国"},
		},
		Edges: []Edge{
			{ID: "e1", Source: "supplier-1", Target: "warehouse-1", Status: "healthy", IsAbnormal: false},
			{ID: "e2", Source: "supplier-1", Target: "warehouse-2", Status: "healthy", IsAbnormal: false},
			{ID: "e3", Source: "supplier-2", Target: "warehouse-3", Status: "error", IsAbnormal: true},
			{ID: "e4", Source: "warehouse-1", Target: "carrier-1", Status: "healthy", IsAbnormal: false},
			{ID: "e5", Source: "warehouse-1", Target: "carrier-2", Status: "healthy", IsAbnormal: false},
			{ID: "e6", Source: "warehouse-2", Target: "carrier-1", Status: "healthy", IsAbnormal: false},
			{ID: "e7", Source: "warehouse-3", Target: "carrier-3", Status: "error", IsAbnormal: true},
			{ID: "e8", Source: "carrier-1", Target: "retailer-1", Status: "healthy", IsAbnormal: false},
			{ID: "e9", Source: "carrier-1", Target: "retailer-2", Status: "healthy", IsAbnormal: false},
			{ID: "e10", Source: "carrier-2", Target: "retailer-3", Status: "healthy", IsAbnormal: false},
			{ID: "e11", Source: "carrier-3", Target: "retailer-1", Status: "degraded", IsAbnormal: true},
		},
	}

	for i := range topology.Nodes {
		node := &topology.Nodes[i]
		switch node.Type {
		case "supplier":
			node.Metrics.OrdersInTransit = 15
			node.Metrics.DeliveredToday = 8
			node.Metrics.OnTimeRate = 0.92
			node.Metrics.AvgDeliveryTime = 2.5
		case "warehouse":
			node.Metrics.OrdersInTransit = 45
			node.Metrics.DeliveredToday = 23
			node.Metrics.OnTimeRate = 0.98
			node.Metrics.AvgDeliveryTime = 1.2
		case "carrier":
			node.Metrics.OrdersInTransit = 120
			node.Metrics.DeliveredToday = 89
			node.Metrics.OnTimeRate = 0.95
			node.Metrics.AvgDeliveryTime = 0.8
		case "retailer":
			node.Metrics.OrdersInTransit = 25
			node.Metrics.DeliveredToday = 156
			node.Metrics.OnTimeRate = 0.99
			node.Metrics.AvgDeliveryTime = 0.5
		}
	}

	for i := range topology.Edges {
		edge := &topology.Edges[i]
		edge.Metrics.TrafficVolume = 500
		edge.Metrics.ErrorRate = 0.01
		edge.Metrics.AvgLatency = 45
		if edge.IsAbnormal {
			edge.Metrics.ErrorRate = 0.15
			edge.Metrics.AvgLatency = 120
		}
	}

	return c.JSON(topology)
}

func GetOrders(c *fiber.Ctx) error {
	orders := []Order{
		{ID: uuid.New().String(), OrderNumber: "SO-2024-001", Status: "in_transit", Origin: "上海", Destination: "杭州", Carrier: "顺丰速运", Progress: 65, EstimatedTime: "2024-01-15 14:00", HasAlert: false},
		{ID: uuid.New().String(), OrderNumber: "SO-2024-002", Status: "delayed", Origin: "广州", Destination: "深圳", Carrier: "中通快递", Progress: 30, EstimatedTime: "2024-01-14 18:00", HasAlert: true},
		{ID: uuid.New().String(), OrderNumber: "SO-2024-003", Status: "delivered", Origin: "北京", Destination: "天津", Carrier: "京东物流", Progress: 100, EstimatedTime: "2024-01-14 10:00", ActualTime: "2024-01-14 09:45", HasAlert: false},
		{ID: uuid.New().String(), OrderNumber: "SO-2024-004", Status: "processing", Origin: "杭州", Destination: "南京", Carrier: "顺丰速运", Progress: 10, EstimatedTime: "2024-01-16 12:00", HasAlert: false},
		{ID: uuid.New().String(), OrderNumber: "SO-2024-005", Status: "in_transit", Origin: "深圳", Destination: "广州", Carrier: "中通快递", Progress: 80, EstimatedTime: "2024-01-15 09:00", HasAlert: false},
	}

	return c.JSON(orders)
}

func GetInventory(c *fiber.Ctx) error {
	inventory := []InventoryItem{
		{ID: uuid.New().String(), SKU: "SKU-001", Name: "产品A", Warehouse: "华东配送中心", Location: "A区-01-01", CurrentStock: 1500, MinStockLevel: 500, MaxStockLevel: 3000, Status: "normal", LastUpdated: "2024-01-14 08:30"},
		{ID: uuid.New().String(), SKU: "SKU-002", Name: "产品B", Warehouse: "华东配送中心", Location: "A区-01-02", CurrentStock: 800, MinStockLevel: 1000, MaxStockLevel: 2000, Status: "low", LastUpdated: "2024-01-14 08:30"},
		{ID: uuid.New().String(), SKU: "SKU-003", Name: "产品C", Warehouse: "华北配送中心", Location: "B区-02-01", CurrentStock: 0, MinStockLevel: 300, MaxStockLevel: 1500, Status: "out_of_stock", LastUpdated: "2024-01-14 07:45"},
		{ID: uuid.New().String(), SKU: "SKU-004", Name: "产品D", Warehouse: "华南配送中心", Location: "C区-03-01", CurrentStock: 2500, MinStockLevel: 800, MaxStockLevel: 3000, Status: "overstock", LastUpdated: "2024-01-14 09:00"},
	}

	return c.JSON(inventory)
}

func GetCarrierDetail(c *fiber.Ctx) error {
	id := c.Params("id")

	carrier := Carrier{
		ID:             id,
		Name:           "顺丰速运",
		Type:           "express",
		Status:         "healthy",
		OnTimeRate:     0.96,
		ActiveVehicles: 150,
		TotalVehicles:  200,
		CurrentOrders:  450,
		DeliveredToday: 890,
	}

	carrier.ContactInfo.Phone = "400-811-1111"
	carrier.ContactInfo.Email = "service@sf-express.com"
	carrier.ContactInfo.Address = "深圳市南山区科技园"

	carrier.PerformanceHistory = []struct {
		Date       string  `json:"date"`
		OnTimeRate float64 `json:"onTimeRate"`
		Delivered  int     `json:"delivered"`
		Incidents  int     `json:"incidents"`
	}{
		{Date: "2024-01-10", OnTimeRate: 0.94, Delivered: 850, Incidents: 2},
		{Date: "2024-01-11", OnTimeRate: 0.97, Delivered: 920, Incidents: 1},
		{Date: "2024-01-12", OnTimeRate: 0.95, Delivered: 780, Incidents: 3},
		{Date: "2024-01-13", OnTimeRate: 0.98, Delivered: 890, Incidents: 0},
		{Date: "2024-01-14", OnTimeRate: 0.96, Delivered: 890, Incidents: 1},
	}

	return c.JSON(carrier)
}

func GetAlerts(c *fiber.Ctx) error {
	alerts := []Alert{
		{ID: uuid.New().String(), Type: "delay", Severity: "high", Status: "active", Title: "订单SO-2024-002延迟", Description: "中通快递运输的订单SO-2024-002预计延迟2小时", EntityID: "SO-2024-002", EntityType: "order", CreatedAt: "2024-01-14 10:30:00", Acknowledged: false},
		{ID: uuid.New().String(), Type: "inventory", Severity: "medium", Status: "active", Title: "库存预警: 产品B", Description: "华东配送中心产品B库存低于安全线", EntityID: "SKU-002", EntityType: "inventory", CreatedAt: "2024-01-14 08:30:00", Acknowledged: false},
		{ID: uuid.New().String(), Type: "inventory", Severity: "high", Status: "active", Title: "库存缺货: 产品C", Description: "华北配送中心产品C已缺货", EntityID: "SKU-003", EntityType: "inventory", CreatedAt: "2024-01-14 07:45:00", Acknowledged: true},
		{ID: uuid.New().String(), Type: "carrier", Severity: "medium", Status: "active", Title: "承运商性能下降", Description: "中通快递准点率下降至85%", EntityID: "carrier-3", EntityType: "carrier", CreatedAt: "2024-01-14 09:15:00", Acknowledged: false},
	}

	return c.JSON(alerts)
}

func AcknowledgeAlert(c *fiber.Ctx) error {
	id := c.Params("id")
	_ = id

	return c.JSON(fiber.Map{
		"success": true,
		"message": "告警已确认",
	})
}
