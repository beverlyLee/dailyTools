package webui

import (
	"encoding/json"
	"fmt"
	"html/template"
	"net/http"
	"os"
	"path/filepath"

	"network-container-toolkit/pkg/dnsserver"
)

func getTemplatePath() string {
	exePath, err := os.Executable()
	if err != nil {
		return "pkg/webui/template.html"
	}
	return filepath.Join(filepath.Dir(exePath), "template.html")
}

func loadTemplate() (*template.Template, error) {
	templatePath := getTemplatePath()
	
	// Try multiple possible paths
	paths := []string{
		templatePath,
		"pkg/webui/template.html",
		"webui/template.html",
		"template.html",
	}
	
	for _, path := range paths {
		if _, err := os.Stat(path); err == nil {
			return template.ParseFiles(path)
		}
	}
	
	// If no file found, use embedded template
	return template.New("dashboard").Parse(embeddedTemplate)
}

var embeddedTemplate = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DNS Server Web Interface</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f7fa; color: #333; line-height: 1.6; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 0; margin-bottom: 30px; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
        header h1 { text-align: center; font-size: 2.5em; margin-bottom: 10px; }
        header p { text-align: center; font-size: 1.1em; opacity: 0.9; }
        .nav-tabs { display: flex; gap: 10px; margin-bottom: 20px; }
        .nav-tab { padding: 12px 24px; background: white; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .nav-tab:hover, .nav-tab.active { background: #667eea; color: white; transform: translateY(-2px); }
        .card { background: white; border-radius: 10px; padding: 25px; margin-bottom: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.08); }
        .card h2 { color: #333; margin-bottom: 20px; font-size: 1.5em; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
        .stat-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 25px; border-radius: 10px; text-align: center; transition: transform 0.3s ease; }
        .stat-card:hover { transform: translateY(-5px); }
        .stat-card h3 { font-size: 2.5em; margin-bottom: 10px; }
        .stat-card:nth-child(2) { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
        .stat-card:nth-child(3) { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
        .stat-card:nth-child(4) { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { padding: 15px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; font-weight: 600; color: #333; }
        tr:hover { background: #f5f7fa; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .badge-success { background: #d4edda; color: #155724; }
        .badge-warning { background: #fff3cd; color: #856404; }
        .badge-info { background: #d1ecf1; color: #0c5460; }
        .badge-danger { background: #f8d7da; color: #721c24; }
        .content-section { display: none; }
        .content-section.active { display: block; }
        .loading { text-align: center; padding: 40px; color: #666; }
        .refresh-btn { background: #667eea; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 14px; }
        .refresh-btn:hover { background: #5a6fd6; }
    </style>
</head>
<body>
    <div class="container">
        <header><h1>🔒 DNS Server Dashboard</h1><p>Real-time monitoring and management for your local DNS server</p></header>
        <div class="nav-tabs">
            <button class="nav-tab active" onclick="showSection('stats')">📊 Statistics</button>
            <button class="nav-tab" onclick="showSection('logs')">📋 Query Logs</button>
            <button class="nav-tab" onclick="showSection('cache')">💾 Cache</button>
        </div>
        <div id="stats-section" class="content-section active"><div class="card"><h2>Server Statistics</h2><div id="stats-content" class="loading">Loading...</div></div></div>
        <div id="logs-section" class="content-section"><div class="card"><h2 style="display:flex;justify-content:space-between;align-items:center;">Recent Query Logs<button class="refresh-btn" onclick="refreshLogs()">🔄 Refresh</button></h2><div id="logs-content" class="loading">Loading...</div></div></div>
        <div id="cache-section" class="content-section"><div class="card"><h2 style="display:flex;justify-content:space-between;align-items:center;">DNS Cache<button class="refresh-btn" onclick="refreshCache()">🔄 Refresh</button></h2><div id="cache-content" class="loading">Loading...</div></div></div>
    </div>
    <script>
        function showSection(n){document.querySelectorAll('.content-section').forEach(e=>e.classList.remove('active'));document.querySelectorAll('.nav-tab').forEach(e=>e.classList.remove('active'));document.getElementById(n+'-section').classList.add('active');event.target.classList.add('active');if(n==='stats')refreshStats();else if(n==='logs')refreshLogs();else if(n==='cache')refreshCache();}
        async function refreshStats(){const c=document.getElementById('stats-content');c.innerHTML='<div class="loading">Loading...</div>';try{const r=await fetch('/api/stats'),s=await r.json(),u=Math.floor((Date.now()-new Date(s.StartTime*1000))/(1000*60*60)),h=s.TotalQueries>0?((s.CacheHits/s.TotalQueries)*100).toFixed(1):0;c.innerHTML='<div class="stats-grid"><div class="stat-card"><h3>'+s.TotalQueries.toLocaleString()+'</h3><p>Total Queries</p></div><div class="stat-card"><h3>'+s.CacheHits.toLocaleString()+'</h3><p>Cache Hits</p></div><div class="stat-card"><h3>'+h+'%</h3><p>Hit Rate</p></div><div class="stat-card"><h3>'+u+'h</h3><p>Uptime</p></div></div><table style="margin-top:30px;"><thead><tr><th>Metric</th><th>Count</th></tr></thead><tbody><tr><td>Cache Misses</td><td>'+s.CacheMisses.toLocaleString()+'</td></tr><tr><td>Recursive Queries</td><td>'+s.RecursiveQueries.toLocaleString()+'</td></tr><tr><td>Hosts Queries</td><td>'+s.HostsQueries.toLocaleString()+'</td></tr><tr><td>DoT Queries</td><td>'+s.DOTQueries.toLocaleString()+'</td></tr><tr><td>DoH Queries</td><td>'+s.DOHQueries.toLocaleString()+'</td></tr><tr><td>Error Queries</td><td>'+s.ErrorQueries.toLocaleString()+'</td></tr></tbody></table>';}catch(e){console.error(e);c.innerHTML='<div class="loading">Failed to load</div>';}}
        async function refreshLogs(){const c=document.getElementById('logs-content');c.innerHTML='<div class="loading">Loading...</div>';try{const r=await fetch('/api/logs'),l=await r.json();if(l.length===0){c.innerHTML='<div class="loading">No logs yet</div>';return;}let t='<table><thead><tr><th>Time</th><th>Client IP</th><th>Query</th><th>Source</th><th>Response</th><th>Status</th></tr></thead><tbody>';l.forEach(x=>{const d=new Date(x.Timestamp*1000),ts=d.toLocaleTimeString(),rt=(x.ResponseTime/1e6).toFixed(2);let sb='<span class="badge">'+x.Source+'</span>';if(x.Source==='cache')sb='<span class="badge badge-info">Cache</span>';else if(x.Source==='hosts')sb='<span class="badge badge-warning">Hosts</span>';else if(x.Source==='upstream')sb='<span class="badge badge-success">Upstream</span>';const st=x.Success?'<span class="badge badge-success">OK</span>':'<span class="badge badge-danger">Fail</span>';t+='<tr><td>'+ts+'</td><td>'+x.ClientIP+'</td><td>'+x.Question.Name+'</td><td>'+sb+'</td><td>'+rt+'ms</td><td>'+st+'</td></tr>';});t+='</tbody></table>';c.innerHTML=t;}catch(e){console.error(e);c.innerHTML='<div class="loading">Failed to load</div>';}}
        async function refreshCache(){const c=document.getElementById('cache-content');c.innerHTML='<div class="loading">Loading...</div>';try{const r=await fetch('/api/cache'),ca=await r.json(),en=Object.entries(ca.Entries||{}),lc=new Date(ca.LastCleaned*1000);let h='<div class="stats-grid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin-bottom:30px;"><div class="stat-card"><h3>'+en.length+'</h3><p>Entries</p></div><div class="stat-card"><h3>'+ca.Size+'</h3><p>Current</p></div><div class="stat-card"><h3>'+ca.MaxSize+'</h3><p>Max</p></div></div><p style="margin-bottom:20px;color:#666;"><strong>Last Cleaned:</strong> '+lc.toLocaleString()+'</p>';if(en.length>0){h+='<table><thead><tr><th>Key</th><th>Source</th><th>Created</th><th>Used</th><th>TTL</th></tr></thead><tbody>';en.forEach(([k,e])=>{const ct=new Date(e.CreatedAt*1000),lu=new Date(e.LastUsed*1000),tm=Math.floor(e.TTL/60);h+='<tr><td>'+k+'</td><td><span class="badge badge-info">'+e.Source+'</span></td><td>'+ct.toLocaleString()+'</td><td>'+lu.toLocaleString()+'</td><td>'+tm+'min</td></tr>';});h+='</tbody></table>';}else{h+='<div class="loading">No cache entries</div>';}c.innerHTML=h;}catch(e){console.error(e);c.innerHTML='<div class="loading">Failed to load</div>';}}
        refreshStats();refreshLogs();refreshCache();setInterval(refreshStats,10000);
    </script>
</body>
</html>
`

func Start(addr string, dnsServer dnsserver.DNSServer) error {
	tmpl, err := loadTemplate()
	if err != nil {
		return fmt.Errorf("failed to load template: %w", err)
	}

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if err := tmpl.Execute(w, nil); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	})

	http.HandleFunc("/api/stats", func(w http.ResponseWriter, r *http.Request) {
		stats := dnsServer.GetStats()
		response := map[string]interface{}{
			"TotalQueries":     stats.TotalQueries,
			"CacheHits":        stats.CacheHits,
			"CacheMisses":      stats.CacheMisses,
			"RecursiveQueries": stats.RecursiveQueries,
			"DOTQueries":       stats.DOTQueries,
			"DOHQueries":       stats.DOHQueries,
			"HostsQueries":     stats.HostsQueries,
			"ErrorQueries":     stats.ErrorQueries,
			"StartTime":        stats.StartTime.Unix(),
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	})

	http.HandleFunc("/api/logs", func(w http.ResponseWriter, r *http.Request) {
		logs := dnsServer.GetQueryLogs()
		response := make([]map[string]interface{}, len(logs))
		for i, log := range logs {
			response[i] = map[string]interface{}{
				"Timestamp":    log.Timestamp.Unix(),
				"ClientIP":     log.ClientIP.String(),
				"Question": map[string]interface{}{
					"Name":  log.Question.Name,
					"Type":  log.Question.Type,
					"Class": log.Question.Class,
				},
				"Source":       log.Source,
				"ResponseTime": log.ResponseTime.Nanoseconds(),
				"Success":      log.Success,
				"Error":        log.Error,
				"Answers":      log.Answers,
			}
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	})

	http.HandleFunc("/api/cache", func(w http.ResponseWriter, r *http.Request) {
		cache := dnsServer.GetCache()
		entries := make(map[string]map[string]interface{})
		for key, entry := range cache.Entries {
			entries[key] = map[string]interface{}{
				"Question": map[string]interface{}{
					"Name":  entry.Question.Name,
					"Type":  entry.Question.Type,
					"Class": entry.Question.Class,
				},
				"TTL":       entry.TTL.Seconds(),
				"CreatedAt": entry.CreatedAt.Unix(),
				"LastUsed":  entry.LastUsed.Unix(),
				"Source":    entry.Source,
			}
		}
		response := map[string]interface{}{
			"Entries":     entries,
			"Size":        cache.Size,
			"MaxSize":     cache.MaxSize,
			"LastCleaned": cache.LastCleaned.Unix(),
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	})

	fmt.Printf("Web UI server starting on %s\n", addr)
	return http.ListenAndServe(addr, nil)
}