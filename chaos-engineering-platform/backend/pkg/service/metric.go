package service

import (
	"math"
	"math/rand"
	"sync"
	"time"

	"chaos-engineering-platform/pkg/model"

	"github.com/google/uuid"
)

type MetricService struct {
	metrics     map[string]*model.Metric
	thresholds  map[string]*model.MetricThreshold
	checks      map[string]*model.SteadyStateCheck
	violations  map[string]*model.Violation
	metricValues map[string][]*model.MetricValue
	mu          sync.RWMutex
}

func NewMetricService() *MetricService {
	service := &MetricService{
		metrics:       make(map[string]*model.Metric),
		thresholds:    make(map[string]*model.MetricThreshold),
		checks:        make(map[string]*model.SteadyStateCheck),
		violations:    make(map[string]*model.Violation),
		metricValues:  make(map[string][]*model.MetricValue),
	}

	service.initMetrics()
	service.initMockData()

	return service
}

func (s *MetricService) initMetrics() {
	metrics := []*model.Metric{
		{
			ID:               "qps",
			Name:             "qps",
			DisplayName:      "QPS (每秒请求数)",
			Description:      "服务每秒处理的请求数量",
			Unit:             "req/s",
			Category:         "performance",
			DefaultThreshold: 1000,
			DefaultOperator:  ">",
		},
		{
			ID:               "rt_p99",
			Name:             "rt_p99",
			DisplayName:      "P99 响应时间",
			Description:      "99% 请求的最大响应时间",
			Unit:             "ms",
			Category:         "performance",
			DefaultThreshold: 200,
			DefaultOperator:  "<",
		},
		{
			ID:               "rt_avg",
			Name:             "rt_avg",
			DisplayName:      "平均响应时间",
			Description:      "所有请求的平均响应时间",
			Unit:             "ms",
			Category:         "performance",
			DefaultThreshold: 100,
			DefaultOperator:  "<",
		},
		{
			ID:               "error_rate",
			Name:             "error_rate",
			DisplayName:      "错误率",
			Description:      "错误请求占总请求的比例",
			Unit:             "%",
			Category:         "error",
			DefaultThreshold: 1,
			DefaultOperator:  "<",
		},
		{
			ID:               "cpu_usage",
			Name:             "cpu_usage",
			DisplayName:      "CPU 使用率",
			Description:      "容器 CPU 使用率",
			Unit:             "%",
			Category:         "resource",
			DefaultThreshold: 80,
			DefaultOperator:  "<",
		},
		{
			ID:               "memory_usage",
			Name:             "memory_usage",
			DisplayName:      "内存使用率",
			Description:      "容器内存使用率",
			Unit:             "%",
			Category:         "resource",
			DefaultThreshold: 85,
			DefaultOperator:  "<",
		},
		{
			ID:               "pod_ready",
			Name:             "pod_ready",
			DisplayName:      "Pod 就绪率",
			Description:      "Ready 状态 Pod 占总 Pod 的比例",
			Unit:             "%",
			Category:         "availability",
			DefaultThreshold: 100,
			DefaultOperator:  ">=",
		},
		{
			ID:               "service_availability",
			Name:             "service_availability",
			DisplayName:      "服务可用性",
			Description:      "服务健康检查通过率",
			Unit:             "%",
			Category:         "availability",
			DefaultThreshold: 99.9,
			DefaultOperator:  ">=",
		},
	}

	for _, m := range metrics {
		s.metrics[m.ID] = m
	}
}

func (s *MetricService) initMockData() {
	now := time.Now()

	for id, m := range s.metrics {
		values := []*model.MetricValue{}
		for i := 14; i >= 0; i-- {
			timestamp := now.Add(-time.Duration(i) * time.Minute)
			value := m.DefaultThreshold * (0.8 + rand.Float64()*0.4)
			values = append(values, &model.MetricValue{
				MetricID:   id,
				MetricName: m.DisplayName,
				Value:      value,
				Timestamp:  timestamp,
				Unit:       m.Unit,
			})
		}
		s.metricValues[id] = values

		threshold := &model.MetricThreshold{
			ID:          uuid.New().String(),
			MetricID:    m.ID,
			Metric:      *m,
			Name:        m.DisplayName + " 阈值",
			Operator:    m.DefaultOperator,
			Threshold:   m.DefaultThreshold,
			Unit:        m.Unit,
			Enabled:     true,
			CreatedBy:   "admin",
			CreatedAt:   now.Add(-24 * time.Hour).Format(time.RFC3339),
			UpdatedAt:   now.Add(-24 * time.Hour).Format(time.RFC3339),
		}
		s.thresholds[threshold.ID] = threshold
	}
}

func (s *MetricService) ListMetrics() []*model.Metric {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var result []*model.Metric
	for _, m := range s.metrics {
		result = append(result, m)
	}

	return result
}

