package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"microservice-governance-platform/internal/model"
)

var mockCanaryRules = []model.CanaryRule{
	{
		ID:             "1",
		ServiceName:    "user-service",
		CanaryVersion:  "v2.0.0",
		StableVersion:  "v1.0.0",
		Weight:         10,
		RuleType:       "weight",
		MatchCondition: "",
		Status:         "enabled",
		Description:    "用户服务灰度发布测试",
		Stats: model.CanaryStats{
			TotalRequests:  100000,
			CanaryRequests: 10000,
			StableRequests: 90000,
			CanarySuccess:  9800,
			CanaryFailed:   200,
			StableSuccess:  89500,
			StableFailed:   500,
		},
		CreatedAt: time.Now().Add(-96 * time.Hour),
		UpdatedAt: time.Now(),
	},
	{
		ID:             "2",
		ServiceName:    "order-service",
		CanaryVersion:  "v1.5.0",
		StableVersion:  "v1.4.0",
		Weight:         20,
		RuleType:       "header",
		MatchCondition: "x-version=canary",
		Status:         "enabled",
		Description:    "订单服务按请求头灰度",
		Stats: model.CanaryStats{
			TotalRequests:  50000,
			CanaryRequests: 10000,
			StableRequests: 40000,
			CanarySuccess:  9700,
			CanaryFailed:   300,
			StableSuccess:  39600,
			StableFailed:   400,
		},
		CreatedAt: time.Now().Add(-48 * time.Hour),
		UpdatedAt: time.Now(),
	},
	{
		ID:             "3",
		ServiceName:    "payment-service",
		CanaryVersion:  "v3.2.0",
		StableVersion:  "v3.1.0",
		Weight:         0,
		RuleType:       "weight",
		MatchCondition: "",
		Status:         "disabled",
		Description:    "支付服务灰度发布（待测试）",
		Stats: model.CanaryStats{
			TotalRequests:  0,
			CanaryRequests: 0,
			StableRequests: 0,
			CanarySuccess:  0,
			CanaryFailed:   0,
			StableSuccess:  0,
			StableFailed:   0,
		},
		CreatedAt: time.Now().Add(-24 * time.Hour),
		UpdatedAt: time.Now(),
	},
}

var mockBlueGreenRules = []model.BlueGreenRule{
	{
		ID:               "1",
		ServiceName:      "order-service",
		GreenVersion:     "v1.5.0",
		BlueVersion:      "v1.4.0",
		SwitchStrategy:   "manual",
		ValidationRules:  "健康检查通过，QPS >= 100，错误率 < 1%",
		RollbackStrategy: "manual",
		Status:           "running",
		Progress:         50,
		Step:             1,
		Description:      "订单服务蓝绿部署升级",
		StartTime:        func() *time.Time { t := time.Now().Add(-30 * time.Minute); return &t }(),
		CreatedAt:        time.Now().Add(-1 * time.Hour),
		UpdatedAt:        time.Now(),
	},
	{
		ID:               "2",
		ServiceName:      "user-service",
		GreenVersion:     "v2.0.0",
		BlueVersion:      "v1.0.0",
		SwitchStrategy:   "auto",
		ValidationRules:  "健康检查通过，QPS >= 200，错误率 < 0.5%",
		RollbackStrategy: "auto",
		Status:           "completed",
		Progress:         100,
		Step:             4,
		Description:      "用户服务蓝绿部署升级",
		StartTime:        func() *time.Time { t := time.Now().Add(-24 * time.Hour); return &t }(),
		CompleteTime:     func() *time.Time { t := time.Now().Add(-22 * time.Hour); return &t }(),
		CreatedAt:        time.Now().Add(-48 * time.Hour),
		UpdatedAt:        time.Now(),
	},
}

