package controller

import (
	"net/http"
	"strconv"

	"chaos-engineering-platform/pkg/model"
	"chaos-engineering-platform/pkg/service"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type MetricController struct {
	metricService *service.MetricService
}

func NewMetricController(metricService *service.MetricService) *MetricController {
	return &MetricController{
		metricService: metricService,
	}
}

func (c *MetricController) ListMetrics(ctx *gin.Context) {
	metrics := c.metricService.ListMetrics()
	ctx.JSON(http.StatusOK, model.NewSuccessResponse(metrics))
}

func (c *MetricController) GetCurrent(ctx *gin.Context) {
	values := c.metricService.GetCurrentValues()
	ctx.JSON(http.StatusOK, model.NewSuccessResponse(values))
}

func (c *MetricController) GetHistory(ctx *gin.Context) {
	metricID := ctx.Param("id")
	startTime := ctx.Query("startTime")
	endTime := ctx.Query("endTime")
	step, _ := strconv.Atoi(ctx.DefaultQuery("step", "60"))

	history := c.metricService.GetMetricHistory(metricID, startTime, endTime, step)
	ctx.JSON(http.StatusOK, model.NewSuccessResponse(history))
}

func (c *MetricController) ListThresholds(ctx *gin.Context) {
	experimentID := ctx.Query("experimentId")
	thresholds := c.metricService.ListThresholds(experimentID)
	ctx.JSON(http.StatusOK, model.NewSuccessResponse(thresholds))
}

func (c *MetricController) CreateThreshold(ctx *gin.Context) {
	var req model.MetricThreshold
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, model.NewErrorResponse(http.StatusBadRequest, "请求参数错误"))
		return
	}

	req.ID = uuid.New().String()
	threshold := c.metricService.CreateThreshold(&req)
	ctx.JSON(http.StatusOK, model.NewSuccessResponse(threshold))
}

func (c *MetricController) UpdateThreshold(ctx *gin.Context) {
	id := ctx.Param("id")

	var req model.MetricThreshold
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, model.NewErrorResponse(http.StatusBadRequest, "请求参数错误"))
		return
	}

	threshold, exists := c.metricService.UpdateThreshold(id, &req)
	if !exists {
		ctx.JSON(http.StatusNotFound, model.NewErrorResponse(http.StatusNotFound, "阈值不存在"))
		return
	}

	ctx.JSON(http.StatusOK, model.NewSuccessResponse(threshold))
}

func (c *MetricController) DeleteThreshold(ctx *gin.Context) {
	id := ctx.Param("id")

	exists := c.metricService.DeleteThreshold(id)
	if !exists {
		ctx.JSON(http.StatusNotFound, model.NewErrorResponse(http.StatusNotFound, "阈值不存在"))
		return
	}

	ctx.JSON(http.StatusOK, model.NewSuccessResponse(nil))
}

func (c *MetricController) ListChecks(ctx *gin.Context) {
	status := ctx.Query("status")
	checks := c.metricService.ListChecks(status)
	ctx.JSON(http.StatusOK, model.NewSuccessResponse(checks))
}

func (c *MetricController) GetCheck(ctx *gin.Context) {
	id := ctx.Param("id")

	check, exists := c.metricService.GetCheck(id)
	if !exists {
		ctx.JSON(http.StatusNotFound, model.NewErrorResponse(http.StatusNotFound, "检查不存在"))
		return
	}

	ctx.JSON(http.StatusOK, model.NewSuccessResponse(check))
}

func (c *MetricController) CreateCheck(ctx *gin.Context) {
	var req model.SteadyStateCheck
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, model.NewErrorResponse(http.StatusBadRequest, "请求参数错误"))
		return
	}

	req.ID = uuid.New().String()
	check := c.metricService.CreateCheck(&req)
	ctx.JSON(http.StatusOK, model.NewSuccessResponse(check))
}

func (c *MetricController) UpdateCheck(ctx *gin.Context) {
	id := ctx.Param("id")

	var req model.SteadyStateCheck
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, model.NewErrorResponse(http.StatusBadRequest, "请求参数错误"))
		return
	}

	check, exists := c.metricService.UpdateCheck(id, &req)
	if !exists {
		ctx.JSON(http.StatusNotFound, model.NewErrorResponse(http.StatusNotFound, "检查不存在"))
		return
	}

	ctx.JSON(http.StatusOK, model.NewSuccessResponse(check))
}

func (c *MetricController) StartCheck(ctx *gin.Context) {
	id := ctx.Param("id")

	check, exists := c.metricService.StartCheck(id)
	if !exists {
		ctx.JSON(http.StatusNotFound, model.NewErrorResponse(http.StatusNotFound, "检查不存在"))
		return
	}

	ctx.JSON(http.StatusOK, model.NewSuccessResponse(check))
}

func (c *MetricController) StopCheck(ctx *gin.Context) {
	id := ctx.Param("id")

	check, exists := c.metricService.StopCheck(id)
	if !exists {
		ctx.JSON(http.StatusNotFound, model.NewErrorResponse(http.StatusNotFound, "检查不存在"))
		return
	}

	ctx.JSON(http.StatusOK, model.NewSuccessResponse(check))
}

func (c *MetricController) ListViolations(ctx *gin.Context) {
	checkID := ctx.Query("checkId")
	acknowledged := ctx.Query("acknowledged")
	level := ctx.Query("level")

	var acknowledgedBool *bool
	if acknowledged != "" {
		b, _ := strconv.ParseBool(acknowledged)
		acknowledgedBool = &b
	}

	violations := c.metricService.ListViolations(checkID, acknowledgedBool, level)
	ctx.JSON(http.StatusOK, model.NewSuccessResponse(violations))
}

func (c *MetricController) AcknowledgeViolation(ctx *gin.Context) {
	id := ctx.Param("id")

	exists := c.metricService.AcknowledgeViolation(id)
	if !exists {
		ctx.JSON(http.StatusNotFound, model.NewErrorResponse(http.StatusNotFound, "违规记录不存在"))
		return
	}

	ctx.JSON(http.StatusOK, model.NewSuccessResponse(nil))
}

type CircuitBreakerController struct {
	circuitBreakerService *service.CircuitBreakerService
}

func NewCircuitBreakerController(circuitBreakerService *service.CircuitBreakerService) *CircuitBreakerController {
	return &CircuitBreakerController{
		circuitBreakerService: circuitBreakerService,
	}
}

func (c *CircuitBreakerController) GetStatus(ctx *gin.Context) {
	experimentID := ctx.Query("experimentId")
	status := c.circuitBreakerService.GetStatus(experimentID)
	ctx.JSON(http.StatusOK, model.NewSuccessResponse(status))
}

func (c *CircuitBreakerController) ListEvents(ctx *gin.Context) {
	experimentID := ctx.Query("experimentId")
	limit, _ := strconv.Atoi(ctx.DefaultQuery("limit", "50"))

	events := c.circuitBreakerService.ListEvents(experimentID, limit)
	ctx.JSON(http.StatusOK, model.NewSuccessResponse(events))
}

func (c *CircuitBreakerController) TriggerRollback(ctx *gin.Context) {
	var req struct {
		ExperimentID string `json:"experimentId"`
		Reason       string `json:"reason"`
	}

	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, model.NewErrorResponse(http.StatusBadRequest, "请求参数错误"))
		return
	}

	event := c.circuitBreakerService.TriggerRollback(req.ExperimentID, req.Reason)
	ctx.JSON(http.StatusOK, model.NewSuccessResponse(event))
}
