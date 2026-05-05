package controller

import (
	"net/http"
	"strconv"

	"chaos-engineering-platform/pkg/model"
	"chaos-engineering-platform/pkg/service"

	"github.com/gin-gonic/gin"
)

type ExperimentController struct {
	experimentService *service.ExperimentService
}

func NewExperimentController(experimentService *service.ExperimentService) *ExperimentController {
	return &ExperimentController{
		experimentService: experimentService,
	}
}

func (c *ExperimentController) List(ctx *gin.Context) {
	status := ctx.Query("status")
	page, _ := strconv.Atoi(ctx.DefaultQuery("page", "1"))
	size, _ := strconv.Atoi(ctx.DefaultQuery("size", "20"))

	experiments := c.experimentService.List(status, page, size)
	ctx.JSON(http.StatusOK, model.NewSuccessResponse(experiments))
}

func (c *ExperimentController) Get(ctx *gin.Context) {
	id := ctx.Param("id")

	experiment, exists := c.experimentService.Get(id)
	if !exists {
		ctx.JSON(http.StatusNotFound, model.NewErrorResponse(http.StatusNotFound, "实验不存在"))
		return
	}

	ctx.JSON(http.StatusOK, model.NewSuccessResponse(experiment))
}

func (c *ExperimentController) Create(ctx *gin.Context) {
	var req model.Experiment
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, model.NewErrorResponse(http.StatusBadRequest, "请求参数错误"))
		return
	}

	experiment := c.experimentService.Create(&req)
	ctx.JSON(http.StatusOK, model.NewSuccessResponse(experiment))
}

func (c *ExperimentController) Update(ctx *gin.Context) {
	id := ctx.Param("id")

	var req model.Experiment
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, model.NewErrorResponse(http.StatusBadRequest, "请求参数错误"))
		return
	}

	experiment, exists := c.experimentService.Update(id, &req)
	if !exists {
		ctx.JSON(http.StatusNotFound, model.NewErrorResponse(http.StatusNotFound, "实验不存在"))
		return
	}

	ctx.JSON(http.StatusOK, model.NewSuccessResponse(experiment))
}

func (c *ExperimentController) Delete(ctx *gin.Context) {
	id := ctx.Param("id")

	exists := c.experimentService.Delete(id)
	if !exists {
		ctx.JSON(http.StatusNotFound, model.NewErrorResponse(http.StatusNotFound, "实验不存在"))
		return
	}

	ctx.JSON(http.StatusOK, model.NewSuccessResponse(nil))
}

func (c *ExperimentController) Start(ctx *gin.Context) {
	id := ctx.Param("id")

	experiment, exists := c.experimentService.Start(id)
	if !exists {
		ctx.JSON(http.StatusNotFound, model.NewErrorResponse(http.StatusNotFound, "实验不存在"))
		return
	}

	ctx.JSON(http.StatusOK, model.NewSuccessResponse(experiment))
}

func (c *ExperimentController) Pause(ctx *gin.Context) {
	id := ctx.Param("id")

	experiment, exists := c.experimentService.Pause(id)
	if !exists {
		ctx.JSON(http.StatusNotFound, model.NewErrorResponse(http.StatusNotFound, "实验不存在"))
		return
	}

	ctx.JSON(http.StatusOK, model.NewSuccessResponse(experiment))
}

func (c *ExperimentController) Resume(ctx *gin.Context) {
	id := ctx.Param("id")

	experiment, exists := c.experimentService.Resume(id)
	if !exists {
		ctx.JSON(http.StatusNotFound, model.NewErrorResponse(http.StatusNotFound, "实验不存在"))
		return
	}

	ctx.JSON(http.StatusOK, model.NewSuccessResponse(experiment))
}

func (c *ExperimentController) Abort(ctx *gin.Context) {
	id := ctx.Param("id")

	experiment, exists := c.experimentService.Abort(id)
	if !exists {
		ctx.JSON(http.StatusNotFound, model.NewErrorResponse(http.StatusNotFound, "实验不存在"))
		return
	}

	ctx.JSON(http.StatusOK, model.NewSuccessResponse(experiment))
}

func (c *ExperimentController) GetLogs(ctx *gin.Context) {
	id := ctx.Param("id")
	level := ctx.Query("level")
	limit, _ := strconv.Atoi(ctx.DefaultQuery("limit", "100"))

	logs := c.experimentService.GetLogs(id, level, limit)
	ctx.JSON(http.StatusOK, model.NewSuccessResponse(logs))
}

func (c *ExperimentController) GetStatus(ctx *gin.Context) {
	id := ctx.Param("id")

	experiment, exists := c.experimentService.Get(id)
	if !exists {
		ctx.JSON(http.StatusNotFound, model.NewErrorResponse(http.StatusNotFound, "实验不存在"))
		return
	}

	ctx.JSON(http.StatusOK, model.NewSuccessResponse(gin.H{
		"status":    experiment.Status,
		"startedAt": experiment.StartedAt,
		"currentStep": func() *model.ExperimentStep {
			for _, step := range experiment.Steps {
				if step.Status == model.StepStatusRunning {
					return &step
				}
			}
			return nil
		}(),
	}))
}

type FaultController struct {
	faultInjectionService *service.FaultInjectionService
}

func NewFaultController(faultInjectionService *service.FaultInjectionService) *FaultController {
	return &FaultController{
		faultInjectionService: faultInjectionService,
	}
}

func (c *FaultController) ListFaultTypes(ctx *gin.Context) {
	faultTypes := c.faultInjectionService.ListFaultTypes()
	ctx.JSON(http.StatusOK, model.NewSuccessResponse(faultTypes))
}

func (c *FaultController) GetFaultType(ctx *gin.Context) {
	id := ctx.Param("id")

	faultType, exists := c.faultInjectionService.GetFaultType(id)
	if !exists {
		ctx.JSON(http.StatusNotFound, model.NewErrorResponse(http.StatusNotFound, "故障类型不存在"))
		return
	}

	ctx.JSON(http.StatusOK, model.NewSuccessResponse(faultType))
}

func (c *FaultController) ListNamespaces(ctx *gin.Context) {
	namespaces := c.faultInjectionService.ListNamespaces()
	ctx.JSON(http.StatusOK, model.NewSuccessResponse(namespaces))
}

func (c *FaultController) ListPods(ctx *gin.Context) {
	namespace := ctx.DefaultQuery("namespace", "default")
	labelSelector := ctx.Query("labelSelector")

	pods := c.faultInjectionService.ListPods(namespace, labelSelector)
	ctx.JSON(http.StatusOK, model.NewSuccessResponse(pods))
}

func (c *FaultController) ListServices(ctx *gin.Context) {
	namespace := ctx.DefaultQuery("namespace", "default")

	services := c.faultInjectionService.ListServices(namespace)
	ctx.JSON(http.StatusOK, model.NewSuccessResponse(services))
}
