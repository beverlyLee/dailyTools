package grayscale

import (
	"fmt"
	"math/rand"
	"sync"
	"time"

	"self-healing-orchestrator/config"
)

type Manager struct {
	config        *config.GrayScaleConfig
	rolloutStatus map[string]*RolloutStatus
	mutex         sync.RWMutex
	rolloutChan   chan RolloutEvent
}

type RolloutStatus struct {
	ID              string
	ScenarioID      string
	ScriptID        string
	Status          string
	TotalInstances  int
	RolledOut       int
	Failed          int
	CurrentGroup    string
	StartedAt       time.Time
	LastRolloutAt   time.Time
	NextRolloutAt   time.Time
	InstanceGroups  []string
	CurrentGroupIdx int
}

type RolloutEvent struct {
	Type         string
	RolloutID    string
	InstanceID   string
	Group        string
	Success      bool
	ErrorMessage string
}

func NewManager(cfg *config.GrayScaleConfig) *Manager {
	return &Manager{
		config:        cfg,
		rolloutStatus: make(map[string]*RolloutStatus),
		rolloutChan:   make(chan RolloutEvent, 100),
	}
}

func (m *Manager) IsEnabled() bool {
	return m.config.Enabled
}

func (m *Manager) GetPercentage() int {
	return m.config.Percentage
}

func (m *Manager) ShouldExecuteInGrayscale() bool {
	if !m.config.Enabled {
		return true
	}

	rand.Seed(time.Now().UnixNano())
	return rand.Intn(100) < m.config.Percentage
}

func (m *Manager) StartRollout(scenarioID, scriptID string, totalInstances int) (*RolloutStatus, error) {
	if !m.config.Enabled {
		return nil, nil
	}

	m.mutex.Lock()
	defer m.mutex.Unlock()

	rolloutID := generateRolloutID()

	var instanceGroups []string
	if len(m.config.InstanceGroups) > 0 {
		instanceGroups = m.config.InstanceGroups
	} else {
		instanceGroups = []string{"default"}
	}

	status := &RolloutStatus{
		ID:              rolloutID,
		ScenarioID:      scenarioID,
		ScriptID:        scriptID,
		Status:          "starting",
		TotalInstances:  totalInstances,
		RolledOut:       0,
		Failed:          0,
		CurrentGroup:    instanceGroups[0],
		StartedAt:       time.Now(),
		LastRolloutAt:   time.Time{},
		NextRolloutAt:   time.Now().Add(time.Duration(m.config.RolloutDelay) * time.Second),
		InstanceGroups:  instanceGroups,
		CurrentGroupIdx: 0,
	}

	m.rolloutStatus[rolloutID] = status

	m.rolloutChan <- RolloutEvent{
		Type:      "started",
		RolloutID: rolloutID,
	}

	go m.processRollout(rolloutID)

	return status, nil
}

func (m *Manager) processRollout(rolloutID string) {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		m.mutex.RLock()
		status, exists := m.rolloutStatus[rolloutID]
		m.mutex.RUnlock()

		if !exists {
			return
		}

		if status.Status == "completed" || status.Status == "failed" || status.Status == "paused" {
			return
		}

		now := time.Now()
		if now.After(status.NextRolloutAt) {
			m.rolloutNextBatch(rolloutID)
		}
	}
}

