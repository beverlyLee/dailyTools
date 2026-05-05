package service

import (
	"sync"
	"time"

	"chaos-engineering-platform/pkg/model"

	"github.com/google/uuid"
)

type ExperimentService struct {
	experiments map[string]*model.Experiment
	logs        map[string][]*model.ExperimentLog
	mu          sync.RWMutex
}

func NewExperimentService() *ExperimentService {
	return &ExperimentService{
		experiments: make(map[string]*model.Experiment),
		logs:        make(map[string][]*model.ExperimentLog),
	}
}

func (s *ExperimentService) List(status string, page, size int) []*model.Experiment {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var result []*model.Experiment
	for _, exp := range s.experiments {
		if status == "" || string(exp.Status) == status {
			result = append(result, exp)
		}
	}

	start := (page - 1) * size
	end := start + size
	if start > len(result) {
		return []*model.Experiment{}
	}
	if end > len(result) {
		end = len(result)
	}

	return result[start:end]
}

func (s *ExperimentService) Get(id string) (*model.Experiment, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	exp, exists := s.experiments[id]
	return exp, exists
}

func (s *ExperimentService) Create(req *model.Experiment) *model.Experiment {
	s.mu.Lock()
	defer s.mu.Unlock()

	now := time.Now()
	experiment := &model.Experiment{
		ID:              uuid.New().String(),
		Name:            req.Name,
		Description:     req.Description,
		Steps:           req.Steps,
		Status:          model.ExperimentStatusDraft,
		TargetNamespace: req.TargetNamespace,
		CreatedAt:       now,
		UpdatedAt:       now,
		SteadyStateCheck: model.SteadyStateCheckConfig{
			Enabled:         true,
			CheckInterval:   10,
			Metrics:         []model.MetricThreshold{},
			RollbackOnFailure: true,
		},
	}

	if req.SteadyStateCheck.Enabled {
		experiment.SteadyStateCheck = req.SteadyStateCheck
	}

	s.experiments[experiment.ID] = experiment
	s.addLog(experiment.ID, "", model.LogLevelInfo, "实验已创建")

	return experiment
}

func (s *ExperimentService) Update(id string, req *model.Experiment) (*model.Experiment, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	experiment, exists := s.experiments[id]
	if !exists {
		return nil, false
	}

	experiment.Name = req.Name
	experiment.Description = req.Description
	experiment.Steps = req.Steps
	experiment.TargetNamespace = req.TargetNamespace
	experiment.UpdatedAt = time.Now()

	s.addLog(id, "", model.LogLevelInfo, "实验已更新")

	return experiment, true
}

func (s *ExperimentService) Delete(id string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, exists := s.experiments[id]; !exists {
		return false
	}

	delete(s.experiments, id)
	delete(s.logs, id)

	return true
}

func (s *ExperimentService) Start(id string) (*model.Experiment, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	experiment, exists := s.experiments[id]
	if !exists {
		return nil, false
	}

	if experiment.Status == model.ExperimentStatusRunning {
		return experiment, true
	}

	now := time.Now()
	experiment.Status = model.ExperimentStatusRunning
	experiment.StartedAt = &now
	experiment.UpdatedAt = now

	for i := range experiment.Steps {
		experiment.Steps[i].Status = model.StepStatusPending
	}

	s.addLog(id, "", model.LogLevelInfo, "实验已启动")

	go s.executeExperiment(id)

	return experiment, true
}

func (s *ExperimentService) Pause(id string) (*model.Experiment, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	experiment, exists := s.experiments[id]
	if !exists {
		return nil, false
	}

	if experiment.Status != model.ExperimentStatusRunning {
		return experiment, true
	}

	experiment.Status = model.ExperimentStatusPaused
	experiment.UpdatedAt = time.Now()

	s.addLog(id, "", model.LogLevelWarn, "实验已暂停")

	return experiment, true
}

func (s *ExperimentService) Resume(id string) (*model.Experiment, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	experiment, exists := s.experiments[id]
	if !exists {
		return nil, false
	}

	if experiment.Status != model.ExperimentStatusPaused {
		return experiment, true
	}

	experiment.Status = model.ExperimentStatusRunning
	experiment.UpdatedAt = time.Now()

	s.addLog(id, "", model.LogLevelInfo, "实验已继续")

	go s.executeExperiment(id)

	return experiment, true
}

