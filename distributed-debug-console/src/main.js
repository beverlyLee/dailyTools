import { tracingApi, loggingApi, formatDuration, formatTimestamp, getLogLevelClass, getLogLevelDisplay } from './api.js';
import { GanttChart, HeatmapChart } from './charts.js';

const appState = {
  currentView: 'dashboard',
  selectedTraceId: null,
  selectedLogId: null,
  isStreaming: false,
  traces: [],
  logs: [],
  logSources: [],
  ganttChart: null,
  heatmapChart: null,
};

function init() {
  setupNavigation();
  setupEventListeners();
  initCharts();
  loadDemoData();
}

function setupNavigation() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const view = item.dataset.view;
      switchView(view);
    });
  });
}

function switchView(view) {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.view === view);
  });

  document.querySelectorAll('.view').forEach(v => {
    v.classList.toggle('active', v.id === `view-${view}`);
  });

  appState.currentView = view;

  if (view === 'heatmap') {
    refreshHeatmap();
  }
}

function setupEventListeners() {
  document.getElementById('btn-settings').addEventListener('click', () => {
    document.getElementById('settings-modal').classList.add('active');
  });

  document.getElementById('btn-close-settings').addEventListener('click', () => {
    document.getElementById('settings-modal').classList.remove('active');
  });

  document.getElementById('btn-save-settings').addEventListener('click', saveSettings);

  document.getElementById('btn-fetch-traces').addEventListener('click', fetchTraces);
  document.getElementById('btn-refresh-traces').addEventListener('click', refreshDashboardTraces);
  document.getElementById('btn-show-gantt').addEventListener('click', showGanttChart);
  document.getElementById('btn-close-gantt').addEventListener('click', () => {
    document.getElementById('gantt-modal').classList.remove('active');
  });

  document.getElementById('btn-search-logs').addEventListener('click', searchLogs);
  document.getElementById('log-search-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchLogs();
  });

  document.getElementById('btn-toggle-streaming').addEventListener('click', toggleStreaming);
  document.getElementById('log-level-filter').addEventListener('change', filterLogs);

  document.getElementById('btn-refresh-heatmap').addEventListener('click', refreshHeatmap);
  document.getElementById('heatmap-bucket').addEventListener('change', refreshHeatmap);

  document.getElementById('btn-refresh-clusters').addEventListener('click', refreshErrorClusters);

  document.getElementById('context-before').addEventListener('change', refreshLogContext);
  document.getElementById('context-after').addEventListener('change', refreshLogContext);

  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  });
}

function initCharts() {
  appState.ganttChart = new GanttChart('#gantt-chart-container');
  appState.heatmapChart = new HeatmapChart('#heatmap-chart');
}

function loadDemoData() {
  const demoTraces = generateDemoTraces();
  appState.traces = demoTraces;
  
  const demoLogs = generateDemoLogs();
  appState.logs = demoLogs;

  renderTracesList(demoTraces);
  renderLogsList(demoLogs);
  updateDashboardStats();
  
  appState.logSources = [
    { id: '1', name: 'node-1', enabled: true },
    { id: '2', name: 'node-2', enabled: true },
    { id: '3', name: 'node-3', enabled: false },
  ];
  renderLogSources();
  
  refreshErrorClusters();
}

function generateDemoTraces() {
  const traces = [];
  const services = ['api-gateway', 'auth-service', 'user-service', 'order-service', 'payment-service', 'database'];
  const operations = ['GET /api/users', 'POST /api/orders', 'GET /api/payments', 'POST /api/auth/login', 'db.query'];

  for (let i = 0; i < 10; i++) {
    const traceIdStr = traceId(16);
    const spans = [];
    const startTime = Date.now() - i * 60000;
    
    const rootSpan = {
      trace_id: traceIdStr,
      span_id: traceId(8),
      parent_span_id: null,
      operation_name: operations[Math.floor(Math.random() * operations.length)],
      service_name: services[0],
      start_time: new Date(startTime).toISOString(),
      duration_ms: 100 + Math.floor(Math.random() * 2000),
      tags: [],
      logs: [],
      status: Math.random() > 0.8 ? 'Error' : 'Ok',
    };
    
    spans.push(rootSpan);
    
    const numChildren = Math.floor(Math.random() * 4) + 1;
    for (let j = 0; j < numChildren; j++) {
      const childStartTime = startTime + 10 + Math.floor(Math.random() * 100);
      const isSlow = Math.random() > 0.7;
      
      spans.push({
        trace_id: traceIdStr,
        span_id: traceId(8),
        parent_span_id: rootSpan.span_id,
        operation_name: operations[Math.floor(Math.random() * operations.length)],
        service_name: services[j % services.length],
        start_time: new Date(childStartTime).toISOString(),
        duration_ms: isSlow ? 600 + Math.floor(Math.random() * 1000) : 20 + Math.floor(Math.random() * 100),
        tags: [],
        logs: [],
        status: Math.random() > 0.9 ? 'Error' : 'Ok',
      });
    }
    
    const hasError = spans.some(s => s.status === 'Error');
    const hasSlow = spans.some(s => s.duration_ms > 500);
    
    traces.push({
      trace_id: traceIdStr,
      spans,
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(startTime + rootSpan.duration_ms).toISOString(),
      duration_ms: rootSpan.duration_ms,
      service_count: new Set(spans.map(s => s.service_name)).size,
      has_error: hasError,
      has_slow: hasSlow,
    });
  }
  
  return traces;
}

