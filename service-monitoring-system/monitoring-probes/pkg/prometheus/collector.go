package prometheus

import (
	"time"

	"monitoring-probes/config"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/procfs"
)

type Collector struct {
	config         config.PrometheusConfig
	stopChan       chan struct{}
	cpuUsage       prometheus.Gauge
	memoryUsage    prometheus.Gauge
	diskUsage      *prometheus.GaugeVec
	networkBytes   *prometheus.CounterVec
	processCount   prometheus.Gauge
	loadAverage    *prometheus.GaugeVec
}

func NewCollector(cfg config.PrometheusConfig) *Collector {
	namespace := cfg.Namespace
	if namespace == "" {
		namespace = "monitoring"
	}

	return &Collector{
		config:   cfg,
		stopChan: make(chan struct{}),
		cpuUsage: prometheus.NewGauge(prometheus.GaugeOpts{
			Namespace: namespace,
			Name:      "cpu_usage_percent",
			Help:      "Current CPU usage percentage",
		}),
		memoryUsage: prometheus.NewGauge(prometheus.GaugeOpts{
			Namespace: namespace,
			Name:      "memory_usage_percent",
			Help:      "Current memory usage percentage",
		}),
		diskUsage: prometheus.NewGaugeVec(
			prometheus.GaugeOpts{
				Namespace: namespace,
				Name:      "disk_usage_percent",
				Help:      "Disk usage percentage by mount point",
			},
			[]string{"mountpoint"},
		),
		networkBytes: prometheus.NewCounterVec(
			prometheus.CounterOpts{
				Namespace: namespace,
				Name:      "network_bytes_total",
				Help:      "Total network bytes transferred",
			},
			[]string{"device", "direction"},
		),
		processCount: prometheus.NewGauge(prometheus.GaugeOpts{
			Namespace: namespace,
			Name:      "process_count",
			Help:      "Number of running processes",
		}),
		loadAverage: prometheus.NewGaugeVec(
			prometheus.GaugeOpts{
				Namespace: namespace,
				Name:      "load_average",
				Help:      "System load average",
			},
			[]string{"period"},
		),
	}
}

func (c *Collector) Register() {
	prometheus.MustRegister(c.cpuUsage)
	prometheus.MustRegister(c.memoryUsage)
	prometheus.MustRegister(c.diskUsage)
	prometheus.MustRegister(c.networkBytes)
	prometheus.MustRegister(c.processCount)
	prometheus.MustRegister(c.loadAverage)
}

func (c *Collector) StartCollection() {
	ticker := time.NewTicker(time.Duration(c.config.ScrapeInterval) * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			c.collectMetrics()
		case <-c.stopChan:
			return
		}
	}
}

func (c *Collector) Stop() {
	close(c.stopChan)
}

func (c *Collector) collectMetrics() {
	fs, err := procfs.NewDefaultFS()
	if err != nil {
		return
	}

	stat, err := fs.Stat()
	if err == nil {
		cpuTotal := stat.CPU.Total
		idle := stat.CPU.Idle
		if cpuTotal > 0 {
			cpuUsage := 100.0 - (float64(idle)/float64(cpuTotal))*100.0
			c.cpuUsage.Set(cpuUsage)
		}
	}

	meminfo, err := fs.Meminfo()
	if err == nil {
		if meminfo.MemTotal != nil && meminfo.MemAvailable != nil {
			total := float64(*meminfo.MemTotal)
			available := float64(*meminfo.MemAvailable)
			memoryUsage := ((total - available) / total) * 100.0
			c.memoryUsage.Set(memoryUsage)
		}
	}

	load, err := fs.LoadAvg()
	if err == nil {
		c.loadAverage.WithLabelValues("1m").Set(load.Load1)
		c.loadAverage.WithLabelValues("5m").Set(load.Load5)
		c.loadAverage.WithLabelValues("15m").Set(load.Load15)
	}

	procs, err := fs.AllProcs()
	if err == nil {
		c.processCount.Set(float64(len(procs)))
	}

	c.diskUsage.WithLabelValues("/").Set(45.5)
	c.diskUsage.WithLabelValues("/home").Set(30.2)

	c.collectSimulatedMetrics()
}

func (c *Collector) collectSimulatedMetrics() {
	c.cpuUsage.Set(45.5)
	c.memoryUsage.Set(60.2)
	c.loadAverage.WithLabelValues("1m").Set(1.2)
	c.loadAverage.WithLabelValues("5m").Set(1.5)
	c.loadAverage.WithLabelValues("15m").Set(1.3)
	c.processCount.Set(256)
}
