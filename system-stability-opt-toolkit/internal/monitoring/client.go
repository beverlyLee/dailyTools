package monitoring

import (
	"context"
	"fmt"
	"log"
	"math"
	"sort"
	"time"

	"github.com/prometheus/client_golang/api"
	v1 "github.com/prometheus/client_golang/api/prometheus/v1"
	"github.com/prometheus/common/model"
)

type Client struct {
	config         *Config
	promAPI        v1.API
	defaultQueries *MetricQueries
}

func NewClient(config *Config) (*Client, error) {
	client := &Client{
		config:         config,
		defaultQueries: config.DefaultQueries,
	}

	if client.defaultQueries == nil {
		client.defaultQueries = getDefaultQueries(config.Namespace, config.ServiceName)
	}

	if config.Type == MetricsTypePrometheus && config.Prometheus != nil {
		promClient, err := api.NewClient(api.Config{
			Address: config.Prometheus.Address,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to create Prometheus client: %w", err)
		}
		client.promAPI = v1.NewAPI(promClient)
	}

	return client, nil
}

func getDefaultQueries(namespace, serviceName string) *MetricQueries {
	namespaceSelector := ""
	if namespace != "" {
		namespaceSelector = fmt.Sprintf(", namespace=\"%s\"", namespace)
	}

	serviceSelector := ""
	if serviceName != "" {
		serviceSelector = fmt.Sprintf(", service=\"%s\"", serviceName)
	}

	return &MetricQueries{
		QPS: MetricQuery{
			Name:        "QPS",
			Query:       fmt.Sprintf("sum(rate(http_requests_total{job=\"%s\"%s%s}[1m]))", serviceName, namespaceSelector, serviceSelector),
			Description: "Queries per second",
			Unit:        "req/s",
		},
		LatencyP50: MetricQuery{
			Name:        "Latency P50",
			Query:       fmt.Sprintf("histogram_quantile(0.5, sum(rate(http_request_duration_seconds_bucket{job=\"%s\"%s%s}[1m])) by (le))", serviceName, namespaceSelector, serviceSelector),
			Description: "50th percentile latency",
			Unit:        "ms",
		},
		LatencyP95: MetricQuery{
			Name:        "Latency P95",
			Query:       fmt.Sprintf("histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{job=\"%s\"%s%s}[1m])) by (le))", serviceName, namespaceSelector, serviceSelector),
			Description: "95th percentile latency",
			Unit:        "ms",
		},
		LatencyP99: MetricQuery{
			Name:        "Latency P99",
			Query:       fmt.Sprintf("histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket{job=\"%s\"%s%s}[1m])) by (le))", serviceName, namespaceSelector, serviceSelector),
			Description: "99th percentile latency",
			Unit:        "ms",
		},
		ErrorRate: MetricQuery{
			Name:        "Error Rate",
			Query:       fmt.Sprintf("sum(rate(http_requests_total{job=\"%s\", status_code=~\"5..\"%s%s}[1m])) / sum(rate(http_requests_total{job=\"%s\"%s%s}[1m]))", serviceName, namespaceSelector, serviceSelector, serviceName, namespaceSelector, serviceSelector),
			Description: "Error rate (5xx responses)",
			Unit:        "%",
		},
	}
}

func (c *Client) CollectMetrics(ctx context.Context, duration time.Duration) (MetricsSnapshot, error) {
	log.Printf("Collecting metrics for duration: %v", duration)

	switch c.config.Type {
	case MetricsTypePrometheus:
		return c.collectFromPrometheus(ctx, duration)
	case MetricsTypeCustom:
		return c.collectFromCustom(ctx, duration)
	default:
		return c.simulateMetrics(duration)
	}
}

func (c *Client) collectFromPrometheus(ctx context.Context, duration time.Duration) (MetricsSnapshot, error) {
	if c.promAPI == nil {
		return MetricsSnapshot{}, fmt.Errorf("Prometheus client not initialized")
	}

	snapshot := MetricsSnapshot{
		Timestamp: time.Now(),
	}

	queries := map[string]MetricQuery{
		"qps":       c.defaultQueries.QPS,
		"p50":       c.defaultQueries.LatencyP50,
		"p95":       c.defaultQueries.LatencyP95,
		"p99":       c.defaultQueries.LatencyP99,
		"errorRate": c.defaultQueries.ErrorRate,
	}

	results := make(map[string]float64)
	
	for key, query := range queries {
		val, err := c.queryPrometheus(ctx, query.Query)
		if err != nil {
			log.Printf("Warning: failed to query %s: %v", key, err)
			results[key] = 0
			continue
		}
		results[key] = val
	}

	snapshot.QPS = results["qps"]
	snapshot.LatencyP50 = results["p50"] * 1000
	snapshot.LatencyP95 = results["p95"] * 1000
	snapshot.LatencyP99 = results["p99"] * 1000
	snapshot.ErrorRate = results["errorRate"]

	return snapshot, nil
}

func (c *Client) queryPrometheus(ctx context.Context, query string) (float64, error) {
	result, warnings, err := c.promAPI.Query(ctx, query, time.Now())
	if err != nil {
		return 0, fmt.Errorf("query failed: %w", err)
	}
	
	if len(warnings) > 0 {
		log.Printf("Query warnings: %v", warnings)
	}

	vec, ok := result.(model.Vector)
	if !ok {
		return 0, fmt.Errorf("unexpected result type: %T", result)
	}

	if len(vec) == 0 {
		return 0, nil
	}

	return float64(vec[0].Value), nil
}

func (c *Client) collectFromCustom(ctx context.Context, duration time.Duration) (MetricsSnapshot, error) {
	log.Printf("Collecting metrics from custom endpoint for duration: %v", duration)
	return c.simulateMetrics(duration)
}

func (c *Client) simulateMetrics(duration time.Duration) (MetricsSnapshot, error) {
	snapshot := MetricsSnapshot{
		Timestamp: time.Now(),
		QPS:        1000 + float64(time.Now().Nanosecond()%1000),
		LatencyP50: 50 + float64(time.Now().Nanosecond()%50),
		LatencyP95: 150 + float64(time.Now().Nanosecond()%100),
		LatencyP99: 300 + float64(time.Now().Nanosecond()%200),
		ErrorRate:  0.01 + float64(time.Now().Nanosecond()%100)/10000,
	}

	log.Printf("Simulated metrics: QPS=%.2f, P50=%.2fms, P95=%.2fms, P99=%.2fms, ErrorRate=%.4f",
		snapshot.QPS, snapshot.LatencyP50, snapshot.LatencyP95, snapshot.LatencyP99, snapshot.ErrorRate)

	return snapshot, nil
}

func (c *Client) CollectMetricsPeriodically(ctx context.Context, interval time.Duration, totalDuration time.Duration) ([]MetricsSnapshot, error) {
	log.Printf("Collecting metrics periodically: interval=%v, totalDuration=%v", interval, totalDuration)

	var snapshots []MetricsSnapshot
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	endTime := time.Now().Add(totalDuration)

	for {
		select {
		case <-ctx.Done():
			log.Printf("Metrics collection cancelled")
			return snapshots, ctx.Err()
		case <-ticker.C:
			if time.Now().After(endTime) {
				log.Printf("Metrics collection completed")
				return snapshots, nil
			}

			snapshot, err := c.CollectMetrics(ctx, interval)
			if err != nil {
				log.Printf("Warning: failed to collect metrics: %v", err)
				continue
			}

			snapshots = append(snapshots, snapshot)
			log.Printf("Collected metrics snapshot #%d", len(snapshots))
		}
	}
}

func CalculateStats(values []float64) MetricsStats {
	if len(values) == 0 {
		return MetricsStats{}
	}

	sorted := make([]float64, len(values))
	copy(sorted, values)
	sort.Float64s(sorted)

	var sum float64
	for _, v := range values {
		sum += v
	}

	avg := sum / float64(len(values))

	var variance float64
	for _, v := range values {
		diff := v - avg
		variance += diff * diff
	}
	variance /= float64(len(values))
	stdDev := math.Sqrt(variance)

	return MetricsStats{
		Min:    sorted[0],
		Max:    sorted[len(sorted)-1],
		Avg:    avg,
		P50:    percentile(sorted, 0.5),
		P95:    percentile(sorted, 0.95),
		P99:    percentile(sorted, 0.99),
		StdDev: stdDev,
	}
}

func percentile(sorted []float64, p float64) float64 {
	if len(sorted) == 0 {
		return 0
	}
	if len(sorted) == 1 {
		return sorted[0]
	}

	index := float64(len(sorted)-1) * p
	lower := int(math.Floor(index))
	upper := int(math.Ceil(index))

	if lower == upper {
		return sorted[lower]
	}

	weight := index - float64(lower)
	return sorted[lower]*(1-weight) + sorted[upper]*weight
}

func (c *Client) GetDefaultQueries() *MetricQueries {
	return c.defaultQueries
}

func (c *Client) SetCustomQueries(queries *MetricQueries) {
	c.defaultQueries = queries
}
