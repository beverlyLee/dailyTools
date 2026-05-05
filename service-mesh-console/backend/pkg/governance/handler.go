package governance

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gopkg.in/yaml.v3"
)

// 规则类型
const (
	RuleTypeCanary       = "canary"
	RuleTypeBlueGreen    = "blue-green"
	RuleTypeCircuitBreaker = "circuit-breaker"
	RuleTypeAccessControl = "access-control"
)

// CanaryRule 金丝雀发布规则
type CanaryRule struct {
	Name          string            `json:"name" yaml:"name"`
	Namespace     string            `json:"namespace" yaml:"namespace"`
	Service       string            `json:"service" yaml:"service"`
	StableVersion string            `json:"stableVersion" yaml:"stableVersion"`
	CanaryVersion string            `json:"canaryVersion" yaml:"canaryVersion"`
	Weight        int               `json:"weight" yaml:"weight"`
	TrafficRules   TrafficRules       `json:"trafficRules" yaml:"trafficRules"`
	Status        string            `json:"status" yaml:"status"`
	CreatedAt     string            `json:"createdAt" yaml:"createdAt"`
}

// BlueGreenRule 蓝绿部署规则
type BlueGreenRule struct {
	Name        string            `json:"name" yaml:"name"`
	Namespace   string            `json:"namespace" yaml:"namespace"`
	Service     string            `json:"service" yaml:"service"`
	BlueVersion string           `json:"blueVersion" yaml:"blueVersion"`
	GreenVersion string          `json:"greenVersion" yaml:"greenVersion"`
	ActiveVersion string          `json:"activeVersion" yaml:"activeVersion"`
	Status      string            `json:"status" yaml:"status"`
	CreatedAt   string            `json:"createdAt" yaml:"createdAt"`
}

// CircuitBreakerRule 熔断降级规则
type CircuitBreakerRule struct {
	Name           string              `json:"name" yaml:"name"`
	Namespace      string              `json:"namespace" yaml:"namespace"`
	Service        string              `json:"service" yaml:"service"`
	MaxConnections int                 `json:"maxConnections" yaml:"maxConnections"`
	MaxRequests    int                 `json:"maxRequests" yaml:"maxRequests"`
	TimeoutMs      int                 `json:"timeoutMs" yaml:"timeoutMs"`
	RetryPolicy    RetryPolicy         `json:"retryPolicy" yaml:"retryPolicy"`
	FallbackPolicy FallbackPolicy     `json:"fallbackPolicy" yaml:"fallbackPolicy"`
	Status         string              `json:"status" yaml:"status"`
	CreatedAt      string              `json:"createdAt" yaml:"createdAt"`
}

// AccessControlRule 黑白名单规则
type AccessControlRule struct {
	Name      string              `json:"name" yaml:"name"`
	Namespace string              `json:"namespace" yaml:"namespace"`
	Service   string              `json:"service" yaml:"service"`
	RuleType  string              `json:"ruleType" yaml:"ruleType"` // "whitelist" or "blacklist"
	Sources   []AccessControlSource `json:"sources" yaml:"sources"`
	Status    string              `json:"status" yaml:"status"`
	CreatedAt string              `json:"createdAt" yaml:"createdAt"`
}

// TrafficRules 流量规则
type TrafficRules struct {
	ByHeader  map[string]string `json:"byHeader,omitempty" yaml:"byHeader,omitempty"`
	ByCookie   map[string]string `json:"byCookie,omitempty" yaml:"byCookie,omitempty"`
	ByWeight   bool                `json:"byWeight" yaml:"byWeight"`
	ByUserAgent string              `json:"byUserAgent,omitempty" yaml:"byUserAgent,omitempty"`
}

// RetryPolicy 重试策略
type RetryPolicy struct {
	Attempts      int    `json:"attempts" yaml:"attempts"`
	PerTryTimeoutMs int  `json:"perTryTimeoutMs" yaml:"perTryTimeoutMs"`
	RetryOn      string `json:"retryOn" yaml:"retryOn"`
}

