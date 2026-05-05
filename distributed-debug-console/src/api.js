import { invoke } from '@tauri-apps/api';

export const tracingApi = {
  async configureJaeger(endpoint) {
    return invoke('configure_jaeger', { endpoint });
  },

  async configureZipkin(endpoint) {
    return invoke('configure_zipkin', { endpoint });
  },

  async getTraces(service = null, operation = null, limit = 50) {
    return invoke('get_traces', { service, operation, limit });
  },

  async getTraceDetail(traceId) {
    return invoke('get_trace_detail', { traceId });
  },

  async getTraceGanttData(traceId) {
    return invoke('get_trace_gantt_data', { traceId });
  },

  async getSlowSpans(thresholdMs = null) {
    return invoke('get_slow_spans', { thresholdMs });
  },

  async getErrorTraces() {
    return invoke('get_error_traces');
  },
};

export const loggingApi = {
  async configureLogSources(sources) {
    return invoke('configure_log_sources', { sources });
  },

  async addLogSource(source) {
    return invoke('add_log_source', { source });
  },

  async removeLogSource(sourceId) {
    return invoke('remove_log_source', { sourceId });
  },

  async getLogs(limit = null, level = null, node = null) {
    return invoke('get_logs', { limit, level, node });
  },

  async searchLogs(query, limit = null) {
    return invoke('search_logs', { query, limit });
  },

  async getLogContext(logId, before = 10, after = 10) {
    return invoke('get_log_context', { logId, before, after });
  },

  async getErrorClusters() {
    return invoke('get_error_clusters');
  },

  async getHeatmapData(bucketSeconds = 600) {
    return invoke('get_heatmap_data', { bucketSeconds });
  },

  async startStreaming() {
    return invoke('start_log_streaming');
  },

  async stopStreaming() {
    return invoke('stop_log_streaming');
  },
};

export function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(2)}m`;
  return `${(ms / 3600000).toFixed(2)}h`;
}

export function formatTimestamp(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  });
}

export function getLogLevelClass(level) {
  return `level-${level.toLowerCase()}`;
}

export function getLogLevelDisplay(level) {
  return level.toUpperCase();
}