func (s *MetricService) GetCurrentValues() []*model.MetricValue {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var result []*model.MetricValue
	for _, values := range s.metricValues {
		if len(values) > 0 {
			latest := values[len(values)-1]
			result = append(result, latest)
		}
	}

	return result
}

func (s *MetricService) GetMetricHistory(metricID, startTime, endTime string, step int) *model.MetricHistory {
	s.mu.RLock()
	defer s.mu.RUnlock()

	values, exists := s.metricValues[metricID]
	if !exists {
		return &model.MetricHistory{
			MetricID: metricID,
			Data:     []model.DataPoint{},
		}
	}

	data := []model.DataPoint{}
	var min, max, sum float64
	for i, v := range values {
		data = append(data, model.DataPoint{
			Timestamp: v.Timestamp.Format("15:04"),
			Value:     v.Value,
		})

		if i == 0 {
			min = v.Value
			max = v.Value
		} else {
			min = math.Min(min, v.Value)
			max = math.Max(max, v.Value)
		}
		sum += v.Value
	}

	avg := 0.0
	if len(values) > 0 {
		avg = sum / float64(len(values))
	}

	return &model.MetricHistory{
		MetricID: metricID,
		Data:     data,
		Min:      min,
		Max:      max,
		Avg:      avg,
	}
}

func (s *MetricService) ListThresholds(experimentID string) []*model.MetricThreshold {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var result []*model.MetricThreshold
	for _, t := range s.thresholds {
		result = append(result, t)
	}

	return result
}

func (s *MetricService) CreateThreshold(req *model.MetricThreshold) *model.MetricThreshold {
	s.mu.Lock()
	defer s.mu.Unlock()

	now := time.Now().Format(time.RFC3339)
	threshold := &model.MetricThreshold{
		ID:          req.ID,
		MetricID:    req.MetricID,
		Metric:      req.Metric,
		Name:        req.Name,
		Operator:    req.Operator,
		Threshold:   req.Threshold,
		Unit:        req.Unit,
		Enabled:     req.Enabled,
		CreatedBy:   "admin",
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	s.thresholds[threshold.ID] = threshold

	return threshold
}

func (s *MetricService) UpdateThreshold(id string, req *model.MetricThreshold) (*model.MetricThreshold, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	threshold, exists := s.thresholds[id]
	if !exists {
		return nil, false
	}

	threshold.Name = req.Name
	threshold.Operator = req.Operator
	threshold.Threshold = req.Threshold
	threshold.Enabled = req.Enabled
	threshold.UpdatedAt = time.Now().Format(time.RFC3339)

	return threshold, true
}

func (s *MetricService) DeleteThreshold(id string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, exists := s.thresholds[id]; !exists {
		return false
	}

	delete(s.thresholds, id)

	return true
}

func (s *MetricService) ListChecks(status string) []*model.SteadyStateCheck {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var result []*model.SteadyStateCheck
	for _, c := range s.checks {
		if status == "" || c.Status == status {
			result = append(result, c)
		}
	}

	return result
}

func (s *MetricService) GetCheck(id string) (*model.SteadyStateCheck, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	check, exists := s.checks[id]
	return check, exists
}

func (s *MetricService) CreateCheck(req *model.SteadyStateCheck) *model.SteadyStateCheck {
	s.mu.Lock()
	defer s.mu.Unlock()

	check := &model.SteadyStateCheck{
		ID:             req.ID,
		ExperimentID:   req.ExperimentID,
		ExperimentName: req.ExperimentName,
		Status:         "idle",
		Thresholds:     req.Thresholds,
		Violations:     []model.Violation{},
	}

	s.checks[check.ID] = check

	return check
}

func (s *MetricService) UpdateCheck(id string, req *model.SteadyStateCheck) (*model.SteadyStateCheck, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	check, exists := s.checks[id]
	if !exists {
		return nil, false
	}

	check.Thresholds = req.Thresholds

	return check, true
}

func (s *MetricService) StartCheck(id string) (*model.SteadyStateCheck, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	check, exists := s.checks[id]
	if !exists {
		return nil, false
	}

	now := time.Now().Format(time.RFC3339)
	check.Status = "monitoring"
	check.StartedAt = &now

	return check, true
}

func (s *MetricService) StopCheck(id string) (*model.SteadyStateCheck, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	check, exists := s.checks[id]
	if !exists {
		return nil, false
	}

	check.Status = "idle"

	return check, true
}

func (s *MetricService) ListViolations(checkID string, acknowledged *bool, level string) []*model.Violation {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var result []*model.Violation
	for _, v := range s.violations {
		if checkID != "" && v.CheckID != checkID {
			continue
		}
		if acknowledged != nil && v.Acknowledged != *acknowledged {
			continue
		}
		if level != "" && v.Level != level {
			continue
		}
		result = append(result, v)
	}

	return result
}

func (s *MetricService) AcknowledgeViolation(id string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	violation, exists := s.violations[id]
	if !exists {
		return false
	}

	violation.Acknowledged = true

	return true
}
