package stress

import (
	"sort"
	"sync"
	"time"
)

type RequestResult struct {
	StartTime   time.Time
	EndTime     time.Time
	Duration    time.Duration
	StatusCode  int
	Error       error
	BytesRead   int64
}

type Statistics struct {
	mu              sync.RWMutex
	results         []RequestResult
	startTime       time.Time
	totalRequests   int64
	successRequests int64
	errorRequests   int64
	totalBytes      int64
	latencies       []float64
}

func NewStatistics() *Statistics {
	return &Statistics{
		results:   make([]RequestResult, 0),
		latencies: make([]float64, 0),
		startTime: time.Now(),
	}
}

func (s *Statistics) RecordResult(result RequestResult) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.results = append(s.results, result)
	s.totalRequests++
	s.totalBytes += result.BytesRead

	if result.Error != nil || (result.StatusCode >= 400 && result.StatusCode != 0) {
		s.errorRequests++
	} else {
		s.successRequests++
	}

	s.latencies = append(s.latencies, float64(result.Duration.Milliseconds()))
}

func (s *Statistics) GetQPS() float64 {
	s.mu.RLock()
	defer s.mu.RUnlock()

	elapsed := time.Since(s.startTime).Seconds()
	if elapsed <= 0 {
		return 0
	}
	return float64(s.totalRequests) / elapsed
}

func (s *Statistics) GetErrorRate() float64 {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if s.totalRequests == 0 {
		return 0
	}
	return float64(s.errorRequests) / float64(s.totalRequests) * 100
}

func (s *Statistics) GetLatencyPercentile(percentile float64) float64 {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if len(s.latencies) == 0 {
		return 0
	}

	sorted := make([]float64, len(s.latencies))
	copy(sorted, s.latencies)
	sort.Float64s(sorted)

	index := int(float64(len(sorted)-1) * percentile / 100)
	if index < 0 {
		index = 0
	}
	if index >= len(sorted) {
		index = len(sorted) - 1
	}

	return sorted[index]
}

func (s *Statistics) GetAverageLatency() float64 {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if len(s.latencies) == 0 {
		return 0
	}

	var total float64
	for _, lat := range s.latencies {
		total += lat
	}
	return total / float64(len(s.latencies))
}

func (s *Statistics) GetMinLatency() float64 {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if len(s.latencies) == 0 {
		return 0
	}

	min := s.latencies[0]
	for _, lat := range s.latencies {
		if lat < min {
			min = lat
		}
	}
	return min
}

func (s *Statistics) GetMaxLatency() float64 {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if len(s.latencies) == 0 {
		return 0
	}

	max := s.latencies[0]
	for _, lat := range s.latencies {
		if lat > max {
			max = lat
		}
	}
	return max
}

func (s *Statistics) GetTotalRequests() int64 {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.totalRequests
}

func (s *Statistics) GetSuccessRequests() int64 {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.successRequests
}

func (s *Statistics) GetErrorRequests() int64 {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.errorRequests
}

func (s *Statistics) GetTotalBytes() int64 {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.totalBytes
}

func (s *Statistics) GetThroughput() float64 {
	s.mu.RLock()
	defer s.mu.RUnlock()

	elapsed := time.Since(s.startTime).Seconds()
	if elapsed <= 0 {
		return 0
	}
	return float64(s.totalBytes) / elapsed / 1024
}

func (s *Statistics) GetStatusCodes() map[int]int64 {
	s.mu.RLock()
	defer s.mu.RUnlock()

	statusCodes := make(map[int]int64)
	for _, result := range s.results {
		if result.StatusCode != 0 {
			statusCodes[result.StatusCode]++
		}
	}
	return statusCodes
}
