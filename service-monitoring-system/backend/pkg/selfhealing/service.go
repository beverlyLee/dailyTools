package selfhealing

import (
	"fmt"
	"os/exec"
	"time"

	"service-monitoring-system/pkg/config"
	"service-monitoring-system/pkg/monitoring"
)

type Service struct {
	config          *config.Config
	monitoring      *monitoring.Service
	faultScenarios  []FaultScenario
	repairScripts   map[string]RepairScript
	faultRecords    []FaultRecord
	approvalQueue   []ApprovalRequest
}

type FaultScenario struct {
	ID          string
	Name        string
	Description string
	Threshold   float64
	ScriptID    string
	Severity    string
}

type RepairScript struct {
	ID       string
	Name     string
	Type     string
	Path     string
	Timeout  int
}

type FaultRecord struct {
	ID         string
	ScenarioID string
	Timestamp  time.Time
	Severity   string
	Status     string
	Details    string
}

type ApprovalRequest struct {
	ID         string
	FaultID    string
	ScenarioID string
	Timestamp  time.Time
	Status     string
	Approver   string
}

func NewService(cfg *config.Config, monitoringSvc *monitoring.Service) *Service {
	s := &Service{
		config:        cfg,
		monitoring:    monitoringSvc,
		faultScenarios: []FaultScenario{
			{
				ID:          "cpu-high",
				Name:        "CPU飙高",
				Description: "CPU使用率超过阈值",
				Threshold:   80.0,
				ScriptID:    "restart-service",
				Severity:    "high",
			},
			{
				ID:          "memory-high",
				Name:        "内存飙高",
				Description: "内存使用率超过阈值",
				Threshold:   85.0,
				ScriptID:    "clear-cache",
				Severity:    "medium",
			},
			{
				ID:          "service-down",
				Name:        "服务宕机",
				Description: "服务状态异常",
				Threshold:   0.0,
				ScriptID:    "restart-service",
				Severity:    "critical",
			},
			{
				ID:          "http-probe-failed",
				Name:        "HTTP探测失败",
				Description: "HTTP黑盒探测失败",
				Threshold:   0.0,
				ScriptID:    "check-network",
				Severity:    "high",
			},
			{
				ID:          "tcp-probe-failed",
				Name:        "TCP探测失败",
				Description: "TCP黑盒探测失败",
				Threshold:   0.0,
				ScriptID:    "check-network",
				Severity:    "high",
			},
		},
		repairScripts: map[string]RepairScript{
			"restart-service": {
				ID:       "restart-service",
				Name:     "重启服务",
				Type:     "shell",
				Path:     "./scripts/restart-service.sh",
				Timeout:  60,
			},
			"clear-cache": {
				ID:       "clear-cache",
				Name:     "清理缓存",
				Type:     "shell",
				Path:     "./scripts/clear-cache.sh",
				Timeout:  30,
			},
			"check-network": {
				ID:       "check-network",
				Name:     "检查网络",
				Type:     "python",
				Path:     "./scripts/check-network.py",
				Timeout:  30,
			},
		},
		faultRecords:  []FaultRecord{},
		approvalQueue: []ApprovalRequest{},
	}

	go s.startFaultDetection()

	return s
}

func (s *Service) startFaultDetection() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for range ticker.Collect() {
		s.detectAndHandleFaults()
	}
}

func (s *Service) detectAndHandleFaults() {
	metrics := s.monitoring.GetMetrics()

	if cpuUsage, ok := metrics["cpu_usage"].(float64); ok {
		for _, scenario := range s.faultScenarios {
			if scenario.ID == "cpu-high" && cpuUsage > scenario.Threshold {
				s.handleFault(scenario, fmt.Sprintf("CPU使用率: %.2f%%", cpuUsage))
			}
		}
	}

	if memoryUsage, ok := metrics["memory_usage"].(float64); ok {
		for _, scenario := range s.faultScenarios {
			if scenario.ID == "memory-high" && memoryUsage > scenario.Threshold {
				s.handleFault(scenario, fmt.Sprintf("内存使用率: %.2f%%", memoryUsage))
			}
		}
	}

	if services, ok := metrics["services"].([]map[string]interface{}); ok {
		for _, service := range services {
			if status, ok := service["status"].(string); ok && status != "healthy" {
				for _, scenario := range s.faultScenarios {
					if scenario.ID == "service-down" {
						s.handleFault(scenario, fmt.Sprintf("服务 %s 状态异常: %s", service["name"], status))
					}
				}
			}
		}
	}
}

