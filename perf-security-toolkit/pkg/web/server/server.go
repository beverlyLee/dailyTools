package server

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"perf-security-toolkit/pkg/perf/analyzer"
	"perf-security-toolkit/pkg/perf/bottleneck"
	"perf-security-toolkit/pkg/perf/collector"
	"perf-security-toolkit/pkg/perf/flamegraph"
	"perf-security-toolkit/pkg/perf/optimizer"
	"perf-security-toolkit/pkg/security/configcheck"
	"perf-security-toolkit/pkg/security/llm"
	"perf-security-toolkit/pkg/security/scanner"

	"github.com/fatih/color"
)

type Config struct {
	Host string
	Port int
}

type Server struct {
	config Config
	server *http.Server
}

type APIResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

type PerfRequest struct {
	Duration int    `json:"duration"`
	Process  string `json:"process"`
}

type ScanRequest struct {
	ImageName   string `json:"image_name"`
	UseLLM      bool   `json:"use_llm"`
	LLMProvider string `json:"llm_provider"`
	LLMModel    string `json:"llm_model"`
	LLMAPIKey   string `json:"llm_api_key"`
}

func New(config Config) *Server {
	return &Server{config: config}
}

func (s *Server) Start() error {
	mux := http.NewServeMux()

	mux.HandleFunc("/", s.handleIndex)
	mux.HandleFunc("/api/health", s.handleHealth)
	mux.HandleFunc("/api/perf/analyze", s.handlePerfAnalyze)
	mux.HandleFunc("/api/scan/container", s.handleScanContainer)
	mux.HandleFunc("/api/scan/config", s.handleScanConfig)

	addr := fmt.Sprintf("%s:%d", s.config.Host, s.config.Port)
	s.server = &http.Server{
		Addr:         addr,
		Handler:      mux,
		ReadTimeout:  60 * time.Second,
		WriteTimeout: 120 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-stop
		fmt.Println("\n正在关闭服务器...")
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		s.server.Shutdown(ctx)
	}()

	color.Green("服务器启动成功: http://%s:%d", s.config.Host, s.config.Port)
	color.Blue("可用API端点:")
	color.Blue("  GET  /api/health              - 健康检查")
	color.Blue("  POST /api/perf/analyze        - 性能分析")
	color.Blue("  POST /api/scan/container      - 容器安全扫描")
	color.Blue("  POST /api/scan/config         - 运行时配置检查")

	if err := s.server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		return err
	}

	return nil
}