var mockCircuitBreakerRules = []model.CircuitBreakerRule{
	{
		ID:               "1",
		ServiceName:      "order-service",
		CircuitType:      "error_rate",
		Threshold:        50,
		WindowSize:       60,
		MinRequests:      10,
		CircuitDuration:  30,
		HalfOpenRequests: 5,
		FallbackStrategy: "return_default",
		FallbackValue:    `{"code": 503, "message": "服务暂时不可用"}`,
		Status:           "enabled",
		CircuitStatus:    "closed",
		Description:      "订单服务错误率超过50%时熔断",
		Stats: model.CircuitBreakerStats{
			TotalRequests:     15000,
			SuccessRequests:   14250,
			FailedRequests:    750,
			CircuitOpenCount:  3,
			CircuitCloseCount: 3,
		},
		CreatedAt: time.Now().Add(-96 * time.Hour),
		UpdatedAt: time.Now(),
	},
	{
		ID:               "2",
		ServiceName:      "payment-service",
		CircuitType:      "slow_call",
		Threshold:        3,
		WindowSize:       60,
		MinRequests:      10,
		CircuitDuration:  60,
		HalfOpenRequests: 3,
		FallbackStrategy: "redirect",
		RedirectUrl:      "/api/payment-fallback",
		Status:           "enabled",
		CircuitStatus:    "open",
		Description:      "支付服务慢调用超过3秒时熔断",
		Stats: model.CircuitBreakerStats{
			TotalRequests:     8000,
			SuccessRequests:   7200,
			FailedRequests:    800,
			CircuitOpenCount:  5,
			CircuitCloseCount: 4,
		},
		CreatedAt: time.Now().Add(-48 * time.Hour),
		UpdatedAt: time.Now(),
	},
}

var mockMirrorRules = []model.MirrorRule{
	{
		ID:            "1",
		SourceService: "api-gateway",
		TargetService: "user-service-v2",
		MirrorPercent: 10,
		MirrorType:    "all",
		PathPattern:   "",
		HeaderPattern: "",
		Timeout:       500,
		Async:         true,
		Status:        "enabled",
		Description:   "用户服务新版本流量镜像测试",
		Stats: model.MirrorStats{
			TotalRequests:    50000,
			MirroredRequests: 5000,
			SuccessResponses: 4800,
			FailedResponses:  200,
		},
		CreatedAt: time.Now().Add(-96 * time.Hour),
		UpdatedAt: time.Now(),
	},
	{
		ID:            "2",
		SourceService: "order-service",
		TargetService: "order-service-v2",
		MirrorPercent: 20,
		MirrorType:    "path",
		PathPattern:   "/api/v1/orders/*",
		HeaderPattern: "",
		Timeout:       1000,
		Async:         false,
		Status:        "enabled",
		Description:   "订单服务按路径流量镜像",
		Stats: model.MirrorStats{
			TotalRequests:    30000,
			MirroredRequests: 6000,
			SuccessResponses: 5900,
			FailedResponses:  100,
		},
		CreatedAt: time.Now().Add(-48 * time.Hour),
		UpdatedAt: time.Now(),
	},
}

var mockFaultRules = []model.FaultRule{
	{
		ID:                "1",
		TargetService:     "order-service",
		FaultType:         "delay",
		DelayDuration:     500,
		AbortStatus:       500,
		ErrorMessage:      "",
		InjectionPercent:  30,
		InjectionScope:    "all",
		SpecificInstances: "",
		Duration:          600,
		Status:            "active",
		StartTime:         func() *time.Time { t := time.Now().Add(-300 * time.Second); return &t }(),
		Description:       "订单服务延迟注入测试",
		Stats: model.FaultStats{
			TotalRequests:      15000,
			InjectedRequests:   4500,
			SuccessInjections:  4450,
			FailedInjections:   50,
		},
		CreatedAt: time.Now().Add(-1 * time.Hour),
		UpdatedAt: time.Now(),
	},
	{
		ID:                "2",
		TargetService:     "payment-service",
		FaultType:         "abort",
		DelayDuration:     0,
		AbortStatus:       503,
		ErrorMessage:      "",
		InjectionPercent:  10,
		InjectionScope:    "specific",
		SpecificInstances: "10.0.0.30:8080",
		Duration:          0,
		Status:            "stopped",
		StartTime:         nil,
		Description:       "支付服务中断注入测试",
		Stats: model.FaultStats{
			TotalRequests:      8000,
			InjectedRequests:   800,
			SuccessInjections:  780,
			FailedInjections:   20,
		},
		CreatedAt: time.Now().Add(-24 * time.Hour),
		UpdatedAt: time.Now(),
	},
}

