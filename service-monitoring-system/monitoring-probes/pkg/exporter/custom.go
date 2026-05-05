package exporter

import (
	"math/rand"
	"time"

	"monitoring-probes/config"

	"github.com/prometheus/client_golang/prometheus"
)

type CustomExporter struct {
	config          config.ExporterConfig
	stopChan        chan struct{}
	metrics         map[string]interface{}
	counters        map[string]*prometheus.CounterVec
	gauges          map[string]*prometheus.GaugeVec
	histograms      map[string]*prometheus.HistogramVec
	summaries       map[string]*prometheus.SummaryVec
}

func NewCustomExporter(cfg config.ExporterConfig) *CustomExporter {
	return &CustomExporter{
		config:     cfg,
		stopChan:   make(chan struct{}),
		metrics:    make(map[string]interface{}),
		counters:   make(map[string]*prometheus.CounterVec),
		gauges:     make(map[string]*prometheus.GaugeVec),
		histograms: make(map[string]*prometheus.HistogramVec),
		summaries:  make(map[string]*prometheus.SummaryVec),
	}
}

func (e *CustomExporter) Register() {
	for _, metricCfg := range e.config.Metrics {
		switch metricCfg.Type {
		case "counter":
			e.counters[metricCfg.Name] = prometheus.NewCounterVec(
				prometheus.CounterOpts{
					Name: metricCfg.Name,
					Help: metricCfg.Description,
				},
				metricCfg.Labels,
			)
			prometheus.MustRegister(e.counters[metricCfg.Name])

		case "gauge":
			e.gauges[metricCfg.Name] = prometheus.NewGaugeVec(
				prometheus.GaugeOpts{
					Name: metricCfg.Name,
					Help: metricCfg.Description,
				},
				metricCfg.Labels,
			)
			prometheus.MustRegister(e.gauges[metricCfg.Name])

		case "histogram":
			e.histograms[metricCfg.Name] = prometheus.NewHistogramVec(
				prometheus.HistogramOpts{
					Name:    metricCfg.Name,
					Help:    metricCfg.Description,
					Buckets: prometheus.DefBuckets,
				},
				metricCfg.Labels,
			)
			prometheus.MustRegister(e.histograms[metricCfg.Name])

		case "summary":
			e.summaries[metricCfg.Name] = prometheus.NewSummaryVec(
				prometheus.SummaryOpts{
					Name:       metricCfg.Name,
					Help:       metricCfg.Description,
					Objectives: map[float64]float64{0.5: 0.05, 0.9: 0.01, 0.99: 0.001},
				},
				metricCfg.Labels,
			)
			prometheus.MustRegister(e.summaries[metricCfg.Name])
		}
	}
}

func (e *CustomExporter) StartCollection() {
	if !e.config.Enabled {
		return
	}

	ticker := time.NewTicker(time.Duration(e.config.CollectInterval) * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			e.collectBusinessMetrics()
		case <-e.stopChan:
			return
		}
	}
}

func (e *CustomExporter) Stop() {
	close(e.stopChan)
}

func (e *CustomExporter) collectBusinessMetrics() {
	services := []string{"api-gateway", "user-service", "order-service", "payment-service"}
	endpoints := []string{"/api/users", "/api/orders", "/api/payments", "/api/health"}

	for _, service := range services {
		if counter, exists := e.counters["business_transactions_total"]; exists {
			for _, status := range []string{"success", "error"} {
				value := rand.Float64() * 100
				if status == "error" {
					value = value * 0.1
				}
				counter.WithLabelValues(service, status).Add(value)
			}
		}

		if gauge, exists := e.gauges["business_active_users"]; exists {
			activeUsers := rand.Float64() * 1000
			gauge.WithLabelValues(service).Set(activeUsers)
		}

		if histogram, exists := e.histograms["business_response_time_seconds"]; exists {
			for _, endpoint := range endpoints {
				responseTime := rand.Float64() * 0.5
				histogram.WithLabelValues(service, endpoint).Observe(responseTime)
			}
		}
	}
}

func (e *CustomExporter) RecordTransaction(service, status string) {
	if counter, exists := e.counters["business_transactions_total"]; exists {
		counter.WithLabelValues(service, status).Inc()
	}
}

func (e *CustomExporter) RecordResponseTime(service, endpoint string, duration float64) {
	if histogram, exists := e.histograms["business_response_time_seconds"]; exists {
		histogram.WithLabelValues(service, endpoint).Observe(duration)
	}
}

func (e *CustomExporter) SetActiveUsers(service string, count float64) {
	if gauge, exists := e.gauges["business_active_users"]; exists {
		gauge.WithLabelValues(service).Set(count)
	}
}

func (e *CustomExporter) IncrementActiveUsers(service string) {
	if gauge, exists := e.gauges["business_active_users"]; exists {
		gauge.WithLabelValues(service).Inc()
	}
}

func (e *CustomExporter) DecrementActiveUsers(service string) {
	if gauge, exists := e.gauges["business_active_users"]; exists {
		gauge.WithLabelValues(service).Dec()
	}
}
