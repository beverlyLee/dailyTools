package records

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	"self-healing-orchestrator/config"
)

type Manager struct {
	config     *config.RecordsConfig
	records    map[string]*FaultRecord
	mutex      sync.RWMutex
	outputDir  string
}

type FaultRecord struct {
	ID            string
	ScenarioID    string
	ScriptID      string
	Status        string
	Severity      string
	StartTime     time.Time
	EndTime       time.Time
	Duration      time.Duration
	TriggerMetric string
	TriggerValue  float64
	Threshold     float64
	ExecutionResult *ExecutionRecord
	ApprovalInfo  *ApprovalRecord
	GrayScaleInfo *GrayScaleRecord
	ErrorMessage  string
	Details       map[string]interface{}
}

type ExecutionRecord struct {
	Success     bool
	ExitCode    int
	Output      string
	Error       string
	Duration    time.Duration
	StartTime   time.Time
	EndTime     time.Time
}

type ApprovalRecord struct {
	Required    bool
	Approved    bool
	Requester   string
	Approver    string
	RequestTime time.Time
	ApprovalTime time.Duration
	Reason      string
}

type GrayScaleRecord struct {
	Enabled       bool
	Percentage    int
	TotalInstances int
	RolledOut     int
	Failed        int
	RolloutGroups []string
}

func NewManager(cfg *config.RecordsConfig) *Manager {
	outputDir := os.Getenv("RECORDS_OUTPUT_DIR")
	if outputDir == "" {
		outputDir = "./records"
	}

	os.MkdirAll(outputDir, 0755)

	return &Manager{
		config:    cfg,
		records:   make(map[string]*FaultRecord),
		outputDir: outputDir,
	}
}

func (m *Manager) CreateRecord(scenarioID, scriptID, severity, triggerMetric string, triggerValue, threshold float64) (*FaultRecord, error) {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	recordID := generateRecordID()

	record := &FaultRecord{
		ID:            recordID,
		ScenarioID:    scenarioID,
		ScriptID:      scriptID,
		Status:        "detected",
		Severity:      severity,
		StartTime:     time.Now(),
		TriggerMetric: triggerMetric,
		TriggerValue:  triggerValue,
		Threshold:     threshold,
		Details:       make(map[string]interface{}),
	}

	m.records[recordID] = record

	if err := m.saveRecord(record); err != nil {
		return nil, err
	}

	m.cleanupOldRecords()

	return record, nil
}

func (m *Manager) UpdateStatus(recordID, status string) error {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	record, exists := m.records[recordID]
	if !exists {
		return fmt.Errorf("record not found: %s", recordID)
	}

	record.Status = status
	if status == "completed" || status == "failed" || status == "rejected" || status == "cancelled" {
		record.EndTime = time.Now()
		record.Duration = record.EndTime.Sub(record.StartTime)
	}

	return m.saveRecord(record)
}

func (m *Manager) SetExecutionResult(recordID string, result *ExecutionRecord) error {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	record, exists := m.records[recordID]
	if !exists {
		return fmt.Errorf("record not found: %s", recordID)
	}

	record.ExecutionResult = result

	if result.Success {
		record.Status = "executed"
	} else {
		record.Status = "failed"
		record.ErrorMessage = result.Error
	}

	return m.saveRecord(record)
}

func (m *Manager) SetApprovalInfo(recordID string, info *ApprovalRecord) error {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	record, exists := m.records[recordID]
	if !exists {
		return fmt.Errorf("record not found: %s", recordID)
	}

	record.ApprovalInfo = info

	if info.Required {
		if info.Approved {
			record.Status = "approved"
		} else {
			record.Status = "rejected"
		}
	}

	return m.saveRecord(record)
}

func (m *Manager) SetGrayScaleInfo(recordID string, info *GrayScaleRecord) error {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	record, exists := m.records[recordID]
	if !exists {
		return fmt.Errorf("record not found: %s", recordID)
	}

	record.GrayScaleInfo = info
	return m.saveRecord(record)
}

