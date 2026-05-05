package chaos

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"system-stability-opt-toolkit/internal/llm"
	"system-stability-opt-toolkit/internal/monitoring"
)

type Engine struct {
	monitoringClient *monitoring.Client
	llmClient        *llm.Client
	experiments      map[string]*Experiment
	activeExperiments map[string]context.CancelFunc
	mu               sync.RWMutex
}

func NewEngine(monitoringClient *monitoring.Client, llmClient *llm.Client) *Engine {
	return &Engine{
		monitoringClient:  monitoringClient,
		llmClient:         llmClient,
		experiments:       make(map[string]*Experiment),
		activeExperiments: make(map[string]context.CancelFunc),
	}
}

func (e *Engine) CreateExperiment(exp *Experiment) error {
	e.mu.Lock()
	defer e.mu.Unlock()

	if _, exists := e.experiments[exp.ID]; exists {
		return fmt.Errorf("experiment with ID %s already exists", exp.ID)
	}

	exp.Status = ExperimentStatusPending
	exp.CreatedAt = time.Now()
	e.experiments[exp.ID] = exp

	log.Printf("Created experiment: %s (%s)", exp.Name, exp.ID)
	return nil
}

func (e *Engine) StartExperiment(ctx context.Context, experimentID string) error {
	e.mu.Lock()
	exp, exists := e.experiments[experimentID]
	e.mu.Unlock()

	if !exists {
		return fmt.Errorf("experiment %s not found", experimentID)
	}

	if exp.Status == ExperimentStatusRunning {
		return fmt.Errorf("experiment %s is already running", experimentID)
	}

	expCtx, cancel := context.WithTimeout(ctx, exp.Config.Duration+30*time.Minute)
	
	e.mu.Lock()
	exp.Status = ExperimentStatusRunning
	now := time.Now()
	exp.StartedAt = &now
	e.activeExperiments[experimentID] = cancel
	e.experiments[experimentID] = exp
	e.mu.Unlock()

	go e.runExperiment(expCtx, exp)

	log.Printf("Started experiment: %s (%s)", exp.Name, exp.ID)
	return nil
}

func (e *Engine) runExperiment(ctx context.Context, exp *Experiment) {
	defer func() {
		e.mu.Lock()
		delete(e.activeExperiments, exp.ID)
		e.mu.Unlock()
	}()

	result := &ExperimentResult{
		ExperimentID: exp.ID,
	}

	log.Printf("Collecting baseline metrics for experiment: %s", exp.ID)
	baselineMetrics, err := e.monitoringClient.CollectMetrics(ctx, 30*time.Second)
	if err != nil {
		log.Printf("Failed to collect baseline metrics: %v", err)
		e.updateExperimentStatus(exp.ID, ExperimentStatusFailed, nil)
		return
	}
	result.BaselineMetrics = baselineMetrics

	log.Printf("Injecting chaos for experiment: %s", exp.ID)
	err = e.injectChaos(ctx, exp)
	if err != nil {
		log.Printf("Failed to inject chaos: %v", err)
		e.updateExperimentStatus(exp.ID, ExperimentStatusFailed, nil)
		return
	}

	log.Printf("Collecting experiment metrics for experiment: %s", exp.ID)
	experimentMetrics, err := e.monitoringClient.CollectMetricsPeriodically(
		ctx, exp.Config.Interval, exp.Config.Duration,
	)
	if err != nil {
		log.Printf("Failed to collect experiment metrics: %v", err)
	}
	result.ExperimentMetrics = experimentMetrics

	if exp.Config.AutoRollback && e.checkRollbackThreshold(baselineMetrics, experimentMetrics, exp.Config.RollbackThreshold) {
		log.Printf("Rollback threshold exceeded, initiating rollback for experiment: %s", exp.ID)
		e.rollbackChaos(ctx, exp)
		e.updateExperimentStatus(exp.ID, ExperimentStatusRolledBack, result)
		return
	}

	log.Printf("Restoring system state after experiment: %s", exp.ID)
	err = e.restoreChaos(ctx, exp)
	if err != nil {
		log.Printf("Failed to restore chaos: %v", err)
	}

	log.Printf("Collecting recovery metrics for experiment: %s", exp.ID)
	recoveryMetrics, err := e.monitoringClient.CollectMetricsPeriodically(
		ctx, exp.Config.Interval, 5*time.Minute,
	)
	if err != nil {
		log.Printf("Failed to collect recovery metrics: %v", err)
	}
	result.RecoveryMetrics = recoveryMetrics

	log.Printf("Analyzing experiment results with LLM: %s", exp.ID)
	llmAnalysis, err := e.llmClient.AnalyzeExperimentResult(ctx, baselineMetrics, experimentMetrics, recoveryMetrics)
	if err != nil {
		log.Printf("Failed to analyze with LLM: %v", err)
	} else {
		result.LLMAnalysis = llmAnalysis
		result.Recommendations = e.generateRecommendations(llmAnalysis, exp)
	}

	result.Status = "completed"
	e.updateExperimentStatus(exp.ID, ExperimentStatusCompleted, result)
	log.Printf("Experiment completed: %s", exp.ID)
}