func (s *Server) handleIndex(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}

	html := `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>性能与安全分析工具集</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; padding: 20px; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { text-align: center; color: white; margin-bottom: 40px; }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; }
        .header p { font-size: 1.1em; opacity: 0.9; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(500px, 1fr)); gap: 20px; }
        .card { background: white; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); padding: 30px; }
        .card h2 { color: #333; margin-bottom: 20px; font-size: 1.5em; display: flex; align-items: center; gap: 10px; }
        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; margin-bottom: 8px; color: #555; font-weight: 500; }
        .form-group input, .form-group select, .form-group textarea { width: 100%; padding: 12px 16px; border: 2px solid #e1e5e9; border-radius: 8px; font-size: 14px; transition: border-color 0.3s; }
        .form-group input:focus, .form-group select:focus, .form-group textarea:focus { outline: none; border-color: #667eea; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .btn { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; }
        .btn:hover { transform: translateY(-2px); box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4); }
        .btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .result { margin-top: 20px; background: #f8f9fa; border-radius: 8px; padding: 20px; max-height: 500px; overflow-y: auto; }
        .result pre { white-space: pre-wrap; font-family: 'Consolas', monospace; font-size: 13px; color: #333; }
        .loading { text-align: center; padding: 40px; }
        .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #667eea; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 15px; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .tabs { display: flex; gap: 10px; margin-bottom: 20px; }
        .tab { padding: 10px 20px; background: #e1e5e9; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; }
        .tab.active { background: #667eea; color: white; }
        .error { color: #e74c3c; background: #fdf2f2; padding: 15px; border-radius: 8px; margin-top: 15px; }
        .success { color: #27ae60; background: #f0fdf4; padding: 15px; border-radius: 8px; margin-top: 15px; }
        .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px; }
        .stat { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px; border-radius: 8px; text-align: center; }
        .stat-value { font-size: 24px; font-weight: bold; }
        .stat-label { font-size: 12px; opacity: 0.9; margin-top: 5px; }
        .checkbox-group { display: flex; flex-wrap: wrap; gap: 15px; }
        .checkbox-item { display: flex; align-items: center; gap: 8px; }
        .checkbox-item input { width: auto; }
        .divider { height: 1px; background: #e1e5e9; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔧 性能与安全分析工具集</h1>
            <p>智能性能瓶颈分析器 + 智能容器安全扫描器</p>
        </div>
        <div class="grid">
            <div class="card">
                <h2>📊 性能分析</h2>
                <form id="perfForm">
                    <div class="form-row">
                        <div class="form-group">
                            <label>监控时长 (秒)</label>
                            <input type="number" id="perfDuration" value="10" min="1" max="300">
                        </div>
                        <div class="form-group">
                            <label>目标进程 (可选)</label>
                            <input type="text" id="perfProcess" placeholder="如: nginx, node 或留空监控系统">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>监控项</label>
                        <div class="checkbox-group">
                            <label class="checkbox-item"><input type="checkbox" id="perfCPU" checked> CPU使用率</label>
                            <label class="checkbox-item"><input type="checkbox" id="perfMemory" checked> 内存使用</label>
                            <label class="checkbox-item"><input type="checkbox" id="perfIO" checked> I/O活动</label>
                        </div>
                    </div>
                    <button type="submit" class="btn" id="perfBtn">开始性能分析</button>
                </form>
                <div id="perfResult" class="result" style="display:none;"></div>
            </div>
            <div class="card">
                <h2>🛡️ 容器安全扫描</h2>
                <form id="scanForm">
                    <div class="form-group">
                        <label>容器镜像名称</label>
                        <input type="text" id="scanImage" placeholder="如: nginx:latest, myapp:v1" required>
                    </div>
                    <div class="form-group">
                        <label>扫描项</label>
                        <div class="checkbox-group">
                            <label class="checkbox-item"><input type="checkbox" id="scanOS" checked> 操作系统包漏洞</label>
                            <label class="checkbox-item"><input type="checkbox" id="scanDeps" checked> 应用依赖漏洞</label>
                            <label class="checkbox-item"><input type="checkbox" id="scanConfig" checked> 配置安全检查</label>
                        </div>
                    </div>
                    <div class="divider"></div>
                    <div class="form-group">
                        <label class="checkbox-item"><input type="checkbox" id="useLLM"> 使用LLM分析漏洞风险</label>
                    </div>
                    <div id="llmOptions" style="display:none;">
                        <div class="form-row">
                            <div class="form-group">
                                <label>LLM提供商</label>
                                <select id="llmProvider">
                                    <option value="openai">OpenAI</option>
                                    <option value="claude">Claude (Anthropic)</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>模型名称</label>
                                <input type="text" id="llmModel" placeholder="如: gpt-4, claude-3-opus">
                            </div>
                        </div>
                        <div class="form-group">
                            <label>API Key</label>
                            <input type="password" id="llmAPIKey" placeholder="留空则使用环境变量">
                        </div>
                    </div>
                    <button type="submit" class="btn" id="scanBtn">开始安全扫描</button>
                </form>
                <div id="scanResult" class="result" style="display:none;"></div>
            </div>
        </div>
    </div>
    <script>
        document.getElementById('useLLM').addEventListener('change', function() {
            document.getElementById('llmOptions').style.display = this.checked ? 'block' : 'none';
        });
        document.getElementById('perfForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            const btn = document.getElementById('perfBtn');
            const resultDiv = document.getElementById('perfResult');
            btn.disabled = true;
            btn.textContent = '分析中...';
            resultDiv.style.display = 'block';
            resultDiv.innerHTML = '<div class="loading"><div class="spinner"></div><p>正在收集性能数据，请稍候...</p></div>';
            try {
                const response = await fetch('/api/perf/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        duration: parseInt(document.getElementById('perfDuration').value),
                        process: document.getElementById('perfProcess').value
                    })
                });
                const data = await response.json();
                if (data.success) {
                    resultDiv.innerHTML = formatPerfResult(data.data);
                } else {
                    resultDiv.innerHTML = '<div class="error">错误: ' + data.error + '</div>';
                }
            } catch (err) {
                resultDiv.innerHTML = '<div class="error">请求失败: ' + err.message + '</div>';
            }
            btn.disabled = false;
            btn.textContent = '开始性能分析';
        });
        document.getElementById('scanForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            const btn = document.getElementById('scanBtn');
            const resultDiv = document.getElementById('scanResult');
            const image = document.getElementById('scanImage').value;
            if (!image) { alert('请输入容器镜像名称'); return; }
            btn.disabled = true;
            btn.textContent = '扫描中...';
            resultDiv.style.display = 'block';
            resultDiv.innerHTML = '<div class="loading"><div class="spinner"></div><p>正在扫描容器镜像，请稍候...</p></div>';
            try {
                const response = await fetch('/api/scan/container', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        image_name: image,
                        use_llm: document.getElementById('useLLM').checked,
                        llm_provider: document.getElementById('llmProvider').value,
                        llm_model: document.getElementById('llmModel').value,
                        llm_api_key: document.getElementById('llmAPIKey').value
                    })
                });
                const data = await response.json();
                if (data.success) {
                    resultDiv.innerHTML = formatScanResult(data.data);
                } else {
                    resultDiv.innerHTML = '<div class="error">错误: ' + data.error + '</div>';
                }
            } catch (err) {
                resultDiv.innerHTML = '<div class="error">请求失败: ' + err.message + '</div>';
            }
            btn.disabled = false;
            btn.textContent = '开始安全扫描';
        });
        function formatPerfResult(data) {
            let html = '';
            if (data.analysis && data.analysis.summary) {
                html += '<div class="success"><strong>整体状态:</strong> ' + data.analysis.summary.overall_health + '</div>';
            }
            if (data.bottlenecks && data.bottlenecks.length > 0) {
                html += '<h3 style="margin:15px 0 10px;">⚠️ 发现的性能瓶颈 (' + data.bottlenecks.length + ')</h3>';
                data.bottlenecks.forEach((b, i) => {
                    html += '<div style="background:#fff3cd;padding:10px;border-radius:6px;margin-bottom:8px;">';
                    html += '<strong>[' + b.severity + '] ' + b.type + '</strong><br>';
                    html += b.description + '<br>';
                    html += '<small>当前值: ' + b.metrics.current_value.toFixed(2) + ' ' + b.metrics.unit + ' | 阈值: ' + b.metrics.threshold + '</small>';
                    html += '</div>';
                });
            }
            if (data.suggestions && data.suggestions.length > 0) {
                html += '<h3 style="margin:15px 0 10px;">💡 优化建议</h3>';
                data.suggestions.forEach((s, i) => {
                    html += '<div style="background:#e3f2fd;padding:10px;border-radius:6px;margin-bottom:8px;">';
                    html += '<strong>' + s.title + '</strong><br>';
                    html += s.description + '<br>';
                    html += '<small>预期效果: ' + s.expected_impact + '</small>';
                    html += '</div>';
                });
            }
            if (data.hot_functions && data.hot_functions.length > 0) {
                html += '<h3 style="margin:15px 0 10px;">🔥 热点函数</h3>';
                html += '<table style="width:100%;border-collapse:collapse;font-size:12px;">';
                html += '<tr style="background:#f5f5f5;"><th style="padding:8px;text-align:left;">函数</th><th style="padding:8px;text-align:left;">自身时间</th><th style="padding:8px;text-align:left;">占比</th></tr>';
                data.hot_functions.forEach(h => {
                    html += '<tr><td style="padding:8px;border-bottom:1px solid #eee;">' + h.name + '</td>';
                    html += '<td style="padding:8px;border-bottom:1px solid #eee;">' + h.self_time.toFixed(2) + '</td>';
                    html += '<td style="padding:8px;border-bottom:1px solid #eee;">' + h.self_percent.toFixed(1) + '%</td></tr>';
                });
                html += '</table>';
            }
            html += '<div class="divider"></div>';
            html += '<details><summary>查看完整JSON数据</summary>';
            html += '<pre style="font-size:11px;max-height:200px;overflow:auto;background:white;padding:10px;border-radius:6px;">' + JSON.stringify(data, null, 2) + '</pre>';
            html += '</details>';
            return html;
        }
        function formatScanResult(data) {
            let html = '';
            let totalCritical = 0, totalHigh = 0, totalMedium = 0, totalLow = 0;
            if (data.os_vulnerabilities) {
                data.os_vulnerabilities.forEach(v => {
                    if (v.severity === 'Critical') totalCritical++;
                    else if (v.severity === 'High') totalHigh++;
                    else if (v.severity === 'Medium') totalMedium++;
                    else totalLow++;
                });
            }
            if (data.app_vulnerabilities) {
                data.app_vulnerabilities.forEach(v => {
                    if (v.severity === 'Critical') totalCritical++;
                    else if (v.severity === 'High') totalHigh++;
                    else if (v.severity === 'Medium') totalMedium++;
                    else totalLow++;
                });
            }
            html += '<div class="stats">';
            html += '<div class="stat"><div class="stat-value">' + totalCritical + '</div><div class="stat-label">Critical</div></div>';
            html += '<div class="stat"><div class="stat-value">' + totalHigh + '</div><div class="stat-label">High</div></div>';
            html += '<div class="stat"><div class="stat-value">' + totalMedium + '</div><div class="stat-label">Medium</div></div>';
            html += '<div class="stat"><div class="stat-value">' + totalLow + '</div><div class="stat-label">Low</div></div>';
            html += '</div>';
            if (data.os_info) {
                html += '<div style="background:#f0fdf4;padding:10px;border-radius:6px;margin-bottom:15px;">';
                html += '<strong>操作系统:</strong> ' + data.os_info.name + ' ' + data.os_info.version;
                html += '</div>';
            }
            if (data.config_issues && data.config_issues.length > 0) {
                html += '<h3 style="margin:15px 0 10px;">⚠️ 配置安全问题 (' + data.config_issues.length + ')</h3>';
                data.config_issues.forEach(issue => {
                    let bg = issue.severity === 'Critical' ? '#fef2f2' : 
                             issue.severity === 'High' ? '#fff7ed' : '#fffbeb';
                    html += '<div style="background:' + bg + ';padding:10px;border-radius:6px;margin-bottom:8px;">';
                    html += '<strong>[' + issue.severity + '] ' + issue.title + '</strong><br>';
                    html += issue.description + '<br>';
                    html += '<small>证据: ' + (issue.evidence || 'N/A') + '</small>';
                    html += '</div>';
                });
            }
            if (data.llm_explanations && data.llm_explanations.length > 0) {
                html += '<h3 style="margin:15px 0 10px;">🤖 LLM分析结果</h3>';
                data.llm_explanations.slice(0, 3).forEach(exp => {
                    html += '<div style="background:#f5f3ff;padding:10px;border-radius:6px;margin-bottom:8px;">';
                    html += '<strong>' + exp.title + ' (' + exp.risk_level + ')</strong><br>';
                    html += '<strong>风险:</strong> ' + exp.risk_description + '<br>';
                    html += '<strong>影响:</strong> ' + exp.impact + '<br>';
                    if (exp.fix_steps && exp.fix_steps.length > 0) {
                        html += '<strong>修复步骤:</strong><ol style="margin:5px 0 0 20px;">';
                        exp.fix_steps.forEach(step => { html += '<li>' + step + '</li>'; });
                        html += '</ol>';
                    }
                    html += '</div>';
                });
            }
            html += '<div class="divider"></div>';
            html += '<details><summary>查看完整JSON数据</summary>';
            html += '<pre style="font-size:11px;max-height:300px;overflow:auto;background:white;padding:10px;border-radius:6px;">' + JSON.stringify(data, null, 2) + '</pre>';
            html += '</details>';
            return html;
        }
    </script>
</body>
</html>`

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Write([]byte(html))
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"status":    "ok",
			"timestamp": time.Now().Unix(),
			"version":   "1.0.0",
		},
	})
}

