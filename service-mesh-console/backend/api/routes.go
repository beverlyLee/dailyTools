package api

import (
	"service-mesh-console/pkg/governance"
	"service-mesh-console/pkg/topology"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(r *gin.Engine) {
	// 服务拓扑相关路由
	topologyGroup := r.Group("/api/topology")
	{
		topologyGroup.GET("/", topology.GetTopology)
		topologyGroup.GET("/services", topology.GetServices)
		topologyGroup.GET("/services/:name", topology.GetServiceDetails)
		topologyGroup.GET("/services/:name/instances", topology.GetServiceInstances)
		topologyGroup.GET("/metrics", topology.GetMetrics)
	}

	// 流量治理相关路由
	governanceGroup := r.Group("/api/governance")
	{
		// 金丝雀发布
		governanceGroup.GET("/canary", governance.GetCanaryRules)
		governanceGroup.POST("/canary", governance.CreateCanaryRule)
		governanceGroup.PUT("/canary/:name", governance.UpdateCanaryRule)
		governanceGroup.DELETE("/canary/:name", governance.DeleteCanaryRule)

		// 蓝绿部署
		governanceGroup.GET("/blue-green", governance.GetBlueGreenRules)
		governanceGroup.POST("/blue-green", governance.CreateBlueGreenRule)
		governanceGroup.PUT("/blue-green/:name", governance.UpdateBlueGreenRule)
		governanceGroup.DELETE("/blue-green/:name", governance.DeleteBlueGreenRule)

		// 熔断降级
		governanceGroup.GET("/circuit-breaker", governance.GetCircuitBreakerRules)
		governanceGroup.POST("/circuit-breaker", governance.CreateCircuitBreakerRule)
		governanceGroup.PUT("/circuit-breaker/:name", governance.UpdateCircuitBreakerRule)
		governanceGroup.DELETE("/circuit-breaker/:name", governance.DeleteCircuitBreakerRule)

		// 黑白名单
		governanceGroup.GET("/access-control", governance.GetAccessControlRules)
		governanceGroup.POST("/access-control", governance.CreateAccessControlRule)
		governanceGroup.PUT("/access-control/:name", governance.UpdateAccessControlRule)
		governanceGroup.DELETE("/access-control/:name", governance.DeleteAccessControlRule)

		// YAML 同步
		governanceGroup.GET("/yaml/:ruleType/:name", governance.GetRuleYAML)
		governanceGroup.POST("/yaml/:ruleType", governance.ApplyRuleYAML)
	}
}