// FallbackPolicy 降级策略
type FallbackPolicy struct {
	Enabled     bool   `json:"enabled" yaml:"enabled"`
	MaxErrors   int    `json:"maxErrors" yaml:"maxErrors"`
	ErrorWindowMs int    `json:"errorWindowMs" yaml:"errorWindowMs"`
	BaseTimeMs  int    `json:"baseTimeMs" yaml:"baseTimeMs"`
}

// AccessControlSource 访问控制源
type AccessControlSource struct {
	Type  string `json:"type" yaml:"type"` // "ip", "service", "namespace"
	Value string `json:"value" yaml:"value"`
}

// 模拟数据
var mockCanaryRules = []CanaryRule{
	{
		Name:          "product-service-canary",
		Namespace:     "default",
		Service:       "product-service",
		StableVersion: "v1",
		CanaryVersion: "v2",
		Weight:        10,
		TrafficRules: TrafficRules{
			ByWeight: true,
		},
		Status:    "active",
		CreatedAt: "2024-01-20T10:00:00Z",
	},
}

var mockBlueGreenRules = []BlueGreenRule{
	{
		Name:        "order-service-blue-green",
		Namespace:   "default",
		Service:     "order-service",
		BlueVersion: "v1",
		GreenVersion: "v2",
		ActiveVersion: "blue",
		Status:      "active",
		CreatedAt:   "2024-01-20T11:00:00Z",
	},
}

var mockCircuitBreakerRules = []CircuitBreakerRule{
	{
		Name:           "payment-service-circuit-breaker",
		Namespace:      "default",
		Service:        "payment-service",
		MaxConnections: 100,
		MaxRequests:    200,
		TimeoutMs:      5000,
		RetryPolicy: RetryPolicy{
			Attempts:      3,
			PerTryTimeoutMs: 1000,
			RetryOn:      "5xx,connect-failure,refused-stream",
		},
		FallbackPolicy: FallbackPolicy{
			Enabled:     true,
			MaxErrors:   5,
			ErrorWindowMs: 30000,
			BaseTimeMs:  60000,
		},
		Status:    "active",
		CreatedAt: "2024-01-20T12:00:00Z",
	},
}

var mockAccessControlRules = []AccessControlRule{
	{
		Name:      "api-gateway-whitelist",
		Namespace: "default",
		Service:   "api-gateway",
		RuleType:  "whitelist",
		Sources: []AccessControlSource{
			{Type: "ip", Value: "10.0.0.0/8"},
			{Type: "service", Value: "frontend-service"},
		},
		Status:    "active",
		CreatedAt: "2024-01-20T09:00:00Z",
	},
}

// GetCanaryRules 获取金丝雀发布规则列表
func GetCanaryRules(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    mockCanaryRules,
	})
}

// CreateCanaryRule 创建金丝雀发布规则
func CreateCanaryRule(c *gin.Context) {
	var rule CanaryRule
	if err := c.ShouldBindJSON(&rule); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "请求参数无效: " + err.Error(),
		})
		return
	}
	
	rule.Status = "active"
	mockCanaryRules = append(mockCanaryRules, rule)
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    rule,
	})
}

// UpdateCanaryRule 更新金丝雀发布规则
func UpdateCanaryRule(c *gin.Context) {
	name := c.Param("name")
	
	var rule CanaryRule
	if err := c.ShouldBindJSON(&rule); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "请求参数无效: " + err.Error(),
		})
		return
	}
	
	for i, r := range mockCanaryRules {
		if r.Name == name {
			rule.Name = name
			mockCanaryRules[i] = rule
			c.JSON(http.StatusOK, gin.H{
				"success": true,
				"data":    rule,
			})
			return
		}
	}
	
	c.JSON(http.StatusNotFound, gin.H{
		"success": false,
		"error":   "规则不存在",
	})
}

// DeleteCanaryRule 删除金丝雀发布规则
func DeleteCanaryRule(c *gin.Context) {
	name := c.Param("name")
	
	for i, r := range mockCanaryRules {
		if r.Name == name {
			mockCanaryRules = append(mockCanaryRules[:i], mockCanaryRules[i+1:]...)
			c.JSON(http.StatusOK, gin.H{
				"success": true,
			})
			return
		}
	}
	
	c.JSON(http.StatusNotFound, gin.H{
		"success": false,
		"error":   "规则不存在",
	})
}

