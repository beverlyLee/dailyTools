package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"

	"self-healing-orchestrator/config"
	"self-healing-orchestrator/pkg/approval"
	"self-healing-orchestrator/pkg/grayscale"
	"self-healing-orchestrator/pkg/records"
	"self-healing-orchestrator/pkg/scenarios"
	"self-healing-orchestrator/pkg/scripts"
)

type Orchestrator struct {
	config         *config.Config
	scenarioMgr    *scenarios.Manager
	scriptExecutor *scripts.Executor
	approvalMgr    *approval.Manager
	grayscaleMgr   *grayscale.Manager
	recordMgr      *records.Manager
	router         *gin.Engine
}

type HealthResponse struct {
	Status    string `json:"status"`
	Timestamp string `json:"timestamp"`
	Version   string `json:"version"`
}

type FaultDetectionRequest struct {
	Metrics     map[string]float64 `json:"metrics"`
	ProbeStatus map[string]int     `json:"probe_status"`
}

type FaultResponse struct {
	RecordID   string `json:"record_id"`
	ScenarioID string `json:"scenario_id"`
	Status     string `json:"status"`
	Message    string `json:"message"`
}

func main() {
	fmt.Println("========================================")
	fmt.Println("  故障自愈编排器 (Self-Healing Orchestrator)")
	fmt.Println("========================================")
	fmt.Printf("启动时间: %s\n", time.Now().Format("2006-01-02 15:04:05"))
	fmt.Println()

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("加载配置失败: %v", err)
	}
	fmt.Printf("[配置] 配置加载完成\n")
	fmt.Printf("[配置] 服务端口: %s\n", cfg.Server.Port)
	fmt.Printf("[配置] 审批流程: %v\n", cfg.Approval.Enabled)
	fmt.Printf("[配置] 灰度发布: %v\n", cfg.GrayScale.Enabled)
	fmt.Println()

	orchestrator, err := NewOrchestrator(cfg)
	if err != nil {
		log.Fatalf("初始化编排器失败: %v", err)
	}
	fmt.Println("[初始化] 所有管理器初始化完成")
	fmt.Println()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		addr := fmt.Sprintf(":%s", cfg.Server.Port)
		fmt.Printf("[服务] 启动 HTTP 服务: http://localhost%s\n", addr)
		fmt.Printf("[服务] API 端点:\n")
		fmt.Printf("  - GET  /health          健康检查\n")
		fmt.Printf("  - POST /api/v1/detect   故障检测\n")
		fmt.Printf("  - GET  /api/v1/scenarios 获取所有场景\n")
		fmt.Printf("  - GET  /api/v1/scripts   获取所有脚本\n")
		fmt.Printf("  - GET  /api/v1/approvals/pending 获取待审批请求\n")
		fmt.Printf("  - POST /api/v1/approvals/:id/approve 批准\n")
		fmt.Printf("  - POST /api/v1/approvals/:id/reject 拒绝\n")
		fmt.Printf("  - GET  /api/v1/records   获取故障记录\n")
		fmt.Printf("  - GET  /api/v1/stats     获取统计信息\n")
		fmt.Println()

		if err := orchestrator.router.Run(addr); err != nil && err != http.ErrServerClosed {
			log.Fatalf("服务启动失败: %v", err)
		}
	}()

	<-stop
	fmt.Println("\n[停止] 收到停止信号，正在关闭服务...")
	fmt.Println("[停止] 服务已停止")
}

func NewOrchestrator(cfg *config.Config) (*Orchestrator, error) {
	scenarioMgr := scenarios.NewManager(&cfg.Scenarios)
	fmt.Printf("[初始化] 故障场景管理器: %d 个场景已加载\n", len(scenarioMgr.GetAll()))

	scriptExecutor := scripts.NewExecutor(&cfg.Scripts)
	fmt.Printf("[初始化] 脚本执行器: %d 个脚本已加载\n", len(scriptExecutor.GetAllScripts()))

	approvalMgr := approval.NewManager(&cfg.Approval)
	fmt.Printf("[初始化] 审批管理器: 已启用=%v, 超时=%d分钟\n",
		approvalMgr.IsEnabled(), cfg.Approval.TimeoutMinutes)

	grayscaleMgr := grayscale.NewManager(&cfg.GrayScale)
	fmt.Printf("[初始化] 灰度管理器: 已启用=%v, 比例=%d%%\n",
		grayscaleMgr.IsEnabled(), grayscaleMgr.GetPercentage())

	recordMgr := records.NewManager(&cfg.Records)
	fmt.Printf("[初始化] 记录管理器: 保留=%d天, 最大=%d条\n",
		cfg.Records.RetentionDays, cfg.Records.MaxRecords)

	o := &Orchestrator{
		config:         cfg,
		scenarioMgr:    scenarioMgr,
		scriptExecutor: scriptExecutor,
		approvalMgr:    approvalMgr,
		grayscaleMgr:   grayscaleMgr,
		recordMgr:      recordMgr,
	}

	o.setupRoutes()

	return o, nil
}