func (s *Server) handlePerfAnalyze(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	var req PerfRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		json.NewEncoder(w).Encode(APIResponse{
			Success: false,
			Error:   "Invalid request body: " + err.Error(),
		})
		return
	}

	if req.Duration <= 0 {
		req.Duration = 10
	}

	config := collector.Config{
		Duration:      time.Duration(req.Duration) * time.Second,
		ProcessName:   req.Process,
		MonitorCPU:    true,
		MonitorMemory: true,
		MonitorIO:     true,
		Interval:      1 * time.Second,
	}

	dataCollector := collector.New(config)
	data, err := dataCollector.Collect()
	if err != nil {
		json.NewEncoder(w).Encode(APIResponse{
			Success: false,
			Error:   "Failed to collect data: " + err.Error(),
		})
		return
	}

	perfAnalyzer := analyzer.New()
	analysisResult, err := perfAnalyzer.Analyze(data)
	if err != nil {
		json.NewEncoder(w).Encode(APIResponse{
			Success: false,
			Error:   "Failed to analyze data: " + err.Error(),
		})
		return
	}

	flameGen := flamegraph.New()
	flamegraphResult, _ := flameGen.Generate(data)

	bottleneckDetector := bottleneck.New()
	bottlenecks, _ := bottleneckDetector.Detect(analysisResult, data)

	optGenerator := optimizer.New()
	suggestions, _ := optGenerator.Generate(bottlenecks, analysisResult)

	result := map[string]interface{}{
		"system_info": map[string]interface{}{
			"hostname":      data.SystemInfo.Hostname,
			"os":            data.SystemInfo.OS,
			"architecture":  data.SystemInfo.Architecture,
			"cpus":          data.SystemInfo.CPUs,
			"total_memory":  data.SystemInfo.TotalMemory,
		},
		"duration":       req.Duration,
		"samples_count":  data.SamplesCount,
		"analysis": map[string]interface{}{
			"summary": map[string]interface{}{
				"overall_health": analysisResult.Summary.OverallHealth,
				"main_issues":    analysisResult.Summary.MainIssues,
			},
			"cpu": map[string]interface{}{
				"average_usage":    analysisResult.CPUAnalysis.AverageUsage,
				"peak_usage":       analysisResult.CPUAnalysis.PeakUsage,
				"is_constrained":   analysisResult.CPUAnalysis.IsCPUConstrained,
				"high_load_periods": len(analysisResult.CPUAnalysis.HighUsagePeriods),
			},
			"memory": map[string]interface{}{
				"average_percent":   analysisResult.MemoryAnalysis.AverageUsagePercent,
				"peak_percent":      analysisResult.MemoryAnalysis.PeakUsagePercent,
				"is_constrained":    analysisResult.MemoryAnalysis.IsMemoryConstrained,
				"possible_leak":     analysisResult.MemoryAnalysis.PossibleLeak,
				"swap_used":         analysisResult.MemoryAnalysis.SwapUsage.IsSwapping,
			},
		},
		"bottlenecks":   bottlenecks,
		"suggestions":   suggestions,
	}

	if flamegraphResult != nil {
		result["hot_functions"] = flamegraphResult.HotFunctions
	}

	if analysisResult.ProcessAnalysis != nil {
		result["process"] = map[string]interface{}{
			"average_cpu":    analysisResult.ProcessAnalysis.AverageCPUPercent,
			"peak_cpu":       analysisResult.ProcessAnalysis.PeakCPUPercent,
			"average_rss":    analysisResult.ProcessAnalysis.AverageMemoryRSS,
			"peak_rss":       analysisResult.ProcessAnalysis.PeakMemoryRSS,
			"memory_growth":  analysisResult.ProcessAnalysis.MemoryGrowthRate,
			"max_threads":    analysisResult.ProcessAnalysis.MaxThreadCount,
		}
	}

	json.NewEncoder(w).Encode(APIResponse{
		Success: true,
		Data:    result,
	})
}

