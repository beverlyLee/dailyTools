package monitoring

import (
	"net"
	"net/http"
	"time"

	"service-monitoring-system/pkg/config"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

type Service struct {
	config          *config.Config
	cpuUsage        prometheus.Gauge
	memoryUsage     prometheus.Gauge
	serviceStatus   *prometheus.GaugeVec
	httpProbeStatus *prometheus.GaugeVec
	tcpProbeStatus  *prometheus.GaugeVec
}

func NewService(cfg *config.Config) *Service {
	s := &Service{
		config: cfg,
		cpuUsage: prometheus.NewGauge(prometheus.GaugeOpts{
			Name: "system_cpu_usage_percent",
			Help: "Current CPU usage percentage",
		}),
		memoryUsage: prometheus.NewGauge(prometheus.GaugeOpts{
			Name: "system_memory_usage_percent",
			Help: "Current memory usage percentage",
		}),
		serviceStatus: prometheus.NewGaugeVec(
			prometheus.GaugeOpts{
				Name: "service_status",
				Help: "Status of monitored services",
			},
			[]string{"service_name"},
		),
		httpProbeStatus: prometheus.NewGaugeVec(
			prometheus.GaugeOpts{
				Name: "http_probe_status",
				Help: "Status of HTTP blackbox probes",
			},
			[]string{"target_name", "url"},
		),
		tcpProbeStatus: prometheus.NewGaugeVec(
			prometheus.GaugeOpts{
				Name: "tcp_probe_status",
				Help: "Status of TCP blackbox probes",
			},
			[]string{"target_name", "address"},
		),
	}

	prometheus.MustRegister(s.cpuUsage)
	prometheus.MustRegister(s.memoryUsage)
	prometheus.MustRegister(s.serviceStatus)
	prometheus.MustRegister(s.httpProbeStatus)
	prometheus.MustRegister(s.tcpProbeStatus)

	go s.startMetricsCollection()
	go s.startBlackboxProbes()

	return s
}

func (s *Service) startMetricsCollection() {
	ticker := time.NewTicker(time.Duration(s.config.Monitoring.ScrapeInterval) * time.Second)
	defer ticker.Stop()

	for range ticker.Collect() {
		s.collectSystemMetrics()
	}
}

func (s *Service) collectSystemMetrics() {
	s.cpuUsage.Set(45.5)
	s.memoryUsage.Set(60.2)
}

func (s *Service) startBlackboxProbes() {
	ticker := time.NewTicker(time.Duration(s.config.Monitoring.ScrapeInterval) * time.Second)
	defer ticker.Stop()

	for range ticker.Collect() {
		s.runBlackboxProbes()
	}
}

func (s *Service) runBlackboxProbes() {
	for _, target := range s.config.Monitoring.BlackboxTargets {
		if target.Type == "http" {
			s.runHTTPProbe(target)
		} else if target.Type == "tcp" {
			s.runTCPProbe(target)
		}
	}
}

func (s *Service) runHTTPProbe(target config.BlackboxTarget) {
	resp, err := http.Get(target.URL)
	if err != nil {
		s.httpProbeStatus.WithLabelValues(target.Name, target.URL).Set(0)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		s.httpProbeStatus.WithLabelValues(target.Name, target.URL).Set(1)
	} else {
		s.httpProbeStatus.WithLabelValues(target.Name, target.URL).Set(0)
	}
}

func (s *Service) runTCPProbe(target config.BlackboxTarget) {
	conn, err := net.DialTimeout("tcp", target.URL, 5*time.Second)
	if err != nil {
		s.tcpProbeStatus.WithLabelValues(target.Name, target.URL).Set(0)
		return
	}
	defer conn.Close()
	s.tcpProbeStatus.WithLabelValues(target.Name, target.URL).Set(1)
}

func (s *Service) MetricsHandler() http.Handler {
	return promhttp.Handler()
}

func (s *Service) GetMetrics() map[string]interface{} {
	return map[string]interface{}{
		"cpu_usage":    45.5,
		"memory_usage": 60.2,
		"services": []map[string]interface{}{
			{"name": "api-gateway", "status": "healthy"},
			{"name": "user-service", "status": "healthy"},
			{"name": "order-service", "status": "warning"},
		},
		"probes": []map[string]interface{}{
			{"name": "example-http", "type": "http", "status": "healthy"},
			{"name": "example-tcp", "type": "tcp", "status": "healthy"},
		},
	}
}

func (s *Service) UpdateServiceStatus(serviceName string, status float64) {
	s.serviceStatus.WithLabelValues(serviceName).Set(status)
}

func (s *Service) GetBlackboxTargets() []config.BlackboxTarget {
	return s.config.Monitoring.BlackboxTargets
}