function generateDemoLogs() {
  const logs = [];
  const levels = ['Trace', 'Debug', 'Info', 'Warn', 'Error', 'Fatal'];
  const nodes = ['node-1', 'node-2', 'node-3'];
  const messages = [
    'Connection established to database',
    'User authentication failed: invalid credentials',
    'Processing request from client',
    'Cache miss for key: user:12345',
    'Timeout while connecting to external service',
    'Memory usage exceeded 80% threshold',
    'Request completed successfully',
    'SQL syntax error in query',
    'Disk space running low on /var',
    'New user registered: user@example.com',
  ];
  
  const now = Date.now();
  
  for (let i = 0; i < 100; i++) {
    const timestamp = now - i * 1000;
    const levelIndex = Math.random() > 0.8 ? Math.floor(Math.random() * 6) : 2;
    const level = levels[levelIndex];
    const isError = levelIndex >= 4;
    
    logs.push({
      id: `log-${i}`,
      timestamp: new Date(timestamp).toISOString(),
      level,
      message: isError 
        ? messages[Math.floor(Math.random() * 3) + 1] 
        : messages[Math.floor(Math.random() * messages.length)],
      source: 'file',
      node: nodes[Math.floor(Math.random() * nodes.length)],
      tags: [],
      raw: '',
    });
  }
  
  return logs;
}