func (s *Server) handleScanContainer(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	var req ScanRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		json.NewEncoder(w).Encode(APIResponse{
			Success: false,
			Error:   "Invalid request body: " + err.Error(),
		})
		return
	}

	if req.ImageName == "" {
		json.NewEncoder(w).Encode(APIResponse{
			Success: false,
			Error:   "Image name is required",
		})
		return
	}

	config := scanner.Config{
		ImageName:      req.ImageName,
		ScanOSPackages: true,
		ScanAppDeps:    true,
		CheckConfig:    true,
	}

	containerScanner := scanner.New(config)
	scanResult, err := containerScanner.Scan()
	if err != nil {
		json.NewEncoder(w).Encode(APIResponse{
			Success: false,
			Error:   "Failed to scan image: " + err.Error(),
		})
		return
	}

	configChecker := configcheck.New()
	configIssues, _ := configChecker.Check(req.ImageName)

	result := map[string]interface{}{
		"image_name":         req.ImageName,
		"scan_time":          scanResult.ScanTime,
		"scan_duration_ms":   scanResult.ScanDuration.Milliseconds(),
		"os_info":            scanResult.OSInfo,
		"os_vulnerabilities": scanResult.OSVulnerabilities,
		"app_vulnerabilities": scanResult.AppVulnerabilities,
		"packages":           scanResult.Packages,
		"app_dependencies":   scanResult.AppDependencies,
		"config_issues":      configIssues,
	}

	if req.UseLLM {
		llmConfig := llm.Config{
			Provider: req.LLMProvider,
			Model:    req.LLMModel,
			APIKey:   req.LLMAPIKey,
		}
		llmClient := llm.New(llmConfig)
		explanations, _ := llmClient.ExplainVulnerabilities(
			scanResult.OSVulnerabilities,
			scanResult.AppVulnerabilities,
			configIssues,
		)
		result["llm_explanations"] = explanations
	}

	json.NewEncoder(w).Encode(APIResponse{
		Success: true,
		Data:    result,
	})
}

func (s *Server) handleScanConfig(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	var req struct {
		ContainerID string `json:"container_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		json.NewEncoder(w).Encode(APIResponse{
			Success: false,
			Error:   "Invalid request body: " + err.Error(),
		})
		return
	}

	if req.ContainerID == "" {
		json.NewEncoder(w).Encode(APIResponse{
			Success: false,
			Error:   "Container ID is required",
		})
		return
	}

	configChecker := configcheck.New()
	issues, err := configChecker.CheckRuntimeConfig(req.ContainerID)
	if err != nil {
		json.NewEncoder(w).Encode(APIResponse{
			Success: false,
			Error:   "Failed to check config: " + err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"container_id":   req.ContainerID,
			"config_issues":  issues,
			"issues_count":   len(issues),
		},
	})
}