func (e *Engine) injectChaos(ctx context.Context, exp *Experiment) error {
	switch exp.Config.Type {
	case ExperimentTypePodFailure:
		return e.injectPodFailure(ctx, exp)
	case ExperimentTypeNetworkDelay:
		return e.injectNetworkDelay(ctx, exp)
	case ExperimentTypeDiskPressure:
		return e.injectDiskPressure(ctx, exp)
	case ExperimentTypeCPUStress:
		return e.injectCPUStress(ctx, exp)
	case ExperimentTypeMemoryStress:
		return e.injectMemoryStress(ctx, exp)
	default:
		return fmt.Errorf("unsupported experiment type: %s", exp.Config.Type)
	}
}

func (e *Engine) injectPodFailure(ctx context.Context, exp *Experiment) error {
	log.Printf("Injecting pod failure on namespace: %s, deployment: %s", 
		exp.Config.Target.Namespace, exp.Config.Target.Deployment)
	
	time.Sleep(2 * time.Second)
	return nil
}

func (e *Engine) injectNetworkDelay(ctx context.Context, exp *Experiment) error {
	if exp.Config.NetworkDelay == nil {
		return fmt.Errorf("network delay config is required")
	}
	
	log.Printf("Injecting network delay: %v latency, %v jitter on target: %s", 
		exp.Config.NetworkDelay.Latency, 
		exp.Config.NetworkDelay.Jitter,
		exp.Config.Target.Deployment)
	
	time.Sleep(2 * time.Second)
	return nil
}

func (e *Engine) injectDiskPressure(ctx context.Context, exp *Experiment) error {
	if exp.Config.DiskPressure == nil {
		return fmt.Errorf("disk pressure config is required")
	}
	
	log.Printf("Injecting disk pressure: %d GB on path: %s", 
		exp.Config.DiskPressure.SizeGB, 
		exp.Config.DiskPressure.Path)
	
	time.Sleep(2 * time.Second)
	return nil
}

func (e *Engine) injectCPUStress(ctx context.Context, exp *Experiment) error {
	if exp.Config.CPUStress == nil {
		return fmt.Errorf("CPU stress config is required")
	}
	
	log.Printf("Injecting CPU stress: %d%% load for %v", 
		exp.Config.CPUStress.Load, 
		exp.Config.CPUStress.Duration)
	
	time.Sleep(2 * time.Second)
	return nil
}

func (e *Engine) injectMemoryStress(ctx context.Context, exp *Experiment) error {
	if exp.Config.MemoryStress == nil {
		return fmt.Errorf("memory stress config is required")
	}
	
	log.Printf("Injecting memory stress: %d MB for %v", 
		exp.Config.MemoryStress.SizeMB, 
		exp.Config.MemoryStress.Duration)
	
	time.Sleep(2 * time.Second)
	return nil
}

