package api

import (
	"net/http"
	"strings"

	"cloud-native-console/pkg/k8s"
	"cloud-native-console/pkg/types"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

type API struct {
	manager        *k8s.ClusterManager
	deployService  *k8s.DeployService
	alertRules     map[string][]*types.AlertRule
}

func NewAPI(manager *k8s.ClusterManager) *API {
	return &API{
		manager:       manager,
		deployService: k8s.NewDeployService(manager),
		alertRules:    make(map[string][]*types.AlertRule),
	}
}

func (a *API) SetupRouter() *gin.Engine {
	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	api := r.Group("/api/v1")
	{
		api.GET("/health", a.healthCheck)

		clusters := api.Group("/clusters")
		{
			clusters.GET("", a.listClusters)
			clusters.POST("", a.addCluster)
			clusters.GET("/:clusterId", a.getCluster)
			clusters.PUT("/:clusterId", a.updateCluster)
			clusters.DELETE("/:clusterId", a.deleteCluster)
			clusters.POST("/:clusterId/refresh", a.refreshCluster)

			clusters.GET("/:clusterId/nodes", a.getNodes)
			clusters.GET("/:clusterId/pods", a.getPods)
			clusters.GET("/:clusterId/deployments", a.getDeployments)
			clusters.GET("/:clusterId/services", a.getServices)
			clusters.GET("/:clusterId/ingresses", a.getIngresses)
			clusters.GET("/:clusterId/namespaces/:namespace/pods/:podName/logs", a.getPodLogs)

			clusters.GET("/:clusterId/alerts", a.listAlertRules)
			clusters.POST("/:clusterId/alerts", a.createAlertRule)
			clusters.PUT("/:clusterId/alerts/:alertId", a.updateAlertRule)
			clusters.DELETE("/:clusterId/alerts/:alertId", a.deleteAlertRule)
		}

		deploy := api.Group("/deploy")
		{
			deploy.POST("", a.deploy)
			deploy.POST("/preview", a.previewDeploy)
		}
	}

	return r
}

func (a *API) healthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, types.APIResponse{
		Success: true,
		Data:    gin.H{"status": "ok"},
	})
}

func (a *API) listClusters(c *gin.Context) {
	clusters := a.manager.GetClusters()
	c.JSON(http.StatusOK, types.APIResponse{
		Success: true,
		Data:    clusters,
	})
}

func (a *API) getCluster(c *gin.Context) {
	clusterID := c.Param("clusterId")
	cluster, exists := a.manager.GetCluster(clusterID)
	if !exists {
		c.JSON(http.StatusNotFound, types.APIResponse{
			Success: false,
			Error:   "Cluster not found",
		})
		return
	}
	c.JSON(http.StatusOK, types.APIResponse{
		Success: true,
		Data:    cluster,
	})
}

type AddClusterRequest struct {
	Name       string `json:"name" binding:"required"`
	KubeConfig string `json:"kubeconfig" binding:"required"`
}

func (a *API) addCluster(c *gin.Context) {
	var req AddClusterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, types.APIResponse{
			Success: false,
			Error:   "Invalid request: " + err.Error(),
		})
		return
	}

	cluster, err := a.manager.AddCluster(req.Name, req.KubeConfig)
	if err != nil {
		c.JSON(http.StatusInternalServerError, types.APIResponse{
			Success: false,
			Error:   "Failed to add cluster: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, types.APIResponse{
		Success: true,
		Data:    cluster,
	})
}

type UpdateClusterRequest struct {
	Name       string  `json:"name" binding:"required"`
	KubeConfig *string `json:"kubeconfig,omitempty"`
}

func (a *API) updateCluster(c *gin.Context) {
	clusterID := c.Param("clusterId")

	var req UpdateClusterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, types.APIResponse{
			Success: false,
			Error:   "Invalid request: " + err.Error(),
		})
		return
	}

	cluster, err := a.manager.UpdateCluster(clusterID, req.Name, req.KubeConfig)
	if err != nil {
		c.JSON(http.StatusInternalServerError, types.APIResponse{
			Success: false,
			Error:   "Failed to update cluster: " + err.Error(),
		})
		return
	}

	if cluster == nil {
		c.JSON(http.StatusNotFound, types.APIResponse{
			Success: false,
			Error:   "Cluster not found",
		})
		return
	}

	c.JSON(http.StatusOK, types.APIResponse{
		Success: true,
		Data:    cluster,
	})
}

func (a *API) deleteCluster(c *gin.Context) {
	clusterID := c.Param("clusterId")

	if !a.manager.DeleteCluster(clusterID) {
		c.JSON(http.StatusNotFound, types.APIResponse{
			Success: false,
			Error:   "Cluster not found",
		})
		return
	}

	c.JSON(http.StatusOK, types.APIResponse{
		Success: true,
	})
}