func (s *ExperimentService) Abort(id string) (*model.Experiment, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	experiment, exists := s.experiments[id]
	if !exists {
		return nil, false
	}

	if !s.canAbort(experiment.Status) {
		return experiment, true
	}

	now := time.Now()
	experiment.Status = model.ExperimentStatusAborted
	experiment.UpdatedAt = now

	s.addLog(id, "", model.LogLevelError, "实验已紧急终止，开始回滚...")
	s.addLog(id, "", model.LogLevelInfo, "回滚操作完成")

	return experiment, true
}

func (s *ExperimentService) canAbort(status model.ExperimentStatus) bool {
	return status == model.ExperimentStatusRunning || status == model.ExperimentStatusPaused
}

func (s *ExperimentService) executeExperiment(id string) {
	s.mu.Lock()
	experiment, exists := s.experiments[id]
	if !exists {
		s.mu.Unlock()
		return
	}
	s.mu.Unlock()

	for i := range experiment.Steps {
		s.mu.RLock()
		if experiment.Status == model.ExperimentStatusAborted {
			s.mu.RUnlock()
			return
		}
		if experiment.Status == model.ExperimentStatusPaused {
			s.mu.RUnlock()
			return
		}
		s.mu.RUnlock()

		s.executeStep(id, i)

		s.mu.RLock()
		if experiment.Status == model.ExperimentStatusAborted {
			s.mu.RUnlock()
			return
		}
		s.mu.RUnlock()
	}

	s.mu.Lock()
	if experiment.Status == model.ExperimentStatusRunning {
		now := time.Now()
		experiment.Status = model.ExperimentStatusCompleted
		experiment.CompletedAt = &now
		experiment.UpdatedAt = now
		s.addLog(id, "", model.LogLevelInfo, "实验执行完成")
	}
	s.mu.Unlock()
}

func (s *ExperimentService) executeStep(experimentID string, stepIndex int) {
	s.mu.Lock()
	experiment, exists := s.experiments[experimentID]
	if !exists || stepIndex >= len(experiment.Steps) {
		s.mu.Unlock()
		return
	}

	step := &experiment.Steps[stepIndex]
	step.Status = model.StepStatusRunning
	now := time.Now()
	step.StartedAt = &now

	s.addLog(experimentID, step.ID, model.LogLevelInfo, "开始执行步骤: "+step.Name)
	s.mu.Unlock()

	time.Sleep(time.Duration(step.Duration) * time.Second)

	s.mu.Lock()
	if experiment.Status == model.ExperimentStatusAborted {
		step.Status = model.StepStatusFailed
		s.addLog(experimentID, step.ID, model.LogLevelError, "步骤被终止")
		s.mu.Unlock()
		return
	}

	step.Status = model.StepStatusCompleted
	completedAt := time.Now()
	step.CompletedAt = &completedAt
	experiment.UpdatedAt = completedAt

	s.addLog(experimentID, step.ID, model.LogLevelInfo, "步骤执行完成")
	s.mu.Unlock()
}

func (s *ExperimentService) GetLogs(id string, level string, limit int) []*model.ExperimentLog {
	s.mu.RLock()
	defer s.mu.RUnlock()

	logs, exists := s.logs[id]
	if !exists {
		return []*model.ExperimentLog{}
	}

	var result []*model.ExperimentLog
	for i := len(logs) - 1; i >= 0 && len(result) < limit; i-- {
		if level == "" || string(logs[i].Level) == level {
			result = append(result, logs[i])
		}
	}

	return result
}

func (s *ExperimentService) addLog(experimentID, stepID string, level model.LogLevel, message string) {
	log := &model.ExperimentLog{
		ID:           uuid.New().String(),
		ExperimentID: experimentID,
		Timestamp:    time.Now(),
		Level:        level,
		Message:      message,
	}

	if stepID != "" {
		log.StepID = &stepID
	}

	if _, exists := s.logs[experimentID]; !exists {
		s.logs[experimentID] = []*model.ExperimentLog{}
	}

	s.logs[experimentID] = append(s.logs[experimentID], log)
}