func (o *Orchestrator) setupRoutes() {
	r := gin.Default()

	r.Use(gin.Logger())
	r.Use(gin.Recovery())

	r.GET("/health", o.healthCheck)

	api := r.Group("/api/v1")
	{
		api.POST("/detect", o.detectFault)
		api.POST("/execute/:script_id", o.executeScript)

		api.GET("/scenarios", o.getScenarios)
		api.GET("/scenarios/:id", o.getScenarioByID)
		api.POST("/scenarios", o.createScenario)
		api.PUT("/scenarios/:id", o.updateScenario)
		api.DELETE("/scenarios/:id", o.deleteScenario)

		api.GET("/scripts", o.getScripts)
		api.GET("/scripts/:id", o.getScriptByID)
		api.POST("/scripts/validate/:id", o.validateScript)

		api.GET("/approvals/pending", o.getPendingApprovals)
		api.GET("/approvals/approved", o.getApprovedApprovals)
		api.GET("/approvals/rejected", o.getRejectedApprovals)
		api.POST("/approvals/:id/approve", o.approveRequest)
		api.POST("/approvals/:id/reject", o.rejectRequest)

		api.GET("/grayscale/rollouts", o.getGrayscaleRollouts)
		api.POST("/grayscale/rollouts/:id/pause", o.pauseRollout)
		api.POST("/grayscale/rollouts/:id/resume", o.resumeRollout)
		api.POST("/grayscale/rollouts/:id/cancel", o.cancelRollout)

		api.GET("/records", o.getRecords)
		api.GET("/records/:id", o.getRecordByID)
		api.GET("/records/status/:status", o.getRecordsByStatus)
		api.GET("/records/scenario/:scenario_id", o.getRecordsByScenario)

		api.GET("/stats", o.getStats)
	}

	o.router = r
}

func (o *Orchestrator) healthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, HealthResponse{
		Status:    "healthy",
		Timestamp: time.Now().Format(time.RFC3339),
		Version:   "1.0.0",
	})
}

func (o *Orchestrator) detectFault(c *gin.Context) {
	var req FaultDetectionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "无效的请求格式",
			"details": err.Error(),
		})
		return
	}

	metrics := make(map[string]float64)
	for k, v := range req.Metrics {
		metrics[k] = v
	}
	for k, v := range req.ProbeStatus {
		metrics[k] = float64(v)
	}

	triggered := o.scenarioMgr.EvaluateConditions(metrics)

	if len(triggered) == 0 {
		c.JSON(http.StatusOK, gin.H{
			"status":       "no_fault",
			"message":      "未检测到故障",
			"checked_at":   time.Now().Format(time.RFC3339),
		})
		return
	}

	var responses []FaultResponse
	for _, scenario := range triggered {
		triggerMetric := ""
		triggerValue := 0.0
		for _, cond := range scenario.Conditions {
			if val, ok := metrics[cond.Metric]; ok {
				triggerMetric = cond.Metric
				triggerValue = val
				break
			}
		}

		record, err := o.recordMgr.CreateRecord(
			scenario.ID,
			scenario.ScriptID,
			scenario.Severity,
			triggerMetric,
			triggerValue,
			scenario.Threshold,
		)

		if err != nil {
			log.Printf("创建故障记录失败: %v", err)
			continue
		}

		fmt.Printf("[检测] 检测到故障: %s (场景: %s, 严重级别: %s)\n",
			record.ID, scenario.Name, scenario.Severity)

		if scenario.AutoRecover {
			go o.handleAutoRecovery(record, scenario)
			responses = append(responses, FaultResponse{
				RecordID:   record.ID,
				ScenarioID: scenario.ID,
				Status:     "auto_recovering",
				Message:    fmt.Sprintf("开始自动恢复: %s", scenario.Name),
			})
		} else {
			if o.approvalMgr.IsEnabled() {
				approvalReq, err := o.approvalMgr.CreateRequest(
					record.ID,
					scenario.ID,
					scenario.ScriptID,
					"system",
				)
				if err == nil {
					o.recordMgr.SetApprovalInfo(record.ID, &records.ApprovalRecord{
						Required:    true,
						Approved:    false,
						Requester:   "system",
						RequestTime: approvalReq.RequestTime,
					})
					fmt.Printf("[审批] 已创建审批请求: %s (故障: %s)\n", approvalReq.ID, record.ID)
				}
			}

			responses = append(responses, FaultResponse{
				RecordID:   record.ID,
				ScenarioID: scenario.ID,
				Status:     "pending_approval",
				Message:    fmt.Sprintf("需要人工审批: %s", scenario.Name),
			})
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"status":        "fault_detected",
		"count":         len(triggered),
		"faults":        responses,
		"detected_at":   time.Now().Format(time.RFC3339),
	})
}