func (s *Service) handleFault(scenario FaultScenario, details string) {
	record := FaultRecord{
		ID:         fmt.Sprintf("fault-%d", time.Now().UnixNano()),
		ScenarioID: scenario.ID,
		Timestamp:  time.Now(),
		Severity:   scenario.Severity,
		Status:     "detected",
		Details:    details,
	}
	s.faultRecords = append(s.faultRecords, record)

	if s.config.SelfHealing.ApprovalNeeded {
		request := ApprovalRequest{
			ID:         fmt.Sprintf("approval-%d", time.Now().UnixNano()),
			FaultID:    record.ID,
			ScenarioID: scenario.ID,
			Timestamp:  time.Now(),
			Status:     "pending",
		}
		s.approvalQueue = append(s.approvalQueue, request)
		record.Status = "pending_approval"
	} else if s.config.SelfHealing.GrayScale {
		if shouldExecuteInGrayScale() {
			s.executeRepair(record, scenario)
		} else {
			record.Status = "grayscale_skipped"
		}
	} else {
		s.executeRepair(record, scenario)
	}
}

func shouldExecuteInGrayScale() bool {
	return time.Now().Unix()%2 == 0
}

func (s *Service) executeRepair(record FaultRecord, scenario FaultScenario) {
	script, exists := s.repairScripts[scenario.ScriptID]
	if !exists {
		record.Status = "failed"
		record.Details += " - 未找到修复脚本"
		return
	}

	record.Status = "executing"
	
	var cmd *exec.Cmd
	if script.Type == "shell" {
		cmd = exec.Command("sh", script.Path)
	} else if script.Type == "python" {
		cmd = exec.Command("python", script.Path)
	}

	err := cmd.Start()
	if err != nil {
		record.Status = "failed"
		record.Details += fmt.Sprintf(" - 启动脚本失败: %v", err)
		return
	}

	done := make(chan error, 1)
	go func() {
		done <- cmd.Wait()
	}()

	select {
	case <-time.After(time.Duration(script.Timeout) * time.Second):
		cmd.Process.Kill()
		record.Status = "timeout"
		record.Details += " - 脚本执行超时"
	case err := <-done:
		if err != nil {
			record.Status = "failed"
			record.Details += fmt.Sprintf(" - 脚本执行失败: %v", err)
		} else {
			record.Status = "completed"
			record.Details += " - 修复成功"
		}
	}
}

func (s *Service) GetFaultScenarios() []FaultScenario {
	return s.faultScenarios
}

func (s *Service) GetRepairScripts() map[string]RepairScript {
	return s.repairScripts
}

func (s *Service) GetFaultRecords() []FaultRecord {
	return s.faultRecords
}

func (s *Service) GetApprovalQueue() []ApprovalRequest {
	return s.approvalQueue
}

func (s *Service) ApproveRequest(requestID string, approver string) bool {
	for i, req := range s.approvalQueue {
		if req.ID == requestID && req.Status == "pending" {
			s.approvalQueue[i].Status = "approved"
			s.approvalQueue[i].Approver = approver

			for j, record := range s.faultRecords {
				if record.ID == req.FaultID {
					for _, scenario := range s.faultScenarios {
						if scenario.ID == req.ScenarioID {
							s.executeRepair(s.faultRecords[j], scenario)
							return true
						}
					}
				}
			}
		}
	}
	return false
}

func (s *Service) RejectRequest(requestID string, approver string) bool {
	for i, req := range s.approvalQueue {
		if req.ID == requestID && req.Status == "pending" {
			s.approvalQueue[i].Status = "rejected"
			s.approvalQueue[i].Approver = approver

			for j, record := range s.faultRecords {
				if record.ID == req.FaultID {
					s.faultRecords[j].Status = "rejected"
					s.faultRecords[j].Details += " - 自愈请求被拒绝"
					return true
				}
			}
		}
	}
	return false
}

func (s *Service) GetDashboardData() map[string]interface{} {
	return map[string]interface{}{
		"total_faults":        len(s.faultRecords),
		"pending_approvals":   len(s.approvalQueue),
		"active_fault_scenarios": len(s.faultScenarios),
		"repair_scripts":      len(s.repairScripts),
		"grayscale_enabled":   s.config.SelfHealing.GrayScale,
		"approval_enabled":    s.config.SelfHealing.ApprovalNeeded,
	}
}
