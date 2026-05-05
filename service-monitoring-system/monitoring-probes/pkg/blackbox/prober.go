package blackbox

import (
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"strings"
	"time"

	"monitoring-probes/config"

	"github.com/prometheus/client_golang/prometheus"
)

type Prober struct {
	config         config.BlackboxConfig
	stopChan       chan struct{}
	probeSuccess   *prometheus.GaugeVec
	probeDuration  *prometheus.GaugeVec
	probeResults   map[string]ProbeResult
}

type ProbeResult struct {
	Target    string
	Module    string
	Success   bool
	Duration  float64
	Timestamp time.Time
	Error     string
	Status    string
	Details   map[string]interface{}
}

func NewProber(cfg config.BlackboxConfig) *Prober {
	return &Prober{
		config:       cfg,
		stopChan:     make(chan struct{}),
		probeResults: make(map[string]ProbeResult),
		probeSuccess: prometheus.NewGaugeVec(
			prometheus.GaugeOpts{
				Name: "blackbox_probe_success",
				Help: "Blackbox probe success status (1=success, 0=failure)",
			},
			[]string{"target", "module", "name"},
		),
		probeDuration: prometheus.NewGaugeVec(
			prometheus.GaugeOpts{
				Name: "blackbox_probe_duration_seconds",
				Help: "Blackbox probe duration in seconds",
			},
			[]string{"target", "module", "name"},
		),
	}
}

func (p *Prober) Register() {
	prometheus.MustRegister(p.probeSuccess)
	prometheus.MustRegister(p.probeDuration)
}

func (p *Prober) StartProbing() {
	if !p.config.Enabled {
		return
	}

	ticker := time.NewTicker(time.Duration(p.config.ProbeInterval) * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			p.runAllProbes()
		case <-p.stopChan:
			return
		}
	}
}

func (p *Prober) Stop() {
	close(p.stopChan)
}

func (p *Prober) runAllProbes() {
	for _, target := range p.config.Targets {
		module, exists := p.config.Modules[target.Module]
		if !exists {
			module = p.config.Modules["http_2xx"]
		}

		result := p.executeProbe(target.Target, target.Module, module)
		result.Timestamp = time.Now()

		key := fmt.Sprintf("%s_%s", target.Name, target.Module)
		p.probeResults[key] = result

		var successValue float64
		if result.Success {
			successValue = 1.0
		} else {
			successValue = 0.0
		}

		p.probeSuccess.WithLabelValues(target.Target, target.Module, target.Name).Set(successValue)
		p.probeDuration.WithLabelValues(target.Target, target.Module, target.Name).Set(result.Duration)
	}
}

func (p *Prober) executeProbe(target, moduleName string, module config.ModuleConfig) ProbeResult {
	startTime := time.Now()
	result := ProbeResult{
		Target:  target,
		Module:  moduleName,
		Success: false,
		Details: make(map[string]interface{}),
	}

	timeout := time.Duration(module.Timeout) * time.Second
	if timeout == 0 {
		timeout = 10 * time.Second
	}

	switch module.Prober {
	case "http":
		result = p.probeHTTP(target, module.HTTP, timeout)
	case "tcp":
		result = p.probeTCP(target, module.TCP, timeout)
	default:
		result.Error = fmt.Sprintf("unknown prober type: %s", module.Prober)
		result.Status = "unknown"
	}

	result.Duration = time.Since(startTime).Seconds()
	return result
}

func (p *Prober) probeHTTP(target string, httpCfg config.HTTPModuleConfig, timeout time.Duration) ProbeResult {
	result := ProbeResult{
		Target:  target,
		Module:  "http",
		Success: false,
		Details: make(map[string]interface{}),
	}

	client := &http.Client{
		Timeout: timeout,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}

	method := httpCfg.Method
	if method == "" {
		method = "GET"
	}

	req, err := http.NewRequest(method, target, nil)
	if err != nil {
		result.Error = fmt.Sprintf("failed to create request: %v", err)
		result.Status = "error"
		return result
	}

	for key, value := range httpCfg.Headers {
		req.Header.Set(key, value)
	}

	resp, err := client.Do(req)
	if err != nil {
		result.Error = fmt.Sprintf("request failed: %v", err)
		result.Status = "failure"
		return result
	}
	defer resp.Body.Close()

	result.Details["status_code"] = resp.StatusCode
	result.Status = resp.Status

	validStatusCodes := httpCfg.ValidStatusCodes
	if len(validStatusCodes) == 0 {
		validStatusCodes = []int{200, 201, 202, 204}
	}

	for _, code := range validStatusCodes {
		if resp.StatusCode == code {
			result.Success = true
			result.Status = "success"
			return result
		}
	}

	result.Error = fmt.Sprintf("invalid status code: %d", resp.StatusCode)
	return result
}

func (p *Prober) probeTCP(target string, tcpCfg config.TCPModuleConfig, timeout time.Duration) ProbeResult {
	result := ProbeResult{
		Target:  target,
		Module:  "tcp",
		Success: false,
		Details: make(map[string]interface{}),
	}

	conn, err := net.DialTimeout("tcp", target, timeout)
	if err != nil {
		result.Error = fmt.Sprintf("connection failed: %v", err)
		result.Status = "failure"
		return result
	}
	defer conn.Close()

	if len(tcpCfg.QueryResponse) == 0 {
		result.Success = true
		result.Status = "success"
		return result
	}

	conn.SetDeadline(time.Now().Add(timeout))

	for _, qr := range tcpCfg.QueryResponse {
		if qr.Send != "" {
			_, err = conn.Write([]byte(qr.Send))
			if err != nil {
				result.Error = fmt.Sprintf("failed to send data: %v", err)
				result.Status = "failure"
				return result
			}
		}

		if qr.Expect != "" {
			buf := make([]byte, 1024)
			n, err := conn.Read(buf)
			if err != nil {
				result.Error = fmt.Sprintf("failed to read data: %v", err)
				result.Status = "failure"
				return result
			}

			response := string(buf[:n])
			if !strings.Contains(response, qr.Expect) {
				result.Error = fmt.Sprintf("expected response not found: %s", qr.Expect)
				result.Status = "failure"
				return result
			}
		}
	}

	result.Success = true
	result.Status = "success"
	return result
}

func (p *Prober) Probe(target, module string) []byte {
	moduleCfg, exists := p.config.Modules[module]
	if !exists {
		moduleCfg = config.ModuleConfig{
			Prober:  "http",
			Timeout: 10,
		}
	}

	result := p.executeProbe(target, module, moduleCfg)
	result.Timestamp = time.Now()

	jsonData, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		return []byte(`{"error": "failed to marshal result"}`)
	}

	return jsonData
}

func (p *Prober) GetResults() map[string]ProbeResult {
	return p.probeResults
}

func (p *Prober) AddTarget(target config.TargetConfig) {
	p.config.Targets = append(p.config.Targets, target)
}

func (p *Prober) RemoveTarget(name string) {
	newTargets := []config.TargetConfig{}
	for _, t := range p.config.Targets {
		if t.Name != name {
			newTargets = append(newTargets, t)
		}
	}
	p.config.Targets = newTargets
}