func GetCanaryRules(c *gin.Context) {
	c.JSON(http.StatusOK, model.APIResponse{
		Success: true,
		Data:    mockCanaryRules,
	})
}

func GetCanaryRuleByID(c *gin.Context) {
	id := c.Param("id")

	for _, rule := range mockCanaryRules {
		if rule.ID == id {
			c.JSON(http.StatusOK, model.APIResponse{
				Success: true,
				Data:    rule,
			})
			return
		}
	}

	c.JSON(http.StatusNotFound, model.APIResponse{
		Success: false,
		Message: "Canary rule not found",
	})
}

func CreateCanaryRule(c *gin.Context) {
	var rule model.CanaryRule
	if err := c.ShouldBindJSON(&rule); err != nil {
		c.JSON(http.StatusBadRequest, model.APIResponse{
			Success: false,
			Message: err.Error(),
		})
		return
	}

	rule.ID = uuid.New().String()
	rule.Status = "disabled"
	rule.CreatedAt = time.Now()
	rule.UpdatedAt = time.Now()
	rule.Stats = model.CanaryStats{}

	mockCanaryRules = append(mockCanaryRules, rule)

	c.JSON(http.StatusCreated, model.APIResponse{
		Success: true,
		Data:    rule,
	})
}

func UpdateCanaryRule(c *gin.Context) {
	id := c.Param("id")

	var updateData model.CanaryRule
	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, model.APIResponse{
			Success: false,
			Message: err.Error(),
		})
		return
	}

	for i := range mockCanaryRules {
		if mockCanaryRules[i].ID == id {
			if updateData.ServiceName != "" {
				mockCanaryRules[i].ServiceName = updateData.ServiceName
			}
			if updateData.CanaryVersion != "" {
				mockCanaryRules[i].CanaryVersion = updateData.CanaryVersion
			}
			if updateData.StableVersion != "" {
				mockCanaryRules[i].StableVersion = updateData.StableVersion
			}
			if updateData.Weight >= 0 {
				mockCanaryRules[i].Weight = updateData.Weight
			}
			if updateData.RuleType != "" {
				mockCanaryRules[i].RuleType = updateData.RuleType
			}
			if updateData.Status != "" {
				mockCanaryRules[i].Status = updateData.Status
			}
			mockCanaryRules[i].UpdatedAt = time.Now()

			c.JSON(http.StatusOK, model.APIResponse{
				Success: true,
				Data:    mockCanaryRules[i],
			})
			return
		}
	}

	c.JSON(http.StatusNotFound, model.APIResponse{
		Success: false,
		Message: "Canary rule not found",
	})
}

func DeleteCanaryRule(c *gin.Context) {
	id := c.Param("id")

	for i := range mockCanaryRules {
		if mockCanaryRules[i].ID == id {
			mockCanaryRules = append(mockCanaryRules[:i], mockCanaryRules[i+1:]...)
			c.JSON(http.StatusOK, model.APIResponse{
				Success: true,
				Message: "Canary rule deleted successfully",
			})
			return
		}
	}

	c.JSON(http.StatusNotFound, model.APIResponse{
		Success: false,
		Message: "Canary rule not found",
	})
}

func ToggleCanaryStatus(c *gin.Context) {
	id := c.Param("id")
	status := c.Query("status")

	if status != "enabled" && status != "disabled" {
		c.JSON(http.StatusBadRequest, model.APIResponse{
			Success: false,
			Message: "Invalid status. Must be 'enabled' or 'disabled'",
		})
		return
	}

	for i := range mockCanaryRules {
		if mockCanaryRules[i].ID == id {
			mockCanaryRules[i].Status = status
			mockCanaryRules[i].UpdatedAt = time.Now()

			c.JSON(http.StatusOK, model.APIResponse{
				Success: true,
				Data:    mockCanaryRules[i],
			})
			return
		}
	}

	c.JSON(http.StatusNotFound, model.APIResponse{
		Success: false,
		Message: "Canary rule not found",
	})
}

func GetBlueGreenRules(c *gin.Context) {
	c.JSON(http.StatusOK, model.APIResponse{
		Success: true,
		Data:    mockBlueGreenRules,
	})
}