func (m *Manager) AddDetail(recordID, key string, value interface{}) error {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	record, exists := m.records[recordID]
	if !exists {
		return fmt.Errorf("record not found: %s", recordID)
	}

	record.Details[key] = value
	return m.saveRecord(record)
}

func (m *Manager) GetRecord(recordID string) (*FaultRecord, bool) {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	record, exists := m.records[recordID]
	return record, exists
}

func (m *Manager) GetAllRecords() []*FaultRecord {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	records := make([]*FaultRecord, 0, len(m.records))
	for _, record := range m.records {
		records = append(records, record)
	}
	return records
}

func (m *Manager) GetRecordsByStatus(status string) []*FaultRecord {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	var records []*FaultRecord
	for _, record := range m.records {
		if record.Status == status {
			records = append(records, record)
		}
	}
	return records
}

func (m *Manager) GetRecordsByScenario(scenarioID string) []*FaultRecord {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	var records []*FaultRecord
	for _, record := range m.records {
		if record.ScenarioID == scenarioID {
			records = append(records, record)
		}
	}
	return records
}

func (m *Manager) GetRecordsBySeverity(severity string) []*FaultRecord {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	var records []*FaultRecord
	for _, record := range m.records {
		if record.Severity == severity {
			records = append(records, record)
		}
	}
	return records
}

func (m *Manager) GetRecordsByTimeRange(start, end time.Time) []*FaultRecord {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	var records []*FaultRecord
	for _, record := range m.records {
		if record.StartTime.After(start) && record.StartTime.Before(end) {
			records = append(records, record)
		}
	}
	return records
}

func (m *Manager) saveRecord(record *FaultRecord) error {
	filename := fmt.Sprintf("%s.%s", record.ID, m.config.OutputFormat)
	filepath := filepath.Join(m.outputDir, filename)

	data, err := m.serializeRecord(record)
	if err != nil {
		return err
	}

	return os.WriteFile(filepath, data, 0644)
}

func (m *Manager) serializeRecord(record *FaultRecord) ([]byte, error) {
	switch m.config.OutputFormat {
	case "json":
		return json.MarshalIndent(record, "", "  ")
	default:
		return json.MarshalIndent(record, "", "  ")
	}
}

func (m *Manager) cleanupOldRecords() {
	if len(m.records) <= m.config.MaxRecords {
		return
	}

	var sortedRecords []*FaultRecord
	for _, record := range m.records {
		sortedRecords = append(sortedRecords, record)
	}

	for i := 0; i < len(sortedRecords); i++ {
		for j := i + 1; j < len(sortedRecords); j++ {
			if sortedRecords[i].StartTime.After(sortedRecords[j].StartTime) {
				sortedRecords[i], sortedRecords[j] = sortedRecords[j], sortedRecords[i]
			}
		}
	}

	for i := m.config.MaxRecords; i < len(sortedRecords); i++ {
		delete(m.records, sortedRecords[i].ID)
	}
}

func (m *Manager) GetStats() map[string]interface{} {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	stats := map[string]interface{}{
		"total_records":     len(m.records),
		"max_records":       m.config.MaxRecords,
		"retention_days":    m.config.RetentionDays,
		"output_format":     m.config.OutputFormat,
		"output_directory":  m.outputDir,
	}

	statusCounts := make(map[string]int)
	severityCounts := make(map[string]int)
	scenarioCounts := make(map[string]int)

	for _, record := range m.records {
		statusCounts[record.Status]++
		severityCounts[record.Severity]++
		scenarioCounts[record.ScenarioID]++
	}

	stats["status_counts"] = statusCounts
	stats["severity_counts"] = severityCounts
	stats["scenario_counts"] = scenarioCounts

	return stats
}

func generateRecordID() string {
	return fmt.Sprintf("fault_%d", time.Now().UnixNano())
}
