package detector

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/security-monitoring-toolkit/internal/common"
)

type Detector struct {
	config        *DetectorConfig
	parser        *LogParser
	patterns      map[string]*patternInfo
	errorWindow   *slidingWindow
	stats         *DetectorStats
	startTime     time.Time
	alertHandlers []AlertHandler
	mu            sync.RWMutex
}

type patternInfo struct {
	Template      string
	Occurrences   int
	FirstSeen     time.Time
	LastSeen      time.Time
	Frequency     float64
	ParameterCount int
	Examples      []common.LogEntrySample
}

type slidingWindow struct {
	window   map[int64]int
	duration time.Duration
}

func newSlidingWindow(duration time.Duration) *slidingWindow {
	return &slidingWindow{
		window:   make(map[int64]int),
		duration: duration,
	}
}

func (sw *slidingWindow) Add(timestamp time.Time) {
	sw.cleanup()
	bucket := timestamp.Unix()
	sw.window[bucket]++
}

func (sw *slidingWindow) Count() int {
	sw.cleanup()
	total := 0
	for _, count := range sw.window {
		total += count
	}
	return total
}

func (sw *slidingWindow) cleanup() {
	now := time.Now().Unix()
	cutoff := now - int64(sw.duration.Seconds())
	for ts := range sw.window {
		if ts < cutoff {
			delete(sw.window, ts)
		}
	}
}

type AlertHandler interface {
	Handle(alert *common.AnomalyAlert) error
}

type SlackAlertHandler struct {
	WebhookURL string
}

func (h *SlackAlertHandler) Handle(alert *common.AnomalyAlert) error {
	attachment := map[string]interface{}{
		"color":     severityToColor(alert.Severity),
		"title":     alert.Title,
		"text":      alert.Description,
		"ts":        alert.Timestamp.Unix(),
		"mrkdwn_in": []string{"text"},
		"fields": []map[string]interface{}{
			{"title": "Type", "value": alert.Type, "short": true},
			{"title": "Severity", "value": string(alert.Severity), "short": true},
		},
	}

	payload := map[string]interface{}{
		"text":        fmt.Sprintf("⚠️  Anomaly Detected: %s", alert.Title),
		"attachments": []interface{}{attachment},
	}

	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	resp, err := http.Post(h.WebhookURL, "application/json", bytes.NewBuffer(data))
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("slack webhook returned status: %d", resp.StatusCode)
	}

	return nil
}

type WebhookAlertHandler struct {
	URL string
}

func (h *WebhookAlertHandler) Handle(alert *common.AnomalyAlert) error {
	data, err := json.Marshal(alert)
	if err != nil {
		return err
	}

	resp, err := http.Post(h.URL, "application/json", bytes.NewBuffer(data))
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	return nil
}

func severityToColor(sev common.SeverityLevel) string {
	switch sev {
	case common.SeverityCritical:
		return "danger"
	case common.SeverityHigh:
		return "warning"
	case common.SeverityMedium:
		return "#d35400"
	case common.SeverityLow:
		return "good"
	default:
		return "#7f8c8d"
	}
}

func NewDetector(config *DetectorConfig) *Detector {
	if config == nil {
		config = DefaultConfig()
	}

	d := &Detector{
		config:      config,
		parser:      NewLogParser(config.LogFormats),
		patterns:    make(map[string]*patternInfo),
		errorWindow: newSlidingWindow(config.ErrorBurstWindow),
		stats: &DetectorStats{
			StartTime:  time.Now(),
			ErrorRates: make(map[time.Time]float64),
		},
		startTime: time.Now(),
	}

	if config.SlackWebhook != "" {
		d.alertHandlers = append(d.alertHandlers, &SlackAlertHandler{WebhookURL: config.SlackWebhook})
	}
	if config.WebhookURL != "" {
		d.alertHandlers = append(d.alertHandlers, &WebhookAlertHandler{URL: config.WebhookURL})
	}

	return d
}

func (d *Detector) IsLearningPhase() bool {
	return time.Since(d.startTime) < d.config.LearningPhaseDuration
}