// GetBlueGreenRules 获取蓝绿部署规则列表
func GetBlueGreenRules(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    mockBlueGreenRules,
	})
}

// CreateBlueGreenRule 创建蓝绿部署规则
func CreateBlueGreenRule(c *gin.Context) {
	var rule BlueGreenRule
	if err := c.ShouldBindJSON(&rule); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "请求参数无效: " + err.Error(),
		})
		return
	}
	
	rule.Status = "active"
	mockBlueGreenRules = append(mockBlueGreenRules, rule)
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    rule,
	})
}

// UpdateBlueGreenRule 更新蓝绿部署规则
func UpdateBlueGreenRule(c *gin.Context) {
	name := c.Param("name")
	
	var rule BlueGreenRule
	if err := c.ShouldBindJSON(&rule); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "请求参数无效: " + err.Error(),
		})
		return
	}
	
	for i, r := range mockBlueGreenRules {
		if r.Name == name {
			rule.Name = name
			mockBlueGreenRules[i] = rule
			c.JSON(http.StatusOK, gin.H{
				"success": true,
				"data":    rule,
			})
			return
		}
	}
	
	c.JSON(http.StatusNotFound, gin.H{
		"success": false,
		"error":   "规则不存在",
	})
}

// DeleteBlueGreenRule 删除蓝绿部署规则
func DeleteBlueGreenRule(c *gin.Context) {
	name := c.Param("name")
	
	for i, r := range mockBlueGreenRules {
		if r.Name == name {
			mockBlueGreenRules = append(mockBlueGreenRules[:i], mockBlueGreenRules[i+1:]...)
			c.JSON(http.StatusOK, gin.H{
				"success": true,
			})
			return
		}
	}
	
	c.JSON(http.StatusNotFound, gin.H{
		"success": false,
		"error":   "规则不存在",
	})
}

// GetCircuitBreakerRules 获取熔断降级规则列表
func GetCircuitBreakerRules(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    mockCircuitBreakerRules,
	})
}

// CreateCircuitBreakerRule 创建熔断降级规则
func CreateCircuitBreakerRule(c *gin.Context) {
	var rule CircuitBreakerRule
	if err := c.ShouldBindJSON(&rule); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "请求参数无效: " + err.Error(),
		})
		return
	}
	
	rule.Status = "active"
	mockCircuitBreakerRules = append(mockCircuitBreakerRules, rule)
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    rule,
	})
}

// UpdateCircuitBreakerRule 更新熔断降级规则
func UpdateCircuitBreakerRule(c *gin.Context) {
	name := c.Param("name")
	
	var rule CircuitBreakerRule
	if err := c.ShouldBindJSON(&rule); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "请求参数无效: " + err.Error(),
		})
		return
	}
	
	for i, r := range mockCircuitBreakerRules {
		if r.Name == name {
			rule.Name = name
			mockCircuitBreakerRules[i] = rule
			c.JSON(http.StatusOK, gin.H{
				"success": true,
				"data":    rule,
			})
			return
		}
	}
	
	c.JSON(http.StatusNotFound, gin.H{
		"success": false,
		"error":   "规则不存在",
	})
}

// DeleteCircuitBreakerRule 删除熔断降级规则
func DeleteCircuitBreakerRule(c *gin.Context) {
	name := c.Param("name")
	
	for i, r := range mockCircuitBreakerRules {
		if r.Name == name {
			mockCircuitBreakerRules = append(mockCircuitBreakerRules[:i], mockCircuitBreakerRules[i+1:]...)
			c.JSON(http.StatusOK, gin.H{
				"success": true,
			})
			return
		}
	}
	
	c.JSON(http.StatusNotFound, gin.H{
		"success": false,
		"error":   "规则不存在",
	})
}

// GetAccessControlRules 获取访问控制规则列表
func GetAccessControlRules(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    mockAccessControlRules,
	})
}

// CreateAccessControlRule 创建访问控制规则
func CreateAccessControlRule(c *gin.Context) {
	var rule AccessControlRule
	if err := c.ShouldBindJSON(&rule); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "请求参数无效: " + err.Error(),
		})
		return
	}
	
	rule.Status = "active"
	mockAccessControlRules = append(mockAccessControlRules, rule)
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    rule,
	})
}

