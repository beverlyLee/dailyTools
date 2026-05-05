package service

import (
	"sync"
	"time"

	"chaos-engineering-platform/pkg/model"

	"github.com/google/uuid"
)

type CircuitBreakerService struct {
	events map[string]*model.CircuitBreakerEvent
	status map[string]*struct {
		Status    string
		LastEvent *model.CircuitBreakerEvent
	}
	mu sync.RWMutex
}

func NewCircuitBreakerService() *CircuitBreakerService {
	return &CircuitBreakerService{
		events: make(map[string]*model.CircuitBreakerEvent),
		status: make(map[string]*struct {
			Status    string
			LastEvent *model.CircuitBreakerEvent
		}),
	}
}

func (s *CircuitBreakerService) GetStatus(experimentID string) map[string]interface{} {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if experimentID == "" {
		globalStatus := "normal"
		var lastEvent *model.CircuitBreakerEvent

		for _, event := range s.events {
			if lastEvent == nil || event.Timestamp > lastEvent.Timestamp {
				lastEvent = event
				if event.EventType == "triggered" || event.EventType == "rollback_start" {
					globalStatus = "warning"
				}
			}
		}

		return map[string]interface{}{
			"status":    globalStatus,
			"lastEvent": lastEvent,
		}
	}

	status, exists := s.status[experimentID]
	if !exists {
		return map[string]interface{}{
			"status":    "normal",
			"lastEvent": nil,
		}
	}

	return map[string]interface{}{
		"status":    status.Status,
		"lastEvent": status.LastEvent,
	}
}

func (s *CircuitBreakerService) ListEvents(experimentID string, limit int) []*model.CircuitBreakerEvent {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var result []*model.CircuitBreakerEvent
	for _, event := range s.events {
		if experimentID != "" && event.ExperimentID != experimentID {
			continue
		}
		result = append(result, event)
	}

	for i := 0; i < len(result)-1; i++ {
		for j := i + 1; j < len(result); j++ {
			if result[i].Timestamp < result[j].Timestamp {
				result[i], result[j] = result[j], result[i]
			}
		}
	}

	if limit > 0 && len(result) > limit {
		result = result[:limit]
	}

	return result
}

func (s *CircuitBreakerService) TriggerRollback(experimentID, reason string) *model.CircuitBreakerEvent {
	s.mu.Lock()
	defer s.mu.Unlock()

	now := time.Now().Format(time.RFC3339)

	event := &model.CircuitBreakerEvent{
		ID:             uuid.New().String(),
		ExperimentID:   experimentID,
		ExperimentName: s.getExperimentName(experimentID),
		EventType:      "rollback_start",
		Reason:         reason,
		Timestamp:      now,
	}

	s.events[event.ID] = event

	s.updateStatus(experimentID, "warning", event)

	go s.completeRollback(event)

	return event
}

func (s *CircuitBreakerService) completeRollback(startEvent *model.CircuitBreakerEvent) {
	time.Sleep(2 * time.Second)

	s.mu.Lock()
	defer s.mu.Unlock()

	now := time.Now().Format(time.RFC3339)

	event := &model.CircuitBreakerEvent{
		ID:             uuid.New().String(),
		ExperimentID:   startEvent.ExperimentID,
		ExperimentName: startEvent.ExperimentName,
		EventType:      "rollback_complete",
		Reason:         "回滚操作已完成，系统已恢复正常",
		Timestamp:      now,
	}

	s.events[event.ID] = event
	s.updateStatus(startEvent.ExperimentID, "normal", event)
}

func (s *CircuitBreakerService) TriggerCircuitBreaker(experimentID, reason string) *model.CircuitBreakerEvent {
	s.mu.Lock()
	defer s.mu.Unlock()

	now := time.Now().Format(time.RFC3339)

	event := &model.CircuitBreakerEvent{
		ID:             uuid.New().String(),
		ExperimentID:   experimentID,
		ExperimentName: s.getExperimentName(experimentID),
		EventType:      "triggered",
		Reason:         reason,
		Timestamp:      now,
	}

	s.events[event.ID] = event
	s.updateStatus(experimentID, "warning", event)

	return event
}

func (s *CircuitBreakerService) MarkRecovered(experimentID string) *model.CircuitBreakerEvent {
	s.mu.Lock()
	defer s.mu.Unlock()

	now := time.Now().Format(time.RFC3339)

	event := &model.CircuitBreakerEvent{
		ID:             uuid.New().String(),
		ExperimentID:   experimentID,
		ExperimentName: s.getExperimentName(experimentID),
		EventType:      "recovered",
		Reason:         "系统已恢复正常状态",
		Timestamp:      now,
	}

	s.events[event.ID] = event
	s.updateStatus(experimentID, "normal", event)

	return event
}

func (s *CircuitBreakerService) updateStatus(experimentID, status string, event *model.CircuitBreakerEvent) {
	if _, exists := s.status[experimentID]; !exists {
		s.status[experimentID] = &struct {
			Status    string
			LastEvent *model.CircuitBreakerEvent
		}{}
	}

	s.status[experimentID].Status = status
	s.status[experimentID].LastEvent = event
}

func (s *CircuitBreakerService) getExperimentName(experimentID string) string {
	switch experimentID {
	case "exp-1":
		return "Pod 删除实验"
	case "exp-2":
		return "网络延迟实验"
	case "exp-3":
		return "CPU 压力测试"
	default:
		return "实验 - " + experimentID
	}
}