func (d *Detector) ProcessLine(line string) (*common.AnomalyScore, *common.AnomalyAlert, error) {
	if strings.TrimSpace(line) == "" {
		return nil, nil, nil
	}

	entry, _ := d.parser.Parse(line)

	d.mu.Lock()
	d.stats.TotalEntries++
	d.mu.Unlock()

	var scores []common.AnomalyScore
	var alert *common.AnomalyAlert

	template, params := ExtractTemplate(entry.RawMessage)
	paramCount := len(params)

	d.mu.Lock()
	pattern, exists := d.patterns[template]

	if !exists {
		if len(d.patterns) < d.config.MaxLogPatterns {
			d.patterns[template] = &patternInfo{
				Template:       template,
				Occurrences:    1,
				FirstSeen:      entry.Timestamp,
				LastSeen:       entry.Timestamp,
				ParameterCount: paramCount,
				Examples: []common.LogEntrySample{
					{RawMessage: entry.RawMessage, Timestamp: entry.Timestamp},
				},
			}
		}

		if !d.IsLearningPhase() {
			score := common.AnomalyScore{
				Score:       0.9,
				Description: "Rare log pattern detected",
				Reason:      "This log message template has never been seen before",
				Confidence:  0.7,
			}
			scores = append(scores, score)
		}
	} else {
		pattern.Occurrences++
		pattern.LastSeen = entry.Timestamp
		if len(pattern.Examples) < 5 {
			pattern.Examples = append(pattern.Examples, common.LogEntrySample{
				RawMessage: entry.RawMessage,
				Timestamp:  entry.Timestamp,
			})
		}

		if paramCount != pattern.ParameterCount {
			score := common.AnomalyScore{
				Score:       0.7,
				Description: "Parameter count mismatch",
				Reason:      fmt.Sprintf("Expected %d parameters but got %d", pattern.ParameterCount, paramCount),
				Confidence:  0.6,
			}
			scores = append(scores, score)
		}
	}
	d.mu.Unlock()

	if entry.Level == "ERROR" || entry.Level == "PANIC" || entry.Level == "FATAL" {
		d.mu.Lock()
		d.stats.ErrorCount++
		d.errorWindow.Add(entry.Timestamp)
		errorBurst := d.errorWindow.Count()
		d.mu.Unlock()

		if errorBurst >= d.config.ErrorBurstThreshold {
			score := common.AnomalyScore{
				Score:       0.95,
				Description: "Error burst detected",
				Reason:      fmt.Sprintf("%d errors in last %s", errorBurst, d.config.ErrorBurstWindow),
				Confidence:  0.9,
			}
			scores = append(scores, score)
		}
	} else if entry.Level == "WARN" {
		d.mu.Lock()
		d.stats.WarningCount++
		d.mu.Unlock()
	}

	var maxScore float64
	for _, s := range scores {
		if s.Score > maxScore {
			maxScore = s.Score
		}
	}

	if len(scores) > 0 && maxScore >= d.config.AlertThreshold {
		alert = d.createAlert(entry, scores, maxScore)

		for _, handler := range d.alertHandlers {
			go func(h AlertHandler, a *common.AnomalyAlert) {
				_ = h.Handle(a)
			}(handler, alert)
		}

		d.mu.Lock()
		d.stats.AnomalousEntries++
		d.stats.LastAnomalyTime = time.Now()
		d.mu.Unlock()
	} else {
		d.mu.Lock()
		d.stats.NormalEntries++
		d.mu.Unlock()
	}

	if len(scores) > 0 {
		return &scores[0], alert, nil
	}

	return nil, nil, nil
}

func (d *Detector) createAlert(entry *common.LogEntry, scores []common.AnomalyScore, maxScore float64) *common.AnomalyAlert {
	severity := common.SeverityLow
	if maxScore >= 0.9 {
		severity = common.SeverityCritical
	} else if maxScore >= 0.75 {
		severity = common.SeverityHigh
	} else if maxScore >= 0.6 {
		severity = common.SeverityMedium
	}

	alertType := "pattern_anomaly"
	if d.errorWindow.Count() >= d.config.ErrorBurstThreshold {
		alertType = "error_burst"
	}

	title := "Anomaly Detected"
	desc := "Unusual log activity detected"
	if len(scores) > 0 {
		title = scores[0].Description
		desc = scores[0].Reason
	}

	return &common.AnomalyAlert{
		AlertID:     common.GenerateID(),
		Timestamp:   time.Now(),
		Type:        alertType,
		Severity:    severity,
		Title:       title,
		Description: desc,
		Entries:     []common.LogEntry{*entry},
		Scores:      scores,
		Context: map[string]interface{}{
			"total_entries":   d.stats.TotalEntries,
			"learning_phase":  d.IsLearningPhase(),
			"error_rate":      float64(d.stats.ErrorCount) / float64(maxInt64(d.stats.TotalEntries, 1)),
		},
	}
}

func (d *Detector) ProcessStream(reader *bufio.Reader, stopChan <-chan struct{}) <-chan *common.AnomalyAlert {
	alertChan := make(chan *common.AnomalyAlert, 100)

	go func() {
		defer close(alertChan)

		lineChan := make(chan string, 100)
		go func() {
			scanner := bufio.NewScanner(reader)
			for scanner.Scan() {
				select {
				case <-stopChan:
					return
				default:
					lineChan <- scanner.Text()
				}
			}
			close(lineChan)
		}()

		for {
			select {
			case <-stopChan:
				return
			case line, ok := <-lineChan:
				if !ok {
					return
				}
				_, alert, err := d.ProcessLine(line)
				if err == nil && alert != nil {
					select {
					case alertChan <- alert:
					default:
					}
				}
			}
		}
	}()

	return alertChan
}