func GetBlueGreenRuleByID(c *gin.Context) {
	id := c.Param("id")

	for _, rule := range mockBlueGreenRules {
		if rule.ID == id {
			c.JSON(http.StatusOK, model.APIResponse{
				Success: true,
				Data:    rule,
			})
			return
		}
	}

	c.JSON(http.StatusNotFound, model.APIResponse{
		Success: false,
		Message: "BlueGreen rule not found",
	})
}

func CreateBlueGreenRule(c *gin.Context) {
	var rule model.BlueGreenRule
	if err := c.ShouldBindJSON(&rule); err != nil {
		c.JSON(http.StatusBadRequest, model.APIResponse{
			Success: false,
			Message: err.Error(),
		})
		return
	}

	rule.ID = uuid.New().String()
	rule.Status = "running"
	rule.Progress = 0
	rule.Step = 0
	rule.StartTime = func() *time.Time { t := time.Now(); return &t }()
	rule.CreatedAt = time.Now()
	rule.UpdatedAt = time.Now()

	mockBlueGreenRules = append(mockBlueGreenRules, rule)

	c.JSON(http.StatusCreated, model.APIResponse{
		Success: true,
		Data:    rule,
	})
}

func CompleteBlueGreenDeploy(c *gin.Context) {
	id := c.Param("id")

	for i := range mockBlueGreenRules {
		if mockBlueGreenRules[i].ID == id {
			mockBlueGreenRules[i].Status = "completed"
			mockBlueGreenRules[i].Progress = 100
			mockBlueGreenRules[i].Step = 4
			mockBlueGreenRules[i].CompleteTime = func() *time.Time { t := time.Now(); return &t }()
			mockBlueGreenRules[i].UpdatedAt = time.Now()

			c.JSON(http.StatusOK, model.APIResponse{
				Success: true,
				Data:    mockBlueGreenRules[i],
			})
			return
		}
	}

	c.JSON(http.StatusNotFound, model.APIResponse{
		Success: false,
		Message: "BlueGreen rule not found",
	})
}

func RollbackBlueGreenDeploy(c *gin.Context) {
	id := c.Param("id")

	for i := range mockBlueGreenRules {
		if mockBlueGreenRules[i].ID == id {
			mockBlueGreenRules[i].Status = "rollbacked"
			mockBlueGreenRules[i].Progress = 100
			mockBlueGreenRules[i].CompleteTime = func() *time.Time { t := time.Now(); return &t }()
			mockBlueGreenRules[i].UpdatedAt = time.Now()

			c.JSON(http.StatusOK, model.APIResponse{
				Success: true,
				Data:    mockBlueGreenRules[i],
			})
			return
		}
	}

	c.JSON(http.StatusNotFound, model.APIResponse{
		Success: false,
		Message: "BlueGreen rule not found",
	})
}

func GetCircuitBreakerRules(c *gin.Context) {
	c.JSON(http.StatusOK, model.APIResponse{
		Success: true,
		Data:    mockCircuitBreakerRules,
	})
}

func GetCircuitBreakerRuleByID(c *gin.Context) {
	id := c.Param("id")

	for _, rule := range mockCircuitBreakerRules {
		if rule.ID == id {
			c.JSON(http.StatusOK, model.APIResponse{
				Success: true,
				Data:    rule,
			})
			return
		}
	}

	c.JSON(http.StatusNotFound, model.APIResponse{
		Success: false,
		Message: "CircuitBreaker rule not found",
	})
}

func CreateCircuitBreakerRule(c *gin.Context) {
	var rule model.CircuitBreakerRule
	if err := c.ShouldBindJSON(&rule); err != nil {
		c.JSON(http.StatusBadRequest, model.APIResponse{
			Success: false,
			Message: err.Error(),
		})
		return
	}

	rule.ID = uuid.New().String()
	rule.Status = "disabled"
	rule.CircuitStatus = "closed"
	rule.CreatedAt = time.Now()
	rule.UpdatedAt = time.Now()
	rule.Stats = model.CircuitBreakerStats{}

	mockCircuitBreakerRules = append(mockCircuitBreakerRules, rule)

	c.JSON(http.StatusCreated, model.APIResponse{
		Success: true,
		Data:    rule,
	})
}