func (m *Manager) rolloutNextBatch(rolloutID string) {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	status, exists := m.rolloutStatus[rolloutID]
	if !exists {
		return
	}

	if status.RolledOut >= status.TotalInstances {
		status.Status = "completed"
		return
	}

	if status.CurrentGroupIdx < len(status.InstanceGroups)-1 {
		if status.RolledOut > 0 && status.RolledOut%calculateBatchSize(status.TotalInstances, len(status.InstanceGroups)) == 0 {
			status.CurrentGroupIdx++
			status.CurrentGroup = status.InstanceGroups[status.CurrentGroupIdx]
		}
	}

	batchSize := calculateBatchSize(status.TotalInstances, len(status.InstanceGroups))
	remaining := status.TotalInstances - status.RolledOut
	if remaining < batchSize {
		batchSize = remaining
	}

	status.Status = "rolling_out"
	status.LastRolloutAt = time.Now()
	status.NextRolloutAt = time.Now().Add(time.Duration(m.config.RolloutDelay) * time.Second)

	for i := 0; i < batchSize; i++ {
		instanceID := fmt.Sprintf("%s-%s-%d", status.CurrentGroup, status.ScenarioID, status.RolledOut+i)
		
		success := m.executeOnInstance(instanceID, status.ScriptID)
		
		if success {
			status.RolledOut++
			m.rolloutChan <- RolloutEvent{
				Type:       "instance_success",
				RolloutID:  rolloutID,
				InstanceID: instanceID,
				Group:      status.CurrentGroup,
				Success:    true,
			}
		} else {
			status.Failed++
			m.rolloutChan <- RolloutEvent{
				Type:         "instance_failed",
				RolloutID:    rolloutID,
				InstanceID:   instanceID,
				Group:        status.CurrentGroup,
				Success:      false,
				ErrorMessage: "execution failed",
			}
		}
	}

	if status.RolledOut >= status.TotalInstances {
		status.Status = "completed"
		m.rolloutChan <- RolloutEvent{
			Type:      "completed",
			RolloutID: rolloutID,
		}
	}
}

func (m *Manager) executeOnInstance(instanceID, scriptID string) bool {
	rand.Seed(time.Now().UnixNano())
	return rand.Float32() > 0.1
}

func (m *Manager) PauseRollout(rolloutID string) error {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	status, exists := m.rolloutStatus[rolloutID]
	if !exists {
		return fmt.Errorf("rollout not found: %s", rolloutID)
	}

	if status.Status != "rolling_out" && status.Status != "starting" {
		return fmt.Errorf("rollout is not active: %s", status.Status)
	}

	status.Status = "paused"
	m.rolloutChan <- RolloutEvent{
		Type:      "paused",
		RolloutID: rolloutID,
	}

	return nil
}

func (m *Manager) ResumeRollout(rolloutID string) error {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	status, exists := m.rolloutStatus[rolloutID]
	if !exists {
		return fmt.Errorf("rollout not found: %s", rolloutID)
	}

	if status.Status != "paused" {
		return fmt.Errorf("rollout is not paused: %s", status.Status)
	}

	status.Status = "rolling_out"
	status.NextRolloutAt = time.Now()
	m.rolloutChan <- RolloutEvent{
		Type:      "resumed",
		RolloutID: rolloutID,
	}

	go m.processRollout(rolloutID)

	return nil
}

func (m *Manager) CancelRollout(rolloutID string) error {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	status, exists := m.rolloutStatus[rolloutID]
	if !exists {
		return fmt.Errorf("rollout not found: %s", rolloutID)
	}

	if status.Status == "completed" || status.Status == "failed" {
		return fmt.Errorf("rollout is already finished: %s", status.Status)
	}

	status.Status = "cancelled"
	m.rolloutChan <- RolloutEvent{
		Type:      "cancelled",
		RolloutID: rolloutID,
	}

	return nil
}

func (m *Manager) GetRolloutStatus(rolloutID string) (*RolloutStatus, bool) {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	status, exists := m.rolloutStatus[rolloutID]
	return status, exists
}

func (m *Manager) GetAllRollouts() []*RolloutStatus {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	rollouts := make([]*RolloutStatus, 0, len(m.rolloutStatus))
	for _, status := range m.rolloutStatus {
		rollouts = append(rollouts, status)
	}
	return rollouts
}

func (m *Manager) GetActiveRollouts() []*RolloutStatus {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	var rollouts []*RolloutStatus
	for _, status := range m.rolloutStatus {
		if status.Status == "rolling_out" || status.Status == "starting" || status.Status == "paused" {
			rollouts = append(rollouts, status)
		}
	}
	return rollouts
}

func generateRolloutID() string {
	return fmt.Sprintf("rollout_%d", time.Now().UnixNano())
}

func calculateBatchSize(total, groups int) int {
	if groups == 0 {
		return total
	}
	return (total + groups - 1) / groups
}
