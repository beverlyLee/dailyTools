package dashboard

import (
	"encoding/json"
	"fmt"
	"html/template"
	"net/http"
	"sync"
	"time"

	"github.com/security-monitoring-toolkit/internal/common"
	"github.com/security-monitoring-toolkit/internal/detector"
	"github.com/security-monitoring-toolkit/internal/scanner"
)

type DashboardServer struct {
	config       *common.DashboardConfig
	scanner      *scanner.Scanner
	detector     *detector.Detector
	recentScans  []*common.ScanReport
	recentAlerts []*common.AnomalyAlert
	mu           sync.RWMutex
	server       *http.Server
}

type DashboardData struct {
	Timestamp        time.Time
	TotalScans       int
	TotalAlerts      int
	RecentScans      []*common.ScanReport
	RecentAlerts     []*common.AnomalyAlert
	DetectorStats    *detector.DetectorStats
	TopPatterns      []*common.LogPattern
	IsLearningPhase  bool
}

func NewDashboardServer(config *common.DashboardConfig, s *scanner.Scanner, d *detector.Detector) *DashboardServer {
	if config == nil {
		config = &common.DashboardConfig{
			Port:       8080,
			EnableAuth: false,
		}
	}

	return &DashboardServer{
		config:       config,
		scanner:      s,
		detector:     d,
		recentScans:  make([]*common.ScanReport, 0),
		recentAlerts: make([]*common.AnomalyAlert, 0),
	}
}

func (ds *DashboardServer) AddScanReport(report *common.ScanReport) {
	ds.mu.Lock()
	defer ds.mu.Unlock()

	ds.recentScans = append(ds.recentScans, report)
	if len(ds.recentScans) > 50 {
		ds.recentScans = ds.recentScans[1:]
	}
}

func (ds *DashboardServer) AddAlert(alert *common.AnomalyAlert) {
	ds.mu.Lock()
	defer ds.mu.Unlock()

	ds.recentAlerts = append(ds.recentAlerts, alert)
	if len(ds.recentAlerts) > 100 {
		ds.recentAlerts = ds.recentAlerts[1:]
	}
}

func (ds *DashboardServer) Start() error {
	mux := http.NewServeMux()

	mux.HandleFunc("/", ds.handleIndex)
	mux.HandleFunc("/api/stats", ds.handleAPIData)
	mux.HandleFunc("/api/scans", ds.handleAPIScans)
	mux.HandleFunc("/api/alerts", ds.handleAPIAlerts)
	mux.HandleFunc("/api/patterns", ds.handleAPIPatterns)

	ds.server = &http.Server{
		Addr:         fmt.Sprintf(":%d", ds.config.Port),
		Handler:      mux,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
	}

	fmt.Printf("Dashboard server starting on http://localhost:%d\n", ds.config.Port)
	return ds.server.ListenAndServe()
}

func (ds *DashboardServer) Stop() error {
	if ds.server != nil {
		return ds.server.Close()
	}
	return nil
}

func (ds *DashboardServer) getDashboardData() *DashboardData {
	ds.mu.RLock()
	defer ds.mu.RUnlock()

	data := &DashboardData{
		Timestamp:    time.Now(),
		TotalScans:   len(ds.recentScans),
		TotalAlerts:  len(ds.recentAlerts),
		RecentScans:  ds.recentScans,
		RecentAlerts: ds.recentAlerts,
	}

	if ds.detector != nil {
		data.DetectorStats = ds.detector.GetStats()
		data.TopPatterns = ds.detector.GetTopPatterns(20)
		data.IsLearningPhase = ds.detector.IsLearningPhase()
	}

	return data
}

func (ds *DashboardServer) handleIndex(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}

	data := ds.getDashboardData()

	tmpl := template.Must(template.New("dashboard").Funcs(template.FuncMap{
		"formatTime": func(t time.Time) string {
			return t.Format("2006-01-02 15:04:05")
		},
		"formatDuration": func(d time.Duration) string {
			return common.FormatDuration(d)
		},
		"severityClass": func(sev common.SeverityLevel) string {
			switch sev {
			case common.SeverityCritical:
				return "critical"
			case common.SeverityHigh:
				return "high"
			case common.SeverityMedium:
				return "medium"
			case common.SeverityLow:
				return "low"
			default:
				return "unknown"
			}
		},
		"truncate": func(s string, max int) string {
			if len(s) <= max {
				return s
			}
			return s[:max-3] + "..."
		},
	}).Parse(dashboardTemplate))

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	if err := tmpl.Execute(w, data); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

func (ds *DashboardServer) handleAPIData(w http.ResponseWriter, r *http.Request) {
	data := ds.getDashboardData()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

func (ds *DashboardServer) handleAPIScans(w http.ResponseWriter, r *http.Request) {
	ds.mu.RLock()
	defer ds.mu.RUnlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"count": len(ds.recentScans),
		"scans": ds.recentScans,
	})
}