func UpdateCircuitBreakerRule(c *gin.Context) {
	id := c.Param("id")

	var updateData model.CircuitBreakerRule
	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, model.APIResponse{
			Success: false,
			Message: err.Error(),
		})
		return
	}

	for i := range mockCircuitBreakerRules {
		if mockCircuitBreakerRules[i].ID == id {
			if updateData.ServiceName != "" {
				mockCircuitBreakerRules[i].ServiceName = updateData.ServiceName
			}
			if updateData.CircuitType != "" {
				mockCircuitBreakerRules[i].CircuitType = updateData.CircuitType
			}
			if updateData.Threshold > 0 {
				mockCircuitBreakerRules[i].Threshold = updateData.Threshold
			}
			if updateData.Status != "" {
				mockCircuitBreakerRules[i].Status = updateData.Status
			}
			mockCircuitBreakerRules[i].UpdatedAt = time.Now()

			c.JSON(http.StatusOK, model.APIResponse{
				Success: true,
				Data:    mockCircuitBreakerRules[i],
			})
			return
		}
	}

	c.JSON(http.StatusNotFound, model.APIResponse{
		Success: false,
		Message: "CircuitBreaker rule not found",
	})
}

func DeleteCircuitBreakerRule(c *gin.Context) {
	id := c.Param("id")

	for i := range mockCircuitBreakerRules {
		if mockCircuitBreakerRules[i].ID == id {
			mockCircuitBreakerRules = append(mockCircuitBreakerRules[:i], mockCircuitBreakerRules[i+1:]...)
			c.JSON(http.StatusOK, model.APIResponse{
				Success: true,
				Message: "CircuitBreaker rule deleted successfully",
			})
			return
		}
	}

	c.JSON(http.StatusNotFound, model.APIResponse{
		Success: false,
		Message: "CircuitBreaker rule not found",
	})
}

func ToggleCircuitBreakerStatus(c *gin.Context) {
	id := c.Param("id")
	status := c.Query("status")

	if status != "enabled" && status != "disabled" {
		c.JSON(http.StatusBadRequest, model.APIResponse{
			Success: false,
			Message: "Invalid status. Must be 'enabled' or 'disabled'",
		})
		return
	}

	for i := range mockCircuitBreakerRules {
		if mockCircuitBreakerRules[i].ID == id {
			mockCircuitBreakerRules[i].Status = status
			mockCircuitBreakerRules[i].UpdatedAt = time.Now()

			c.JSON(http.StatusOK, model.APIResponse{
				Success: true,
				Data:    mockCircuitBreakerRules[i],
			})
			return
		}
	}

	c.JSON(http.StatusNotFound, model.APIResponse{
		Success: false,
		Message: "CircuitBreaker rule not found",
	})
}

func GetMirrorRules(c *gin.Context) {
	c.JSON(http.StatusOK, model.APIResponse{
		Success: true,
		Data:    mockMirrorRules,
	})
}

func GetMirrorRuleByID(c *gin.Context) {
	id := c.Param("id")

	for _, rule := range mockMirrorRules {
		if rule.ID == id {
			c.JSON(http.StatusOK, model.APIResponse{
				Success: true,
				Data:    rule,
			})
			return
		}
	}

	c.JSON(http.StatusNotFound, model.APIResponse{
		Success: false,
		Message: "Mirror rule not found",
	})
}

func CreateMirrorRule(c *gin.Context) {
	var rule model.MirrorRule
	if err := c.ShouldBindJSON(&rule); err != nil {
		c.JSON(http.StatusBadRequest, model.APIResponse{
			Success: false,
			Message: err.Error(),
		})
		return
	}

	rule.ID = uuid.New().String()
	rule.Status = "disabled"
	rule.CreatedAt = time.Now()
	rule.UpdatedAt = time.Now()
	rule.Stats = model.MirrorStats{}

	mockMirrorRules = append(mockMirrorRules, rule)

	c.JSON(http.StatusCreated, model.APIResponse{
		Success: true,
		Data:    rule,
	})
}