func (o *Orchestrator) handleAutoRecovery(record *records.FaultRecord, scenario *config.ScenarioDefinition) {
	o.recordMgr.UpdateStatus(record.ID, "recovering")

	if o.approvalMgr.IsEnabled() && scenario.Severity == "critical" {
		approvalReq, err := o.approvalMgr.CreateRequest(
			record.ID,
			scenario.ID,
			scenario.ScriptID,
			"system",
		)
		if err == nil {
			fmt.Printf("[审批] 严重故障需要审批: %s\n", approvalReq.ID)

			o.recordMgr.SetApprovalInfo(record.ID, &records.ApprovalRecord{
				Required:    true,
				Approved:    false,
				Requester:   "system",
				RequestTime: approvalReq.RequestTime,
			})
			o.recordMgr.UpdateStatus(record.ID, "pending_approval")
			return
		}
	}

	if o.grayscaleMgr.IsEnabled() {
		o.handleGrayscaleRecovery(record, scenario)
		return
	}

	o.executeRecoveryScript(record, scenario)
}

func (o *Orchestrator) handleGrayscaleRecovery(record *records.FaultRecord, scenario *config.ScenarioDefinition) {
	if !o.grayscaleMgr.ShouldExecuteInGrayscale() {
		fmt.Printf("[灰度] 跳过灰度执行: %s\n", record.ID)
		o.recordMgr.UpdateStatus(record.ID, "skipped_grayscale")
		return
	}

	rollout, err := o.grayscaleMgr.StartRollout(scenario.ID, scenario.ScriptID, 1)
	if err != nil {
		log.Printf("[灰度] 启动灰度发布失败: %v", err)
		o.executeRecoveryScript(record, scenario)
		return
	}

	fmt.Printf("[灰度] 开始灰度发布: %s (场景: %s)\n", rollout.ID, scenario.ID)

	o.recordMgr.SetGrayScaleInfo(record.ID, &records.GrayScaleRecord{
		Enabled:       true,
		Percentage:    o.grayscaleMgr.GetPercentage(),
		TotalInstances: rollout.TotalInstances,
		RolloutGroups: rollout.InstanceGroups,
	})

	o.executeRecoveryScript(record, scenario)
}

func (o *Orchestrator) executeRecoveryScript(record *records.FaultRecord, scenario *config.ScenarioDefinition) {
	fmt.Printf("[执行] 执行恢复脚本: %s (场景: %s)\n", scenario.ScriptID, scenario.ID)

	result := o.scriptExecutor.ExecuteSync(scenario.ScriptID, nil, nil, 0)

	execRecord := &records.ExecutionRecord{
		Success:   result.Success,
		ExitCode:  result.ExitCode,
		Output:    result.Output,
		Error:     result.Error,
		Duration:  result.Duration,
		StartTime: result.StartTime,
		EndTime:   result.EndTime,
	}

	o.recordMgr.SetExecutionResult(record.ID, execRecord)

	if result.Success {
		fmt.Printf("[执行] 脚本执行成功: %s (耗时: %v)\n", record.ID, result.Duration)
		o.recordMgr.UpdateStatus(record.ID, "completed")
	} else {
		fmt.Printf("[执行] 脚本执行失败: %s (错误: %s)\n", record.ID, result.Error)
		o.recordMgr.UpdateStatus(record.ID, "failed")
	}
}

