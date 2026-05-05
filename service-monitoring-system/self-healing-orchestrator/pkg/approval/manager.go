package approval

import (
	"fmt"
	"sync"
	"time"

	"self-healing-orchestrator/config"
)

type Manager struct {
	config       *config.ApprovalConfig
	requests     map[string]*ApprovalRequest
	approved     map[string]*ApprovalRequest
	rejected     map[string]*ApprovalRequest
	mutex        sync.RWMutex
	requestChan  chan ApprovalEvent
}

type ApprovalRequest struct {
	ID           string
	FaultID      string
	ScenarioID   string
	ScriptID     string
	Requester    string
	RequestTime  time.Time
	Status       string
	Approver     string
	ApprovalTime time.Time
	Reason       string
	TimeoutAt    time.Time
}

type ApprovalEvent struct {
	Type      string
	RequestID string
	Approver  string
	Reason    string
}

func NewManager(cfg *config.ApprovalConfig) *Manager {
	m := &Manager{
		config:      cfg,
		requests:    make(map[string]*ApprovalRequest),
		approved:    make(map[string]*ApprovalRequest),
		rejected:    make(map[string]*ApprovalRequest),
		requestChan: make(chan ApprovalEvent, 100),
	}

	go m.processTimeout()

	return m
}

func (m *Manager) processTimeout() {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		m.checkTimeouts()
	}
}

func (m *Manager) checkTimeouts() {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	now := time.Now()
	for id, req := range m.requests {
		if req.Status == "pending" && now.After(req.TimeoutAt) {
			req.Status = "expired"
			req.Reason = "approval timeout"
			m.rejected[id] = req
			delete(m.requests, id)
		}
	}
}

func (m *Manager) CreateRequest(faultID, scenarioID, scriptID, requester string) (*ApprovalRequest, error) {
	if !m.config.Enabled {
		return nil, fmt.Errorf("approval is disabled")
	}

	m.mutex.Lock()
	defer m.mutex.Unlock()

	requestID := fmt.Sprintf("approval_%d", time.Now().UnixNano())
	timeoutDuration := time.Duration(m.config.TimeoutMinutes) * time.Minute

	req := &ApprovalRequest{
		ID:          requestID,
		FaultID:     faultID,
		ScenarioID:  scenarioID,
		ScriptID:    scriptID,
		Requester:   requester,
		RequestTime: time.Now(),
		Status:      "pending",
		TimeoutAt:   time.Now().Add(timeoutDuration),
	}

	m.requests[requestID] = req

	m.requestChan <- ApprovalEvent{
		Type:      "created",
		RequestID: requestID,
	}

	return req, nil
}

func (m *Manager) Approve(requestID, approver, reason string) error {
	if m.config.RequireAdmin {
		if !m.isApprover(approver) {
			return fmt.Errorf("user %s is not an authorized approver", approver)
		}
	}

	m.mutex.Lock()
	defer m.mutex.Unlock()

	req, exists := m.requests[requestID]
	if !exists {
		return fmt.Errorf("request not found: %s", requestID)
	}

	if req.Status != "pending" {
		return fmt.Errorf("request is not pending: %s", req.Status)
	}

	req.Status = "approved"
	req.Approver = approver
	req.ApprovalTime = time.Now()
	req.Reason = reason

	m.approved[requestID] = req
	delete(m.requests, requestID)

	m.requestChan <- ApprovalEvent{
		Type:      "approved",
		RequestID: requestID,
		Approver:  approver,
		Reason:    reason,
	}

	return nil
}

func (m *Manager) Reject(requestID, approver, reason string) error {
	if m.config.RequireAdmin {
		if !m.isApprover(approver) {
			return fmt.Errorf("user %s is not an authorized approver", approver)
		}
	}

	m.mutex.Lock()
	defer m.mutex.Unlock()

	req, exists := m.requests[requestID]
	if !exists {
		return fmt.Errorf("request not found: %s", requestID)
	}

	if req.Status != "pending" {
		return fmt.Errorf("request is not pending: %s", req.Status)
	}

	req.Status = "rejected"
	req.Approver = approver
	req.ApprovalTime = time.Now()
	req.Reason = reason

	m.rejected[requestID] = req
	delete(m.requests, requestID)

	m.requestChan <- ApprovalEvent{
		Type:      "rejected",
		RequestID: requestID,
		Approver:  approver,
		Reason:    reason,
	}

	return nil
}

func (m *Manager) isApprover(user string) bool {
	for _, approver := range m.config.Approvers {
		if approver == user {
			return true
		}
	}
	return false
}

func (m *Manager) GetRequest(requestID string) (*ApprovalRequest, bool) {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	if req, exists := m.requests[requestID]; exists {
		return req, true
	}
	if req, exists := m.approved[requestID]; exists {
		return req, true
	}
	if req, exists := m.rejected[requestID]; exists {
		return req, true
	}

	return nil, false
}

func (m *Manager) GetPendingRequests() []*ApprovalRequest {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	requests := make([]*ApprovalRequest, 0, len(m.requests))
	for _, req := range m.requests {
		if req.Status == "pending" {
			requests = append(requests, req)
		}
	}
	return requests
}

func (m *Manager) GetApprovedRequests() []*ApprovalRequest {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	requests := make([]*ApprovalRequest, 0, len(m.approved))
	for _, req := range m.approved {
		requests = append(requests, req)
	}
	return requests
}

func (m *Manager) GetRejectedRequests() []*ApprovalRequest {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	requests := make([]*ApprovalRequest, 0, len(m.rejected))
	for _, req := range m.rejected {
		requests = append(requests, req)
	}
	return requests
}

func (m *Manager) IsEnabled() bool {
	return m.config.Enabled
}

func (m *Manager) RequiresAdmin() bool {
	return m.config.RequireAdmin
}

func (m *Manager) GetApprovers() []string {
	return m.config.Approvers
}

func (m *Manager) WaitForApproval(requestID string) <-chan ApprovalEvent {
	eventChan := make(chan ApprovalEvent, 1)

	go func() {
		ticker := time.NewTicker(1 * time.Second)
		defer ticker.Stop()

		for range ticker.C {
			m.mutex.RLock()
			req, exists := m.requests[requestID]
			if exists && req.Status != "pending" {
				if req.Status == "approved" {
					eventChan <- ApprovalEvent{
						Type:      "approved",
						RequestID: requestID,
						Approver:  req.Approver,
						Reason:    req.Reason,
					}
				} else {
					eventChan <- ApprovalEvent{
						Type:      "rejected",
						RequestID: requestID,
						Approver:  req.Approver,
						Reason:    req.Reason,
					}
				}
				m.mutex.RUnlock()
				close(eventChan)
				return
			}
			m.mutex.RUnlock()

			m.mutex.RLock()
			if _, exists := m.approved[requestID]; exists {
				req = m.approved[requestID]
				eventChan <- ApprovalEvent{
					Type:      "approved",
					RequestID: requestID,
					Approver:  req.Approver,
					Reason:    req.Reason,
				}
				m.mutex.RUnlock()
				close(eventChan)
				return
			}
			if _, exists := m.rejected[requestID]; exists {
				req = m.rejected[requestID]
				eventChan <- ApprovalEvent{
					Type:      "rejected",
					RequestID: requestID,
					Approver:  req.Approver,
					Reason:    req.Reason,
				}
				m.mutex.RUnlock()
				close(eventChan)
				return
			}
			m.mutex.RUnlock()
		}
	}()

	return eventChan
}
