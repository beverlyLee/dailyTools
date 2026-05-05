package scenarios

import (
	"sync"
	"time"

	"self-healing-orchestrator/config"
)

type Manager struct {
	config    *config.ScenariosConfig
	scenarios map[string]*config.ScenarioDefinition
	mutex     sync.RWMutex
}

type ScenarioInstance struct {
	Definition   *config.ScenarioDefinition
	Active       bool
	TriggerCount int
	LastTrigger  time.Time
	CooldownEnd  time.Time
}

func NewManager(cfg *config.ScenariosConfig) *Manager {
	m := &Manager{
		config:    cfg,
		scenarios: make(map[string]*config.ScenarioDefinition),
	}

	for i := range cfg.Definitions {
		m.scenarios[cfg.Definitions[i].ID] = &cfg.Definitions[i]
	}

	return m
}

func (m *Manager) GetAll() []config.ScenarioDefinition {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	scenarios := make([]config.ScenarioDefinition, 0, len(m.scenarios))
	for _, s := range m.scenarios {
		scenarios = append(scenarios, *s)
	}
	return scenarios
}

func (m *Manager) GetByID(id string) (*config.ScenarioDefinition, bool) {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	scenario, exists := m.scenarios[id]
	return scenario, exists
}

func (m *Manager) Add(scenario config.ScenarioDefinition) {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	m.scenarios[scenario.ID] = &scenario
}

func (m *Manager) Remove(id string) {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	delete(m.scenarios, id)
}

func (m *Manager) Update(id string, scenario config.ScenarioDefinition) bool {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	if _, exists := m.scenarios[id]; exists {
		m.scenarios[id] = &scenario
		return true
	}
	return false
}

func (m *Manager) EvaluateConditions(metrics map[string]float64) []*config.ScenarioDefinition {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	var triggered []*config.ScenarioDefinition

	for _, scenario := range m.scenarios {
		if m.evaluateScenario(scenario, metrics) {
			triggered = append(triggered, scenario)
		}
	}

	return triggered
}

func (m *Manager) evaluateScenario(scenario *config.ScenarioDefinition, metrics map[string]float64) bool {
	if len(scenario.Conditions) == 0 {
		return false
	}

	for _, condition := range scenario.Conditions {
		metricValue, exists := metrics[condition.Metric]
		if !exists {
			continue
		}

		if !m.evaluateCondition(condition, metricValue) {
			return false
		}
	}

	return true
}

func (m *Manager) evaluateCondition(condition config.Condition, value float64) bool {
	switch condition.Operator {
	case ">":
		return value > condition.Value
	case ">=":
		return value >= condition.Value
	case "<":
		return value < condition.Value
	case "<=":
		return value <= condition.Value
	case "==":
		return value == condition.Value
	case "!=":
		return value != condition.Value
	default:
		return false
	}
}

func (m *Manager) GetSeverityScenarios(severity string) []*config.ScenarioDefinition {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	var scenarios []*config.ScenarioDefinition
	for _, s := range m.scenarios {
		if s.Severity == severity {
			scenarios = append(scenarios, s)
		}
	}
	return scenarios
}

func (m *Manager) GetAutoRecoverScenarios() []*config.ScenarioDefinition {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	var scenarios []*config.ScenarioDefinition
	for _, s := range m.scenarios {
		if s.AutoRecover {
			scenarios = append(scenarios, s)
		}
	}
	return scenarios
}

func (m *Manager) GetScenariosByScript(scriptID string) []*config.ScenarioDefinition {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	var scenarios []*config.ScenarioDefinition
	for _, s := range m.scenarios {
		if s.ScriptID == scriptID {
			scenarios = append(scenarios, s)
		}
	}
	return scenarios
}