func UpdateMirrorRule(c *gin.Context) {
	id := c.Param("id")

	var updateData model.MirrorRule
	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, model.APIResponse{
			Success: false,
			Message: err.Error(),
		})
		return
	}

	for i := range mockMirrorRules {
		if mockMirrorRules[i].ID == id {
			if updateData.SourceService != "" {
				mockMirrorRules[i].SourceService = updateData.SourceService
			}
			if updateData.TargetService != "" {
				mockMirrorRules[i].TargetService = updateData.TargetService
			}
			if updateData.MirrorPercent >= 0 {
				mockMirrorRules[i].MirrorPercent = updateData.MirrorPercent
			}
			if updateData.Status != "" {
				mockMirrorRules[i].Status = updateData.Status
			}
			mockMirrorRules[i].UpdatedAt = time.Now()

			c.JSON(http.StatusOK, model.APIResponse{
				Success: true,
				Data:    mockMirrorRules[i],
			})
			return
		}
	}

	c.JSON(http.StatusNotFound, model.APIResponse{
		Success: false,
		Message: "Mirror rule not found",
	})
}

func DeleteMirrorRule(c *gin.Context) {
	id := c.Param("id")

	for i := range mockMirrorRules {
		if mockMirrorRules[i].ID == id {
			mockMirrorRules = append(mockMirrorRules[:i], mockMirrorRules[i+1:]...)
			c.JSON(http.StatusOK, model.APIResponse{
				Success: true,
				Message: "Mirror rule deleted successfully",
			})
			return
		}
	}

	c.JSON(http.StatusNotFound, model.APIResponse{
		Success: false,
		Message: "Mirror rule not found",
	})
}

func ToggleMirrorStatus(c *gin.Context) {
	id := c.Param("id")
	status := c.Query("status")

	if status != "enabled" && status != "disabled" {
		c.JSON(http.StatusBadRequest, model.APIResponse{
			Success: false,
			Message: "Invalid status. Must be 'enabled' or 'disabled'",
		})
		return
	}

	for i := range mockMirrorRules {
		if mockMirrorRules[i].ID == id {
			mockMirrorRules[i].Status = status
			mockMirrorRules[i].UpdatedAt = time.Now()

			c.JSON(http.StatusOK, model.APIResponse{
				Success: true,
				Data:    mockMirrorRules[i],
			})
			return
		}
	}

	c.JSON(http.StatusNotFound, model.APIResponse{
		Success: false,
		Message: "Mirror rule not found",
	})
}

func GetFaultRules(c *gin.Context) {
	c.JSON(http.StatusOK, model.APIResponse{
		Success: true,
		Data:    mockFaultRules,
	})
}

func GetFaultRuleByID(c *gin.Context) {
	id := c.Param("id")

	for _, rule := range mockFaultRules {
		if rule.ID == id {
			c.JSON(http.StatusOK, model.APIResponse{
				Success: true,
				Data:    rule,
			})
			return
		}
	}

	c.JSON(http.StatusNotFound, model.APIResponse{
		Success: false,
		Message: "Fault rule not found",
	})
}

func CreateFaultRule(c *gin.Context) {
	var rule model.FaultRule
	if err := c.ShouldBindJSON(&rule); err != nil {
		c.JSON(http.StatusBadRequest, model.APIResponse{
			Success: false,
			Message: err.Error(),
		})
		return
	}

	rule.ID = uuid.New().String()
	rule.Status = "stopped"
	rule.CreatedAt = time.Now()
	rule.UpdatedAt = time.Now()
	rule.Stats = model.FaultStats{}

	mockFaultRules = append(mockFaultRules, rule)

	c.JSON(http.StatusCreated, model.APIResponse{
		Success: true,
		Data:    rule,
	})
}

func StartFaultInjection(c *gin.Context) {
	id := c.Param("id")

	for i := range mockFaultRules {
		if mockFaultRules[i].ID == id {
			mockFaultRules[i].Status = "active"
			mockFaultRules[i].StartTime = func() *time.Time { t := time.Now(); return &t }()
			mockFaultRules[i].UpdatedAt = time.Now()

			c.JSON(http.StatusOK, model.APIResponse{
				Success: true,
				Data:    mockFaultRules[i],
			})
			return
		}
	}

	c.JSON(http.StatusNotFound, model.APIResponse{
		Success: false,
		Message: "Fault rule not found",
	})
}