func (e *Engine) restoreChaos(ctx context.Context, exp *Experiment) error {
	log.Printf("Restoring system state after experiment: %s", exp.ID)
	time.Sleep(2 * time.Second)
	return nil
}

func (e *Engine) rollbackChaos(ctx context.Context, exp *Experiment) error {
	log.Printf("Initiating emergency rollback for experiment: %s", exp.ID)
	return e.restoreChaos(ctx, exp)
}

func (e *Engine) checkRollbackThreshold(baseline monitoring.MetricsSnapshot, metrics []monitoring.MetricsSnapshot, threshold *RollbackThreshold) bool {
	if threshold == nil {
		return false
	}

	for _, m := range metrics {
		if m.ErrorRate > threshold.ErrorRate {
			log.Printf("Rollback threshold exceeded: error rate %.2f%% > %.2f%%", 
				m.ErrorRate*100, threshold.ErrorRate*100)
			return true
		}
		
		if m.LatencyP99 > threshold.LatencyP99 {
			log.Printf("Rollback threshold exceeded: P99 latency %.2fms > %.2fms", 
				m.LatencyP99, threshold.LatencyP99)
			return true
		}
		
		qpsDrop := (baseline.QPS - m.QPS) / baseline.QPS
		if baseline.QPS > 0 && qpsDrop > threshold.QPSDropRate {
			log.Printf("Rollback threshold exceeded: QPS drop rate %.2f%% > %.2f%%", 
				qpsDrop*100, threshold.QPSDropRate*100)
			return true
		}
	}

	return false
}

func (e *Engine) generateRecommendations(analysis *llm.ExperimentAnalysis, exp *Experiment) []Recommendation {
	if analysis == nil {
		return nil
	}

	var recommendations []Recommendation

	for _, weakness := range analysis.Weaknesses {
		recommendations = append(recommendations, Recommendation{
			Priority:    "high",
			Category:    "resilience",
			Description: fmt.Sprintf("Address weakness: %s", weakness),
			Action:      fmt.Sprintf("Implement mitigation for identified weakness in %s scenario", exp.Config.Type),
		})
	}

	if !analysis.SteadyState {
		recommendations = append(recommendations, Recommendation{
			Priority:    "critical",
			Category:    "stability",
			Description: "System did not reach steady state after experiment",
			Action:      "Review and enhance system resilience mechanisms",
		})
	}

	return recommendations
}

func (e *Engine) updateExperimentStatus(id string, status ExperimentStatus, result *ExperimentResult) {
	e.mu.Lock()
	defer e.mu.Unlock()

	if exp, exists := e.experiments[id]; exists {
		exp.Status = status
		if result != nil {
			exp.Result = result
		}
		if status == ExperimentStatusCompleted || status == ExperimentStatusRolledBack || status == ExperimentStatusFailed {
			now := time.Now()
			exp.CompletedAt = &now
		}
		e.experiments[id] = exp
	}
}

func (e *Engine) GetExperiment(id string) (*Experiment, error) {
	e.mu.RLock()
	defer e.mu.RUnlock()

	exp, exists := e.experiments[id]
	if !exists {
		return nil, fmt.Errorf("experiment %s not found", id)
	}
	return exp, nil
}

func (e *Engine) ListExperiments() []*Experiment {
	e.mu.RLock()
	defer e.mu.RUnlock()

	experiments := make([]*Experiment, 0, len(e.experiments))
	for _, exp := range e.experiments {
		experiments = append(experiments, exp)
	}
	return experiments
}

func (e *Engine) StopExperiment(id string) error {
	e.mu.RLock()
	cancel, exists := e.activeExperiments[id]
	e.mu.RUnlock()

	if !exists {
		return fmt.Errorf("experiment %s is not running", id)
	}

	cancel()
	log.Printf("Stopped experiment: %s", id)
	return nil
}