// UpdateAccessControlRule 更新访问控制规则
func UpdateAccessControlRule(c *gin.Context) {
	name := c.Param("name")
	
	var rule AccessControlRule
	if err := c.ShouldBindJSON(&rule); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "请求参数无效: " + err.Error(),
		})
		return
	}
	
	for i, r := range mockAccessControlRules {
		if r.Name == name {
			rule.Name = name
			mockAccessControlRules[i] = rule
			c.JSON(http.StatusOK, gin.H{
				"success": true,
				"data":    rule,
			})
			return
		}
	}
	
	c.JSON(http.StatusNotFound, gin.H{
		"success": false,
		"error":   "规则不存在",
	})
}

// DeleteAccessControlRule 删除访问控制规则
func DeleteAccessControlRule(c *gin.Context) {
	name := c.Param("name")
	
	for i, r := range mockAccessControlRules {
		if r.Name == name {
			mockAccessControlRules = append(mockAccessControlRules[:i], mockAccessControlRules[i+1:]...)
			c.JSON(http.StatusOK, gin.H{
				"success": true,
			})
			return
		}
	}
	
	c.JSON(http.StatusNotFound, gin.H{
		"success": false,
		"error":   "规则不存在",
	})
}

// GetRuleYAML 获取规则的 YAML 格式
func GetRuleYAML(c *gin.Context) {
	ruleType := c.Param("ruleType")
	name := c.Param("name")
	
	var yamlData []byte
	var err error
	
	switch ruleType {
	case RuleTypeCanary:
		for _, r := range mockCanaryRules {
			if r.Name == name {
				yamlData, err = yaml.Marshal(r)
				break
			}
		}
	case RuleTypeBlueGreen:
		for _, r := range mockBlueGreenRules {
			if r.Name == name {
				yamlData, err = yaml.Marshal(r)
				break
			}
		}
	case RuleTypeCircuitBreaker:
		for _, r := range mockCircuitBreakerRules {
			if r.Name == name {
				yamlData, err = yaml.Marshal(r)
				break
			}
		}
	case RuleTypeAccessControl:
		for _, r := range mockAccessControlRules {
			if r.Name == name {
				yamlData, err = yaml.Marshal(r)
				break
			}
		}
	default:
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "无效的规则类型",
		})
		return
	}
	
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "YAML 序列化失败: " + err.Error(),
		})
		return
	}
	
	if yamlData == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "规则不存在",
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    string(yamlData),
	})
}

// ApplyRuleYAML 应用 YAML 格式的规则
func ApplyRuleYAML(c *gin.Context) {
	ruleType := c.Param("ruleType")
	
	var request struct {
		YAML string `json:"yaml"`
	}
	
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "请求参数无效: " + err.Error(),
		})
		return
	}
	
	switch ruleType {
	case RuleTypeCanary:
		var rule CanaryRule
		if err := yaml.Unmarshal([]byte(request.YAML), &rule); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   "YAML 解析失败: " + err.Error(),
			})
			return
		}
		rule.Status = "active"
		mockCanaryRules = append(mockCanaryRules, rule)
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    rule,
		})
	case RuleTypeBlueGreen:
		var rule BlueGreenRule
		if err := yaml.Unmarshal([]byte(request.YAML), &rule); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   "YAML 解析失败: " + err.Error(),
			})
			return
		}
		rule.Status = "active"
		mockBlueGreenRules = append(mockBlueGreenRules, rule)
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    rule,
		})
	case RuleTypeCircuitBreaker:
		var rule CircuitBreakerRule
		if err := yaml.Unmarshal([]byte(request.YAML), &rule); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   "YAML 解析失败: " + err.Error(),
			})
			return
		}
		rule.Status = "active"
		mockCircuitBreakerRules = append(mockCircuitBreakerRules, rule)
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    rule,
		})
	case RuleTypeAccessControl:
		var rule AccessControlRule
		if err := yaml.Unmarshal([]byte(request.YAML), &rule); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   "YAML 解析失败: " + err.Error(),
			})
			return
		}
		rule.Status = "active"
		mockAccessControlRules = append(mockAccessControlRules, rule)
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    rule,
		})
	default:
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "无效的规则类型",
		})
	}
}