func (d *Detector) ProcessFile(filePath string) ([]*common.AnomalyAlert, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	var alerts []*common.AnomalyAlert
	scanner := bufio.NewScanner(file)
	buf := make([]byte, 1024*1024)
	scanner.Buffer(buf, 1024*1024)

	for scanner.Scan() {
		_, alert, err := d.ProcessLine(scanner.Text())
		if err != nil {
			continue
		}
		if alert != nil {
			alerts = append(alerts, alert)
		}
	}

	return alerts, scanner.Err()
}

func (d *Detector) GetStats() *DetectorStats {
	d.mu.RLock()
	defer d.mu.RUnlock()

	stats := &DetectorStats{
		TotalEntries:      d.stats.TotalEntries,
		NormalEntries:     d.stats.NormalEntries,
		AnomalousEntries:  d.stats.AnomalousEntries,
		ErrorCount:        d.stats.ErrorCount,
		WarningCount:      d.stats.WarningCount,
		PatternsLearned:   len(d.patterns),
		StartTime:         d.stats.StartTime,
		LastAnomalyTime:   d.stats.LastAnomalyTime,
	}

	return stats
}

func (d *Detector) GetTopPatterns(limit int) []*common.LogPattern {
	d.mu.RLock()
	defer d.mu.RUnlock()

	patterns := make([]*patternInfo, 0, len(d.patterns))
	for _, p := range d.patterns {
		patterns = append(patterns, p)
	}

	sort.Slice(patterns, func(i, j int) bool {
		return patterns[i].Occurrences > patterns[j].Occurrences
	})

	if limit > 0 && len(patterns) > limit {
		patterns = patterns[:limit]
	}

	result := make([]*common.LogPattern, len(patterns))
	for i, p := range patterns {
		result[i] = &common.LogPattern{
			PatternID:      common.GenerateID(),
			Template:       p.Template,
			ParameterCount: p.ParameterCount,
			Occurrences:    p.Occurrences,
			FirstSeen:      p.FirstSeen,
			LastSeen:       p.LastSeen,
			Frequency:      p.Frequency,
			ExampleEntries: p.Examples,
		}
	}

	return result
}

func (d *Detector) PrintStats() {
	stats := d.GetStats()
	patterns := d.GetTopPatterns(10)

	uptime := time.Since(stats.StartTime)

	fmt.Println()
	fmt.Println("═══════════════════════════════════════════════════════════════")
	fmt.Println("  LOG ANOMALY DETECTOR - STATISTICS")
	fmt.Println("═══════════════════════════════════════════════════════════════")
	fmt.Println()
	fmt.Printf("  Uptime:            %s\n", common.FormatDuration(uptime))
	fmt.Printf("  Learning Phase:    %v\n", d.IsLearningPhase())
	if d.IsLearningPhase() {
		remaining := d.config.LearningPhaseDuration - time.Since(d.startTime)
		if remaining > 0 {
			fmt.Printf("  Remaining:         %s\n", common.FormatDuration(remaining))
		}
	}
	fmt.Println()
	fmt.Println("  ─────────────────────────────────────────────────────────────")
	fmt.Println("  ENTRY COUNTS")
	fmt.Println("  ─────────────────────────────────────────────────────────────")
	fmt.Println()
	fmt.Printf("  Total:             %d\n", stats.TotalEntries)
	fmt.Printf("  Normal:            %d\n", stats.NormalEntries)
	fmt.Printf("  Anomalous:         %d\n", stats.AnomalousEntries)
	fmt.Printf("  Errors:            %d\n", stats.ErrorCount)
	fmt.Printf("  Warnings:          %d\n", stats.WarningCount)
	fmt.Println()
	fmt.Println("  ─────────────────────────────────────────────────────────────")
	fmt.Printf("  PATTERNS LEARNED:  %d\n", stats.PatternsLearned)
	fmt.Println("  ─────────────────────────────────────────────────────────────")
	fmt.Println()

	if len(patterns) > 0 {
		fmt.Println("  Top Patterns:")
		for i, p := range patterns {
			fmt.Printf("  [%d] %d occurrences: %s\n", i+1, p.Occurrences, truncate(p.Template, 60))
		}
	}

	fmt.Println()
	fmt.Println("═══════════════════════════════════════════════════════════════")
}

func truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen-3] + "..."
}

func maxInt64(a, b int64) int64 {
	if a > b {
		return a
	}
	return b
}