func (o *Orchestrator) executeScript(c *gin.Context) {
	scriptID := c.Param("script_id")

	var req struct {
		Args []string          `json:"args"`
		Env  map[string]string `json:"env"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		req.Args = []string{}
		req.Env = map[string]string{}
	}

	result := o.scriptExecutor.ExecuteSync(scriptID, req.Args, req.Env, 0)

	c.JSON(http.StatusOK, result)
}

func (o *Orchestrator) getScenarios(c *gin.Context) {
	scenarios := o.scenarioMgr.GetAll()
	c.JSON(http.StatusOK, gin.H{
		"total": len(scenarios),
		"data":  scenarios,
	})
}

func (o *Orchestrator) getScenarioByID(c *gin.Context) {
	id := c.Param("id")
	scenario, exists := o.scenarioMgr.GetByID(id)
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "场景不存在"})
		return
	}
	c.JSON(http.StatusOK, scenario)
}

func (o *Orchestrator) createScenario(c *gin.Context) {
	var scenario config.ScenarioDefinition
	if err := c.ShouldBindJSON(&scenario); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	o.scenarioMgr.Add(scenario)
	c.JSON(http.StatusCreated, scenario)
}

func (o *Orchestrator) updateScenario(c *gin.Context) {
	id := c.Param("id")
	var scenario config.ScenarioDefinition
	if err := c.ShouldBindJSON(&scenario); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if updated := o.scenarioMgr.Update(id, scenario); !updated {
		c.JSON(http.StatusNotFound, gin.H{"error": "场景不存在"})
		return
	}
	c.JSON(http.StatusOK, scenario)
}

func (o *Orchestrator) deleteScenario(c *gin.Context) {
	id := c.Param("id")
	o.scenarioMgr.Remove(id)
	c.JSON(http.StatusOK, gin.H{"message": "场景已删除"})
}

func (o *Orchestrator) getScripts(c *gin.Context) {
	scripts := o.scriptExecutor.GetAllScripts()
	c.JSON(http.StatusOK, gin.H{
		"total": len(scripts),
		"data":  scripts,
	})
}

func (o *Orchestrator) getScriptByID(c *gin.Context) {
	id := c.Param("id")
	script, exists := o.scriptExecutor.GetScript(id)
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "脚本不存在"})
		return
	}
	c.JSON(http.StatusOK, script)
}

func (o *Orchestrator) validateScript(c *gin.Context) {
	id := c.Param("id")
	if err := o.scriptExecutor.ValidateScript(id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"valid": false,
			"error": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"valid":   true,
		"message": "脚本验证通过",
	})
}

func (o *Orchestrator) getPendingApprovals(c *gin.Context) {
	requests := o.approvalMgr.GetPendingRequests()
	c.JSON(http.StatusOK, gin.H{
		"total": len(requests),
		"data":  requests,
	})
}

func (o *Orchestrator) getApprovedApprovals(c *gin.Context) {
	requests := o.approvalMgr.GetApprovedRequests()
	c.JSON(http.StatusOK, gin.H{
		"total": len(requests),
		"data":  requests,
	})
}

func (o *Orchestrator) getRejectedApprovals(c *gin.Context) {
	requests := o.approvalMgr.GetRejectedRequests()
	c.JSON(http.StatusOK, gin.H{
		"total": len(requests),
		"data":  requests,
	})
}

func (o *Orchestrator) approveRequest(c *gin.Context) {
	id := c.Param("id")

	var req struct {
		Approver string `json:"approver"`
		Reason   string `json:"reason"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		req.Approver = "unknown"
		req.Reason = "manual approval"
	}

	if err := o.approvalMgr.Approve(id, req.Approver, req.Reason); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	fmt.Printf("[审批] 审批请求已批准: %s (审批人: %s)\n", id, req.Approver)

	approvalReq, _ := o.approvalMgr.GetRequest(id)
	if approvalReq != nil {
		o.recordMgr.SetApprovalInfo(approvalReq.FaultID, &records.ApprovalRecord{
			Required:     true,
			Approved:     true,
			Requester:    approvalReq.Requester,
			Approver:     approvalReq.Approver,
			RequestTime:  approvalReq.RequestTime,
			ApprovalTime: approvalReq.ApprovalTime.Sub(approvalReq.RequestTime),
			Reason:       approvalReq.Reason,
		})

		if scenario, exists := o.scenarioMgr.GetByID(approvalReq.ScenarioID); exists {
			if record, exists := o.recordMgr.GetRecord(approvalReq.FaultID); exists {
				go o.executeRecoveryScript(record, scenario)
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "审批已通过",
		"request_id": id,
	})
}

func (o *Orchestrator) rejectRequest(c *gin.Context) {
	id := c.Param("id")

	var req struct {
		Approver string `json:"approver"`
		Reason   string `json:"reason"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		req.Approver = "unknown"
		req.Reason = "rejected manually"
	}

	if err := o.approvalMgr.Reject(id, req.Approver, req.Reason); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	fmt.Printf("[审批] 审批请求已拒绝: %s (审批人: %s, 原因: %s)\n", id, req.Approver, req.Reason)

	approvalReq, _ := o.approvalMgr.GetRequest(id)
	if approvalReq != nil {
		o.recordMgr.SetApprovalInfo(approvalReq.FaultID, &records.ApprovalRecord{
			Required:     true,
			Approved:     false,
			Requester:    approvalReq.Requester,
			Approver:     approvalReq.Approver,
			RequestTime:  approvalReq.RequestTime,
			ApprovalTime: approvalReq.ApprovalTime.Sub(approvalReq.RequestTime),
			Reason:       approvalReq.Reason,
		})
		o.recordMgr.UpdateStatus(approvalReq.FaultID, "rejected")
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "审批已拒绝",
		"request_id": id,
	})
}

func (o *Orchestrator) getGrayscaleRollouts(c *gin.Context) {
	rollouts := o.grayscaleMgr.GetAllRollouts()
	c.JSON(http.StatusOK, gin.H{
		"total": len(rollouts),
		"data":  rollouts,
	})
}

func (o *Orchestrator) pauseRollout(c *gin.Context) {
	id := c.Param("id")
	if err := o.grayscaleMgr.PauseRollout(id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	fmt.Printf("[灰度] 灰度发布已暂停: %s\n", id)
	c.JSON(http.StatusOK, gin.H{"message": "灰度发布已暂停"})
}

func (o *Orchestrator) resumeRollout(c *gin.Context) {
	id := c.Param("id")
	if err := o.grayscaleMgr.ResumeRollout(id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	fmt.Printf("[灰度] 灰度发布已恢复: %s\n", id)
	c.JSON(http.StatusOK, gin.H{"message": "灰度发布已恢复"})
}

func (o *Orchestrator) cancelRollout(c *gin.Context) {
	id := c.Param("id")
	if err := o.grayscaleMgr.CancelRollout(id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	fmt.Printf("[灰度] 灰度发布已取消: %s\n", id)
	c.JSON(http.StatusOK, gin.H{"message": "灰度发布已取消"})
}

func (o *Orchestrator) getRecords(c *gin.Context) {
	records := o.recordMgr.GetAllRecords()
	c.JSON(http.StatusOK, gin.H{
		"total": len(records),
		"data":  records,
	})
}

func (o *Orchestrator) getRecordByID(c *gin.Context) {
	id := c.Param("id")
	record, exists := o.recordMgr.GetRecord(id)
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "记录不存在"})
		return
	}
	c.JSON(http.StatusOK, record)
}

func (o *Orchestrator) getRecordsByStatus(c *gin.Context) {
	status := c.Param("status")
	records := o.recordMgr.GetRecordsByStatus(status)
	c.JSON(http.StatusOK, gin.H{
		"total": len(records),
		"data":  records,
	})
}

func (o *Orchestrator) getRecordsByScenario(c *gin.Context) {
	scenarioID := c.Param("scenario_id")
	records := o.recordMgr.GetRecordsByScenario(scenarioID)
	c.JSON(http.StatusOK, gin.H{
		"total": len(records),
		"data":  records,
	})
}

func (o *Orchestrator) getStats(c *gin.Context) {
	stats := o.recordMgr.GetStats()

	stats["scenarios_count"] = len(o.scenarioMgr.GetAll())
	stats["scripts_count"] = len(o.scriptExecutor.GetAllScripts())
	stats["pending_approvals"] = len(o.approvalMgr.GetPendingRequests())
	stats["approval_enabled"] = o.approvalMgr.IsEnabled()
	stats["grayscale_enabled"] = o.grayscaleMgr.IsEnabled()
	stats["grayscale_percentage"] = o.grayscaleMgr.GetPercentage()

	c.JSON(http.StatusOK, stats)
}