func StopFaultInjection(c *gin.Context) {
	id := c.Param("id")

	for i := range mockFaultRules {
		if mockFaultRules[i].ID == id {
			mockFaultRules[i].Status = "stopped"
			mockFaultRules[i].StartTime = nil
			mockFaultRules[i].UpdatedAt = time.Now()

			c.JSON(http.StatusOK, model.APIResponse{
				Success: true,
				Data:    mockFaultRules[i],
			})
			return
		}
	}

	c.JSON(http.StatusNotFound, model.APIResponse{
		Success: false,
		Message: "Fault rule not found",
	})
}

func DeleteFaultRule(c *gin.Context) {
	id := c.Param("id")

	for i := range mockFaultRules {
		if mockFaultRules[i].ID == id {
			mockFaultRules = append(mockFaultRules[:i], mockFaultRules[i+1:]...)
			c.JSON(http.StatusOK, model.APIResponse{
				Success: true,
				Message: "Fault rule deleted successfully",
			})
			return
		}
	}

	c.JSON(http.StatusNotFound, model.APIResponse{
		Success: false,
		Message: "Fault rule not found",
	})
}

func GenerateEnvoyConfig(c *gin.Context) {
	serviceName := c.Param("serviceName")

	var canaryRule *model.CanaryRule
	for i := range mockCanaryRules {
		if mockCanaryRules[i].ServiceName == serviceName && mockCanaryRules[i].Status == "enabled" {
			canaryRule = &mockCanaryRules[i]
			break
		}
	}

	var circuitRule *model.CircuitBreakerRule
	for i := range mockCircuitBreakerRules {
		if mockCircuitBreakerRules[i].ServiceName == serviceName && mockCircuitBreakerRules[i].Status == "enabled" {
			circuitRule = &mockCircuitBreakerRules[i]
			break
		}
	}

	var mirrorRule *model.MirrorRule
	for i := range mockMirrorRules {
		if mockMirrorRules[i].SourceService == serviceName && mockMirrorRules[i].Status == "enabled" {
			mirrorRule = &mockMirrorRules[i]
			break
		}
	}

	var faultRule *model.FaultRule
	for i := range mockFaultRules {
		if mockFaultRules[i].TargetService == serviceName && mockFaultRules[i].Status == "active" {
			faultRule = &mockFaultRules[i]
			break
		}
	}

	envoyConfig := model.EnvoyConfig{
		ServiceName: serviceName,
		Version:     "v1.0.0",
	}

	if canaryRule != nil {
		envoyConfig.TrafficShifting = &model.TrafficShifting{
			Routes: []model.TrafficShiftingRoute{
				{
					Match: model.RouteMatch{
						Prefix: "/api/",
					},
					Route: model.WeightedRouteAction{
						WeightedClusters: []model.WeightedCluster{
							{Name: canaryRule.CanaryVersion, Weight: canaryRule.Weight},
							{Name: canaryRule.StableVersion, Weight: 100 - canaryRule.Weight},
						},
					},
				},
			},
		}
	}

	if circuitRule != nil {
		envoyConfig.CircuitBreakers = &model.CircuitBreakerConfig{
			MaxConnections:     1024,
			MaxPendingRequests: 1024,
			MaxRequests:        1024,
			MaxRetries:         3,
		}
	}

	if mirrorRule != nil {
		envoyConfig.MirrorPolicy = &model.MirrorPolicy{
			Cluster: mirrorRule.TargetService,
			RuntimeFraction: &model.RuntimeFraction{
				DefaultValue: &model.FractionalPercent{
					Numerator:   mirrorRule.MirrorPercent,
					Denominator: "HUNDRED",
				},
			},
		}
	}

	if faultRule != nil {
		envoyConfig.FaultInjection = &model.FaultInjection{}

		if faultRule.FaultType == "delay" {
			envoyConfig.FaultInjection.Delay = &model.DelayFault{
				FixedDelay: strconv.Itoa(faultRule.DelayDuration) + "ms",
				Percentage: &model.Percentage{
					Value: float64(faultRule.InjectionPercent),
				},
			}
		} else if faultRule.FaultType == "abort" {
			envoyConfig.FaultInjection.Abort = &model.AbortFault{
				HttpStatus: faultRule.AbortStatus,
				Percentage: &model.Percentage{
					Value: float64(faultRule.InjectionPercent),
				},
			}
		}
	}

	c.JSON(http.StatusOK, model.APIResponse{
		Success: true,
		Data:    envoyConfig,
	})
}