func (a *API) refreshCluster(c *gin.Context) {
	clusterID := c.Param("clusterId")

	if err := a.manager.RefreshCluster(clusterID); err != nil {
		c.JSON(http.StatusInternalServerError, types.APIResponse{
			Success: false,
			Error:   "Failed to refresh cluster: " + err.Error(),
		})
		return
	}

	cluster, _ := a.manager.GetCluster(clusterID)
	c.JSON(http.StatusOK, types.APIResponse{
		Success: true,
		Data:    cluster,
	})
}

func (a *API) getNodes(c *gin.Context) {
	clusterID := c.Param("clusterId")

	client, exists := a.manager.GetClient(clusterID)
	if !exists {
		c.JSON(http.StatusNotFound, types.APIResponse{
			Success: false,
			Error:   "Cluster not found",
		})
		return
	}

	nodes, err := client.GetNodes()
	if err != nil {
		c.JSON(http.StatusInternalServerError, types.APIResponse{
			Success: false,
			Error:   "Failed to get nodes: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, types.APIResponse{
		Success: true,
		Data:    nodes,
	})
}

func (a *API) getPods(c *gin.Context) {
	clusterID := c.Param("clusterId")
	namespace := c.Query("namespace")

	client, exists := a.manager.GetClient(clusterID)
	if !exists {
		c.JSON(http.StatusNotFound, types.APIResponse{
			Success: false,
			Error:   "Cluster not found",
		})
		return
	}

	pods, err := client.GetPods(namespace)
	if err != nil {
		c.JSON(http.StatusInternalServerError, types.APIResponse{
			Success: false,
			Error:   "Failed to get pods: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, types.APIResponse{
		Success: true,
		Data:    pods,
	})
}

func (a *API) getDeployments(c *gin.Context) {
	clusterID := c.Param("clusterId")
	namespace := c.Query("namespace")

	client, exists := a.manager.GetClient(clusterID)
	if !exists {
		c.JSON(http.StatusNotFound, types.APIResponse{
			Success: false,
			Error:   "Cluster not found",
		})
		return
	}

	deployments, err := client.GetDeployments(namespace)
	if err != nil {
		c.JSON(http.StatusInternalServerError, types.APIResponse{
			Success: false,
			Error:   "Failed to get deployments: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, types.APIResponse{
		Success: true,
		Data:    deployments,
	})
}

func (a *API) getServices(c *gin.Context) {
	clusterID := c.Param("clusterId")
	namespace := c.Query("namespace")

	client, exists := a.manager.GetClient(clusterID)
	if !exists {
		c.JSON(http.StatusNotFound, types.APIResponse{
			Success: false,
			Error:   "Cluster not found",
		})
		return
	}

	services, err := client.GetServices(namespace)
	if err != nil {
		c.JSON(http.StatusInternalServerError, types.APIResponse{
			Success: false,
			Error:   "Failed to get services: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, types.APIResponse{
		Success: true,
		Data:    services,
	})
}

func (a *API) getIngresses(c *gin.Context) {
	clusterID := c.Param("clusterId")
	namespace := c.Query("namespace")

	client, exists := a.manager.GetClient(clusterID)
	if !exists {
		c.JSON(http.StatusNotFound, types.APIResponse{
			Success: false,
			Error:   "Cluster not found",
		})
		return
	}

	ingresses, err := client.GetIngresses(namespace)
	if err != nil {
		c.JSON(http.StatusInternalServerError, types.APIResponse{
			Success: false,
			Error:   "Failed to get ingresses: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, types.APIResponse{
		Success: true,
		Data:    ingresses,
	})
}

func (a *API) getPodLogs(c *gin.Context) {
	clusterID := c.Param("clusterId")
	namespace := c.Param("namespace")
	podName := c.Param("podName")
	container := c.Query("container")

	client, exists := a.manager.GetClient(clusterID)
	if !exists {
		c.JSON(http.StatusNotFound, types.APIResponse{
			Success: false,
			Error:   "Cluster not found",
		})
		return
	}

	logs, err := client.GetPodLogs(namespace, podName, container)
	if err != nil {
		c.JSON(http.StatusInternalServerError, types.APIResponse{
			Success: false,
			Error:   "Failed to get pod logs: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, types.APIResponse{
		Success: true,
		Data:    logs,
	})
}

func (a *API) listAlertRules(c *gin.Context) {
	clusterID := c.Param("clusterId")

	rules, exists := a.alertRules[clusterID]
	if !exists {
		rules = []*types.AlertRule{}
	}

	c.JSON(http.StatusOK, types.APIResponse{
		Success: true,
		Data:    rules,
	})
}

type CreateAlertRuleRequest struct {
	Name      string  `json:"name" binding:"required"`
	Metric    string  `json:"metric" binding:"required"`
	Condition string  `json:"condition" binding:"required"`
	Threshold float64 `json:"threshold" binding:"required"`
	Duration  string  `json:"duration" binding:"required"`
	Enabled   bool    `json:"enabled"`
}

func (a *API) createAlertRule(c *gin.Context) {
	clusterID := c.Param("clusterId")

	var req CreateAlertRuleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, types.APIResponse{
			Success: false,
			Error:   "Invalid request: " + err.Error(),
		})
		return
	}

	rule := &types.AlertRule{
		ID:        generateID("alert"),
		ClusterID: clusterID,
		Name:      req.Name,
		Metric:    req.Metric,
		Condition: req.Condition,
		Threshold: req.Threshold,
		Duration:  req.Duration,
		Enabled:   req.Enabled,
	}

	if a.alertRules[clusterID] == nil {
		a.alertRules[clusterID] = []*types.AlertRule{}
	}
	a.alertRules[clusterID] = append(a.alertRules[clusterID], rule)

	c.JSON(http.StatusOK, types.APIResponse{
		Success: true,
		Data:    rule,
	})
}

type UpdateAlertRuleRequest struct {
	Name      *string  `json:"name"`
	Metric    *string  `json:"metric"`
	Condition *string  `json:"condition"`
	Threshold *float64 `json:"threshold"`
	Duration  *string  `json:"duration"`
	Enabled   *bool    `json:"enabled"`
}

func (a *API) updateAlertRule(c *gin.Context) {
	clusterID := c.Param("clusterId")
	alertID := c.Param("alertId")

	var req UpdateAlertRuleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, types.APIResponse{
			Success: false,
			Error:   "Invalid request: " + err.Error(),
		})
		return
	}

	rules, exists := a.alertRules[clusterID]
	if !exists {
		c.JSON(http.StatusNotFound, types.APIResponse{
			Success: false,
			Error:   "Alert rule not found",
		})
		return
	}

	var rule *types.AlertRule
	for _, r := range rules {
		if r.ID == alertID {
			rule = r
			break
		}
	}

	if rule == nil {
		c.JSON(http.StatusNotFound, types.APIResponse{
			Success: false,
			Error:   "Alert rule not found",
		})
		return
	}

	if req.Name != nil {
		rule.Name = *req.Name
	}
	if req.Metric != nil {
		rule.Metric = *req.Metric
	}
	if req.Condition != nil {
		rule.Condition = *req.Condition
	}
	if req.Threshold != nil {
		rule.Threshold = *req.Threshold
	}
	if req.Duration != nil {
		rule.Duration = *req.Duration
	}
	if req.Enabled != nil {
		rule.Enabled = *req.Enabled
	}

	c.JSON(http.StatusOK, types.APIResponse{
		Success: true,
		Data:    rule,
	})
}

func (a *API) deleteAlertRule(c *gin.Context) {
	clusterID := c.Param("clusterId")
	alertID := c.Param("alertId")

	rules, exists := a.alertRules[clusterID]
	if !exists {
		c.JSON(http.StatusOK, types.APIResponse{
			Success: true,
		})
		return
	}

	newRules := []*types.AlertRule{}
	for _, r := range rules {
		if r.ID != alertID {
			newRules = append(newRules, r)
		}
	}
	a.alertRules[clusterID] = newRules

	c.JSON(http.StatusOK, types.APIResponse{
		Success: true,
	})
}

func (a *API) deploy(c *gin.Context) {
	var config types.DeployConfig
	if err := c.ShouldBindJSON(&config); err != nil {
		c.JSON(http.StatusBadRequest, types.APIResponse{
			Success: false,
			Error:   "Invalid request: " + err.Error(),
		})
		return
	}

	if config.ClusterID == "" {
		c.JSON(http.StatusBadRequest, types.APIResponse{
			Success: false,
			Error:   "Cluster ID is required",
		})
		return
	}

	result, err := a.deployService.Deploy(&config)
	if err != nil {
		c.JSON(http.StatusInternalServerError, types.APIResponse{
			Success: false,
			Error:   err.Error(),
			Data:    result,
		})
		return
	}

	c.JSON(http.StatusOK, types.APIResponse{
		Success: true,
		Data:    result,
	})
}

func (a *API) previewDeploy(c *gin.Context) {
	var config types.DeployConfig
	if err := c.ShouldBindJSON(&config); err != nil {
		c.JSON(http.StatusBadRequest, types.APIResponse{
			Success: false,
			Error:   "Invalid request: " + err.Error(),
		})
		return
	}

	yaml, err := a.deployService.GenerateYAML(&config)
	if err != nil {
		c.JSON(http.StatusInternalServerError, types.APIResponse{
			Success: false,
			Error:   "Failed to generate YAML: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, types.APIResponse{
		Success: true,
		Data:    gin.H{"yaml": yaml},
	})
}

func generateID(prefix string) string {
	return prefix + "-" + strings.SplitN(uuid.New().String(), "-", 2)[0]
}