function traceId(length) {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function renderTracesList(traces, containerId = 'traces-list') {
  const container = document.getElementById(containerId);
  
  if (!traces || traces.length === 0) {
    container.innerHTML = '<div class="empty-state">暂无追踪数据</div>';
    return;
  }
  
  container.innerHTML = traces.map(trace => `
    <div class="trace-item ${trace.has_error ? 'has-error' : ''}" data-trace-id="${trace.trace_id}">
      <div class="trace-item-header">
        <span class="trace-id">${trace.trace_id.substring(0, 12)}...</span>
        <span class="trace-duration">${formatDuration(trace.duration_ms)}</span>
      </div>
      <div class="trace-item-meta">
        <span>${trace.service_count} 个服务</span>
        <span>${trace.spans.length} 个 Span</span>
        ${trace.has_error ? '<span class="badge error">错误</span>' : ''}
        ${trace.has_slow ? '<span class="badge warning">慢</span>' : ''}
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.trace-item').forEach(item => {
    item.addEventListener('click', () => {
      selectTrace(item.dataset.traceId);
    });
  });

  document.getElementById('trace-count').textContent = traces.length;
}

function selectTrace(traceId) {
  appState.selectedTraceId = traceId;
  
  document.querySelectorAll('.trace-item').forEach(item => {
    item.classList.toggle('selected', item.dataset.traceId === traceId);
  });

  const trace = appState.traces.find(t => t.trace_id === traceId);
  if (trace) {
    renderTraceDetail(trace);
  }
}

function renderTraceDetail(trace) {
  const container = document.getElementById('trace-detail');
  
  container.innerHTML = `
    <div style="padding: 12px; margin-bottom: 16px; background: var(--bg-tertiary); border-radius: 6px;">
      <div><strong>Trace ID:</strong> <code>${trace.trace_id}</code></div>
      <div><strong>持续时间:</strong> ${formatDuration(trace.duration_ms)}</div>
      <div><strong>服务数:</strong> ${trace.service_count}</div>
      <div><strong>Span 数:</strong> ${trace.spans.length}</div>
      <div><strong>状态:</strong> ${trace.has_error ? '<span style="color:#ef4444">有错误</span>' : '<span style="color:#4ade80">正常</span>'}</div>
    </div>
    <h4 style="margin-bottom: 12px; color: var(--text-secondary);">Span 列表</h4>
    ${trace.spans.map(span => {
      const isError = span.status === 'Error';
      const isSlow = span.duration_ms > 500;
      const classes = ['span-detail'];
      if (isError) classes.push('error');
      if (isSlow) classes.push('slow');
      
      return `
        <div class="${classes.join(' ')}">
          <div class="span-header">
            <span class="span-name">${span.operation_name}</span>
            <span class="span-service">${span.service_name}</span>
          </div>
          <div style="display: flex; gap: 16px; font-size: 0.8rem; color: var(--text-secondary);">
            <span>耗时: <span style="color: ${isSlow ? '#f59e0b' : 'var(--text-primary)'}">${formatDuration(span.duration_ms)}</span></span>
            <span>状态: <span style="color: ${isError ? '#ef4444' : '#4ade80'}">${span.status}</span></span>
            ${isSlow ? '<span style="color:#f59e0b">⚠️ 延迟过高</span>' : ''}
          </div>
          ${span.tags && span.tags.length > 0 ? `
            <div class="span-tags">
              ${span.tags.map(tag => `
                <span class="tag-item">
                  <span class="tag-key">${tag.key}:</span>
                  <span class="tag-value">${tag.value}</span>
                </span>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `;
    }).join('')}
  `;
}

async function fetchTraces() {
  const service = document.getElementById('tracing-service-filter').value || null;
  const operation = document.getElementById('tracing-operation-filter').value || null;
  
  try {
    const traces = await tracingApi.getTraces(service, operation, 50);
    if (traces && traces.length > 0) {
      appState.traces = traces;
      renderTracesList(traces);
    }
  } catch (e) {
    console.log('Using demo traces data');
  }
}

function refreshDashboardTraces() {
  renderTracesList(appState.traces.slice(0, 5), 'recent-traces-list');
}

async function showGanttChart() {
  if (!appState.selectedTraceId) {
    alert('请先选择一个追踪');
    return;
  }
  
  document.getElementById('gantt-modal').classList.add('active');
  
  try {
    const ganttData = await tracingApi.getTraceGanttData(appState.selectedTraceId);
    if (ganttData && ganttData.spans) {
      setTimeout(() => {
        appState.ganttChart.render(ganttData);
      }, 100);
    }
  } catch (e) {
    const trace = appState.traces.find(t => t.trace_id === appState.selectedTraceId);
    if (trace) {
      const ganttSpans = trace.spans.map((span, index) => ({
        id: span.span_id,
        parent_id: span.parent_span_id,
        label: span.operation_name,
        service: span.service_name,
        start_ms: index * 50,
        duration_ms: span.duration_ms,
        status: span.status,
        is_slow: span.duration_ms > 500,
        depth: 0,
      }));
      
      setTimeout(() => {
        appState.ganttChart.render({
          trace_id: trace.trace_id,
          total_duration_ms: trace.duration_ms,
          spans: ganttSpans,
          critical_path: [],
          slow_spans: ganttSpans.filter(s => s.is_slow).map(s => s.id),
          error_spans: ganttSpans.filter(s => s.status === 'Error').map(s => s.id),
        });
      }, 100);
    }
  }
}

function renderLogsList(logs) {
  const container = document.getElementById('logs-list');
  
  if (!logs || logs.length === 0) {
    container.innerHTML = '<div class="empty-state">暂无日志数据</div>';
    return;
  }
  
  container.innerHTML = logs.map(log => `
    <div class="log-entry ${getLogLevelClass(log.level)}" data-log-id="${log.id}">
      <span class="log-timestamp">${formatTimestamp(log.timestamp)}</span>
      <span class="log-level ${log.level.toLowerCase()}">${getLogLevelDisplay(log.level)}</span>
      <span class="log-node">[${log.node}]</span>
      <span class="log-message">${escapeHtml(log.message)}</span>
    </div>
  `).join('');

  container.querySelectorAll('.log-entry').forEach(item => {
    item.addEventListener('click', () => {
      selectLog(item.dataset.logId);
    });
  });

  document.getElementById('log-count').textContent = logs.length;
}

function selectLog(logId) {
  appState.selectedLogId = logId;
  
  document.querySelectorAll('.log-entry').forEach(item => {
    item.classList.toggle('selected', item.dataset.logId === logId);
  });

  refreshLogContext();
}

async function refreshLogContext() {
  if (!appState.selectedLogId) return;
  
  const before = parseInt(document.getElementById('context-before').value) || 10;
  const after = parseInt(document.getElementById('context-after').value) || 10;
  
  try {
    const context = await loggingApi.getLogContext(appState.selectedLogId, before, after);
    renderLogContext(context, appState.selectedLogId);
  } catch (e) {
    const logIndex = appState.logs.findIndex(l => l.id === appState.selectedLogId);
    if (logIndex >= 0) {
      const start = Math.max(0, logIndex - before);
      const end = Math.min(appState.logs.length, logIndex + after + 1);
      const context = appState.logs.slice(start, end);
      renderLogContext(context, appState.selectedLogId);
    }
  }
}

function renderLogContext(context, selectedId) {
  const container = document.getElementById('log-context');
  
  if (!context || context.length === 0) {
    container.innerHTML = '<div class="empty-state">暂无上下文数据</div>';
    return;
  }
  
  container.innerHTML = context.map(log => `
    <div class="log-entry ${getLogLevelClass(log.level)} ${log.id === selectedId ? 'selected' : ''}">
      <span class="log-timestamp">${formatTimestamp(log.timestamp)}</span>
      <span class="log-level ${log.level.toLowerCase()}">${getLogLevelDisplay(log.level)}</span>
      <span class="log-message">${escapeHtml(log.message)}</span>
    </div>
  `).join('');
}

async function searchLogs() {
  const query = document.getElementById('log-search-input').value.trim();
  
  if (!query) {
    renderLogsList(appState.logs);
    return;
  }
  
  try {
    const results = await loggingApi.searchLogs(query, 100);
    renderLogsList(results);
  } catch (e) {
    const lowerQuery = query.toLowerCase();
    const results = appState.logs.filter(log => 
      log.message.toLowerCase().includes(lowerQuery) ||
      log.node.toLowerCase().includes(lowerQuery) ||
      log.level.toLowerCase().includes(lowerQuery)
    );
    renderLogsList(results);
  }
}

function filterLogs() {
  const level = document.getElementById('log-level-filter').value;
  
  if (!level) {
    renderLogsList(appState.logs);
    return;
  }
  
  const filtered = appState.logs.filter(log => log.level === level);
  renderLogsList(filtered);
}

async function toggleStreaming() {
  const statusEl = document.getElementById('streaming-status');
  
  if (appState.isStreaming) {
    try {
      await loggingApi.stopStreaming();
    } catch (e) {}
    appState.isStreaming = false;
    statusEl.classList.remove('active');
    statusEl.textContent = '开始流式';
  } else {
    try {
      await loggingApi.startStreaming();
    } catch (e) {}
    appState.isStreaming = true;
    statusEl.classList.add('active');
    statusEl.textContent = '停止流式';
    
    simulateStreaming();
  }
}

function simulateStreaming() {
  if (!appState.isStreaming) return;
  
  const levels = ['Info', 'Debug', 'Warn', 'Error'];
  const nodes = ['node-1', 'node-2', 'node-3'];
  const messages = [
    'Health check passed',
    'Processing incoming request',
    'Cache hit for key: session:abc123',
    'Connection pool connection established',
    'User session expired for user: test@example.com',
  ];
  
  const newLog = {
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    level: levels[Math.floor(Math.random() * levels.length)],
    message: messages[Math.floor(Math.random() * messages.length)],
    source: 'stream',
    node: nodes[Math.floor(Math.random() * nodes.length)],
    tags: [],
    raw: '',
  };
  
  appState.logs.unshift(newLog);
  if (appState.logs.length > 1000) {
    appState.logs.pop();
  }
  
  const levelFilter = document.getElementById('log-level-filter').value;
  if (!levelFilter || newLog.level === levelFilter) {
    const container = document.getElementById('logs-list');
    const firstChild = container.firstChild;
    const logEl = document.createElement('div');
    logEl.className = `log-entry ${getLogLevelClass(newLog.level)}`;
    logEl.dataset.logId = newLog.id;
    logEl.innerHTML = `
      <span class="log-timestamp">${formatTimestamp(newLog.timestamp)}</span>
      <span class="log-level ${newLog.level.toLowerCase()}">${getLogLevelDisplay(newLog.level)}</span>
      <span class="log-node">[${newLog.node}]</span>
      <span class="log-message">${escapeHtml(newLog.message)}</span>
    `;
    logEl.addEventListener('click', () => selectLog(newLog.id));
    container.insertBefore(logEl, firstChild);
  }
  
  updateDashboardStats();
  
  setTimeout(simulateStreaming, 2000);
}

function renderLogSources() {
  const container = document.getElementById('log-sources-list');
  
  if (!appState.logSources || appState.logSources.length === 0) {
    container.innerHTML = '<div class="empty-state">暂无日志源</div>';
    return;
  }
  
  container.innerHTML = appState.logSources.map(source => `
    <div class="source-item" data-source-id="${source.id}">
      <span class="source-name">${source.name}</span>
      <span class="source-status ${source.enabled ? 'active' : 'inactive'}"></span>
    </div>
  `).join('');
}

async function refreshErrorClusters() {
  const container = document.getElementById('error-clusters-list');
  
  try {
    const clusters = await loggingApi.getErrorClusters();
    renderErrorClusters(clusters);
  } catch (e) {
    const errorLogs = appState.logs.filter(l => l.level === 'Error' || l.level === 'Fatal');
    
    const patterns = {};
    errorLogs.forEach(log => {
      const pattern = log.message.replace(/\d+/g, '<NUM>');
      if (!patterns[pattern]) {
        patterns[pattern] = { count: 0, logs: [], first: log };
      patterns[pattern].count++;
      patterns[pattern].logs.push(log);
    });
    
    const clusters = Object.entries(patterns).map(([pattern, data]) => ({
      id: `cluster-${Math.random()}`,
      pattern,
      count: data.count,
      first_seen: data.logs[data.logs.length - 1]?.timestamp || new Date().toISOString(),
      last_seen: data.logs[0]?.timestamp || new Date().toISOString(),
      sample_logs: data.logs.slice(0, 3),
      severity: data.logs.some(l => l.level === 'Fatal') ? 'Fatal' : 'Error',
    }));
    
    renderErrorClusters(clusters.slice(0, 5));
  }
}

function renderErrorClusters(clusters) {
  const container = document.getElementById('error-clusters-list');
  
  if (!clusters || clusters.length === 0) {
    container.innerHTML = '<div class="empty-state">暂无错误聚类</div>';
    return;
  }
  
  container.innerHTML = clusters.map(cluster => `
    <div class="cluster-item">
      <div class="cluster-pattern">${escapeHtml(cluster.pattern.substring(0, 100))}${cluster.pattern.length > 100 ? '...' : ''}</div>
      <div class="cluster-meta">
        <span>${cluster.count} 次</span>
        <span class="badge ${cluster.severity === 'Fatal' ? 'error' : 'warning'}">${cluster.severity}</span>
      </div>
    </div>
  `).join('');
}

async function refreshHeatmap() {
  const bucketSeconds = parseInt(document.getElementById('heatmap-bucket').value) || 600;
  
  try {
    const data = await loggingApi.getHeatmapData(bucketSeconds);
    renderHeatmap(data);
  } catch (e) {
    const nodes = ['node-1', 'node-2', 'node-3'];
    const now = Date.now();
    const data = [];
    
    for (let i = 0; i < 10; i++) {
      const bucketTime = new Date(now - i * bucketSeconds * 1000);
      const timeBucket = bucketTime.toLocaleString('zh-CN', { 
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      nodes.forEach(node => {
        const errorCount = Math.floor(Math.random() * 20);
        const warnCount = Math.floor(Math.random() * 30);
        data.push({
          time_bucket: timeBucket,
          node,
          error_count: errorCount,
          warn_count: warnCount,
          total_count: errorCount + warnCount + Math.floor(Math.random() * 100),
        });
      });
    }
    
    renderHeatmap(data);
  }
}

function renderHeatmap(data) {
  setTimeout(() => {
    appState.heatmapChart.render(data);
  }, 100);
}

function updateDashboardStats() {
  document.getElementById('stat-traces').textContent = appState.traces.length;
  document.getElementById('stat-logs').textContent = appState.logs.length;
  
  const slowSpans = appState.traces.reduce((count, trace) => {
    return count + trace.spans.filter(s => s.duration_ms > 500).length;
  }, 0);
  document.getElementById('stat-slow-spans').textContent = slowSpans;
  
  const errorTraces = appState.traces.filter(t => t.has_error).length;
  document.getElementById('stat-error-traces').textContent = errorTraces;
}

function saveSettings() {
  const jaeger = document.getElementById('setting-jaeger').value;
  const zipkin = document.getElementById('setting-zipkin').value;
  const slowThreshold = parseInt(document.getElementById('setting-slow-threshold').value) || 500;
  
  if (jaeger) {
    tracingApi.configureJaeger(jaeger).catch(() => {});
  }
  if (zipkin) {
    tracingApi.configureZipkin(zipkin).catch(() => {});
  }
  
  document.getElementById('settings-modal').classList.remove('active');
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', init);