func (ds *DashboardServer) handleAPIAlerts(w http.ResponseWriter, r *http.Request) {
	ds.mu.RLock()
	defer ds.mu.RUnlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"count":  len(ds.recentAlerts),
		"alerts": ds.recentAlerts,
	})
}

func (ds *DashboardServer) handleAPIPatterns(w http.ResponseWriter, r *http.Request) {
	if ds.detector == nil {
		http.Error(w, "Detector not available", http.StatusServiceUnavailable)
		return
	}

	patterns := ds.detector.GetTopPatterns(50)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"count":    len(patterns),
		"patterns": patterns,
	})
}

const dashboardTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Security Monitoring Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0f172a;
            color: #e2e8f0;
            min-height: 100vh;
        }
        .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
        .header {
            background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
            padding: 20px 30px;
            border-radius: 12px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .header h1 { font-size: 24px; color: #60a5fa; }
        .status-badge {
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
        }
        .status-learning { background: #f59e0b; color: #1e293b; }
        .status-active { background: #10b981; color: #1e293b; }
        
        .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 20px; }
        .card {
            background: #1e293b;
            border-radius: 12px;
            padding: 20px;
            border: 1px solid #334155;
        }
        .card h3 { font-size: 12px; text-transform: uppercase; color: #94a3b8; margin-bottom: 10px; }
        .card .value { font-size: 32px; font-weight: 700; }
        .card .value.scans { color: #60a5fa; }
        .card .value.alerts { color: #f87171; }
        .card .value.patterns { color: #34d399; }
        .card .value.errors { color: #fbbf24; }
        
        .main-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; }
        .section { background: #1e293b; border-radius: 12px; border: 1px solid #334155; }
        .section-header {
            padding: 15px 20px;
            border-bottom: 1px solid #334155;
            font-weight: 600;
            color: #cbd5e1;
        }
        .section-body { padding: 15px 20px; max-height: 400px; overflow-y: auto; }
        
        .alert-item {
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 10px;
            border-left: 4px solid;
        }
        .alert-item.critical { background: rgba(239, 68, 68, 0.1); border-color: #ef4444; }
        .alert-item.high { background: rgba(249, 115, 22, 0.1); border-color: #f97316; }
        .alert-item.medium { background: rgba(234, 179, 8, 0.1); border-color: #eab308; }
        .alert-item.low { background: rgba(34, 197, 94, 0.1); border-color: #22c55e; }
        .alert-title { font-weight: 600; margin-bottom: 4px; }
        .alert-meta { font-size: 12px; color: #94a3b8; }
        
        .scan-item {
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 10px;
            background: rgba(96, 165, 250, 0.05);
            border: 1px solid rgba(96, 165, 250, 0.2);
        }
        .scan-target { font-weight: 600; margin-bottom: 4px; }
        .scan-meta { font-size: 12px; color: #94a3b8; }
        .scan-findings { margin-top: 8px; font-size: 13px; }
        .finding-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            margin-right: 6px;
            font-size: 11px;
            font-weight: 600;
        }
        
        .pattern-item {
            padding: 10px 0;
            border-bottom: 1px solid #334155;
            font-family: monospace;
            font-size: 12px;
        }
        .pattern-item:last-child { border-bottom: none; }
        .pattern-count { float: right; color: #60a5fa; }
        
        .refresh-btn {
            background: #3b82f6;
            border: none;
            color: white;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
        }
        .refresh-btn:hover { background: #2563eb; }
        
        .empty-state {
            text-align: center;
            padding: 40px;
            color: #64748b;
        }
        
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #1e293b; }
        ::-webkit-scrollbar-thumb { background: #475569; border-radius: 3px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛡️ Security Monitoring Dashboard</h1>
            <div style="display: flex; align-items: center; gap: 15px;">
                {{if .IsLearningPhase}}
                    <span class="status-badge status-learning">📚 Learning Phase</span>
                {{else}}
                    <span class="status-badge status-active">✅ Monitoring Active</span>
                {{end}}
                <button class="refresh-btn" onclick="location.reload()">🔄 Refresh</button>
            </div>
        </div>

        <div class="grid">
            <div class="card">
                <h3>Scans Completed</h3>
                <div class="value scans">{{.TotalScans}}</div>
            </div>
            <div class="card">
                <h3>Alerts Generated</h3>
                <div class="value alerts">{{.TotalAlerts}}</div>
            </div>
            <div class="card">
                <h3>Patterns Learned</h3>
                <div class="value patterns">{{if .DetectorStats}}{{.DetectorStats.PatternsLearned}}{{else}}0{{end}}</div>
            </div>
            <div class="card">
                <h3>Errors Detected</h3>
                <div class="value errors">{{if .DetectorStats}}{{.DetectorStats.ErrorCount}}{{else}}0{{end}}</div>
            </div>
        </div>

        <div class="main-grid">
            <div>
                <div class="section">
                    <div class="section-header">📊 Recent Alerts</div>
                    <div class="section-body">
                        {{if .RecentAlerts}}
                            {{range .RecentAlerts}}
                                <div class="alert-item {{severityClass .Severity}}">
                                    <div class="alert-title">{{.Title}}</div>
                                    <div class="alert-meta">
                                        {{formatTime .Timestamp}} | {{.Type}} | {{.Severity}}
                                    </div>
                                    {{if .Description}}
                                        <div style="margin-top: 8px; font-size: 13px; color: #cbd5e1;">{{.Description}}</div>
                                    {{end}}
                                </div>
                            {{end}}
                        {{else}}
                            <div class="empty-state">
                                <div style="font-size: 48px; margin-bottom: 10px;">✅</div>
                                <div>No alerts yet. Monitoring is active.</div>
                            </div>
                        {{end}}
                    </div>
                </div>

                <div class="section" style="margin-top: 20px;">
                    <div class="section-header">🔍 Recent Scans</div>
                    <div class="section-body">
                        {{if .RecentScans}}
                            {{range .RecentScans}}
                                <div class="scan-item">
                                    <div class="scan-target">{{.TargetPath}}</div>
                                    <div class="scan-meta">
                                        {{formatTime .StartTime}} | {{.ScannedFiles}} files scanned
                                    </div>
                                    {{if .Findings}}
                                        <div class="scan-findings">
                                            {{range $sev, $count := .SeverityCounts}}
                                                {{if $count}}
                                                    <span class="finding-badge" style="background: {{if eq $sev "critical"}}rgba(239,68,68,0.2){{else if eq $sev "high"}}rgba(249,115,22,0.2){{else if eq $sev "medium"}}rgba(234,179,8,0.2){{else}}rgba(34,197,94,0.2){{end}}; color: {{if eq $sev "critical"}}#ef4444{{else if eq $sev "high"}}#f97316{{else if eq $sev "medium"}}#eab308{{else}}#22c55e{{end}}">
                                                        {{$sev}}: {{$count}}
                                                    </span>
                                                {{end}}
                                            {{end}}
                                        </div>
                                    {{end}}
                                </div>
                            {{end}}
                        {{else}}
                            <div class="empty-state">
                                <div style="font-size: 48px; margin-bottom: 10px;">📁</div>
                                <div>No scans yet. Run a scan to see results.</div>
                            </div>
                        {{end}}
                    </div>
                </div>
            </div>

            <div>
                <div class="section">
                    <div class="section-header">📈 Detector Statistics</div>
                    <div class="section-body">
                        {{if .DetectorStats}}
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                                <div>
                                    <div style="font-size: 12px; color: #94a3b8; margin-bottom: 4px;">Total Entries</div>
                                    <div style="font-size: 20px; font-weight: 700;">{{.DetectorStats.TotalEntries}}</div>
                                </div>
                                <div>
                                    <div style="font-size: 12px; color: #94a3b8; margin-bottom: 4px;">Normal</div>
                                    <div style="font-size: 20px; font-weight: 700; color: #34d399;">{{.DetectorStats.NormalEntries}}</div>
                                </div>
                                <div>
                                    <div style="font-size: 12px; color: #94a3b8; margin-bottom: 4px;">Anomalous</div>
                                    <div style="font-size: 20px; font-weight: 700; color: #f87171;">{{.DetectorStats.AnomalousEntries}}</div>
                                </div>
                                <div>
                                    <div style="font-size: 12px; color: #94a3b8; margin-bottom: 4px;">Warnings</div>
                                    <div style="font-size: 20px; font-weight: 700; color: #fbbf24;">{{.DetectorStats.WarningCount}}</div>
                                </div>
                            </div>
                        {{else}}
                            <div class="empty-state">
                                <div style="font-size: 48px; margin-bottom: 10px;">📊</div>
                                <div>No detector data yet.</div>
                            </div>
                        {{end}}
                    </div>
                </div>

                <div class="section" style="margin-top: 20px;">
                    <div class="section-header">🎯 Top Log Patterns</div>
                    <div class="section-body">
                        {{if .TopPatterns}}
                            {{range .TopPatterns}}
                                <div class="pattern-item">
                                    <span class="pattern-count">{{.Occurrences}}x</span>
                                    {{truncate .Template 50}}
                                </div>
                            {{end}}
                        {{else}}
                            <div class="empty-state">
                                <div style="font-size: 48px; margin-bottom: 10px;">📝</div>
                                <div>No patterns learned yet.</div>
                                <div style="font-size: 12px; margin-top: 8px;">Process logs to learn patterns.</div>
                            </div>
                        {{end}}
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
`
