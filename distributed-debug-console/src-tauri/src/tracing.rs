use crate::types::*;
use chrono::{DateTime, Utc, TimeZone};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, VecDeque};
use reqwest::Client;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TracingConfig {
    pub jaeger_endpoint: Option<String>,
    pub zipkin_endpoint: Option<String>,
    pub slow_span_threshold_ms: u64,
}

impl Default for TracingConfig {
    fn default() -> Self {
        Self {
            jaeger_endpoint: None,
            zipkin_endpoint: None,
            slow_span_threshold_ms: 500,
        }
    }
}

pub struct TraceBuffer {
    traces: VecDeque<Trace>,
    max_size: usize,
}

impl TraceBuffer {
    pub fn new(max_size: usize) -> Self {
        Self {
            traces: VecDeque::with_capacity(max_size),
            max_size,
        }
    }

    pub fn add(&mut self, trace: Trace) {
        if self.traces.len() >= self.max_size {
            self.traces.pop_front();
        }
        self.traces.push_back(trace);
    }

    pub fn get_all(&self) -> Vec<Trace> {
        self.traces.iter().cloned().collect()
    }

    pub fn get_by_id(&self, trace_id: &str) -> Option<&Trace> {
        self.traces.iter().find(|t| t.trace_id == trace_id)
    }
}

#[tauri::command]
pub fn configure_jaeger(endpoint: String, state: tauri::State<'_, AppState>) -> Result<(), String> {
    let mut config = state.tracing_config.lock();
    config.jaeger_endpoint = Some(endpoint);
    Ok(())
}

#[tauri::command]
pub fn configure_zipkin(endpoint: String, state: tauri::State<'_, AppState>) -> Result<(), String> {
    let mut config = state.tracing_config.lock();
    config.zipkin_endpoint = Some(endpoint);
    Ok(())
}

#[tauri::command]
pub async fn get_traces(
    service: Option<String>,
    operation: Option<String>,
    limit: Option<usize>,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<Trace>, String> {
    let config = state.tracing_config.lock();
    let client = Client::new();
    let limit = limit.unwrap_or(50);

    if let Some(ref jaeger_url) = config.jaeger_endpoint {
        return fetch_jaeger_traces(&client, jaeger_url, service, operation, limit).await;
    }

    if let Some(ref zipkin_url) = config.zipkin_endpoint {
        return fetch_zipkin_traces(&client, zipkin_url, service, operation, limit).await;
    }

    let buffer = state.trace_buffer.lock();
    let mut traces = buffer.get_all();
    traces.truncate(limit);
    Ok(traces)
}

async fn fetch_jaeger_traces(
    client: &Client,
    endpoint: &str,
    service: Option<String>,
    operation: Option<String>,
    limit: usize,
) -> Result<Vec<Trace>, String> {
    let mut url = format!("{}/api/traces", endpoint);
    url.push_str(&format!("?limit={}", limit));
    
    if let Some(s) = service {
        url.push_str(&format!("&service={}", s));
    }
    if let Some(o) = operation {
        url.push_str(&format!("&operation={}", o));
    }

    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| e.to_string())?;

    let traces = parse_jaeger_traces(&json);
    Ok(traces)
}

async fn fetch_zipkin_traces(
    client: &Client,
    endpoint: &str,
    service: Option<String>,
    operation: Option<String>,
    limit: usize,
) -> Result<Vec<Trace>, String> {
    let mut url = format!("{}/api/v2/traces", endpoint);
    url.push_str(&format!("?limit={}", limit));
    
    if let Some(s) = service {
        url.push_str(&format!("&serviceName={}", s));
    }
    if let Some(o) = operation {
        url.push_str(&format!("&spanName={}", o));
    }

    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| e.to_string())?;

    let traces = parse_zipkin_traces(&json);
    Ok(traces)
}

fn parse_jaeger_traces(json: &serde_json::Value) -> Vec<Trace> {
    let mut traces = Vec::new();
    
    if let Some(data) = json.get("data").and_then(|d| d.as_array()) {
        for trace_data in data {
            if let Some(trace) = parse_jaeger_trace(trace_data) {
                traces.push(trace);
            }
        }
    }
    
    traces
}

fn parse_jaeger_trace(trace_data: &serde_json::Value) -> Option<Trace> {
    let trace_id = trace_data.get("traceID")?.as_str()?.to_string();
    let spans_data = trace_data.get("spans")?.as_array()?;
    
    let mut spans = Vec::new();
    for span_data in spans_data {
        if let Some(span) = parse_jaeger_span(span_data) {
            spans.push(span);
        }
    }
    
    if spans.is_empty() {
        return None;
    }
    
    let start_time = spans.iter().map(|s| s.start_time).min()?;
    let end_time = spans.iter().map(|s| {
        s.start_time + chrono::Duration::milliseconds(s.duration_ms as i64)
    }).max()?;
    let duration_ms = (end_time - start_time).num_milliseconds() as u64;
    
    let services: std::collections::HashSet<_> = spans.iter().map(|s| s.service_name.as_str()).collect();
    let has_error = spans.iter().any(|s| matches!(s.status, SpanStatus::Error));
    
    Some(Trace {
        trace_id,
        spans,
        start_time,
        end_time,
        duration_ms,
        service_count: services.len(),
        has_error,
    })
}

fn parse_jaeger_span(span_data: &serde_json::Value) -> Option<Span> {
    let trace_id = span_data.get("traceID")?.as_str()?.to_string();
    let span_id = span_data.get("spanID")?.as_str()?.to_string();
    let operation_name = span_data.get("operationName")?.as_str()?.to_string();
    
    let parent_span_id = span_data
        .get("references")
        .and_then(|r| r.as_array())
        .and_then(|refs| {
            refs.iter()
                .find(|r| r.get("refType").and_then(|t| t.as_str()) == Some("CHILD_OF"))
                .and_then(|r| r.get("spanID").and_then(|id| id.as_str().map(String::from)))
        });
    
    let start_time_us = span_data.get("startTime")?.as_u64()?;
    let duration_us = span_data.get("duration")?.as_u64()?;
    let start_time = Utc.timestamp_opt(
        (start_time_us / 1_000_000) as i64,
        ((start_time_us % 1_000_000) * 1000) as u32,
    ).single()?;
    
    let tags = parse_tags(span_data.get("tags"));
    let logs = parse_span_logs(span_data.get("logs"));
    
    let service_name = tags
        .iter()
        .find(|t| t.key == "service" || t.key == "jaeger.service")
        .and_then(|t| match &t.value {
            TagValue::String(s) => Some(s.clone()),
            _ => None,
        })
        .unwrap_or_else(|| "unknown".to_string());
    
    let status = if tags.iter().any(|t| t.key == "error" && matches!(t.value, TagValue::Bool(true))) {
        SpanStatus::Error
    } else {
        SpanStatus::Ok
    };
    
    Some(Span {
        trace_id,
        span_id,
        parent_span_id,
        operation_name,
        service_name,
        start_time,
        duration_ms: duration_us / 1000,
        tags,
        logs,
        status,
    })
}

fn parse_zipkin_traces(json: &serde_json::Value) -> Vec<Trace> {
    let mut traces = Vec::new();
    
    if let Some(traces_data) = json.as_array() {
        for trace_spans in traces_data {
            if let Some(trace) = parse_zipkin_trace(trace_spans) {
                traces.push(trace);
            }
        }
    }
    
    traces
}

fn parse_zipkin_trace(trace_spans: &serde_json::Value) -> Option<Trace> {
    let spans_data = trace_spans.as_array()?;
    
    let mut spans = Vec::new();
    let mut trace_id = None;
    
    for span_data in spans_data {
        if let Some(span) = parse_zipkin_span(span_data) {
            if trace_id.is_none() {
                trace_id = Some(span.trace_id.clone());
            }
            spans.push(span);
        }
    }
    
    if spans.is_empty() || trace_id.is_none() {
        return None;
    }
    
    let start_time = spans.iter().map(|s| s.start_time).min()?;
    let end_time = spans.iter().map(|s| {
        s.start_time + chrono::Duration::milliseconds(s.duration_ms as i64)
    }).max()?;
    let duration_ms = (end_time - start_time).num_milliseconds() as u64;
    
    let services: std::collections::HashSet<_> = spans.iter().map(|s| s.service_name.as_str()).collect();
    let has_error = spans.iter().any(|s| matches!(s.status, SpanStatus::Error));
    
    Some(Trace {
        trace_id: trace_id?,
        spans,
        start_time,
        end_time,
        duration_ms,
        service_count: services.len(),
        has_error,
    })
}

fn parse_zipkin_span(span_data: &serde_json::Value) -> Option<Span> {
    let trace_id = span_data.get("traceId")?.as_str()?.to_string();
    let span_id = span_data.get("id")?.as_str()?.to_string();
    let name = span_data.get("name")?.as_str()?.to_string();
    
    let parent_span_id = span_data
        .get("parentId")
        .and_then(|id| id.as_str().map(String::from));
    
    let timestamp_us = span_data.get("timestamp")?.as_u64()?;
    let duration_us = span_data.get("duration")?.as_u64()?;
    let start_time = Utc.timestamp_opt(
        (timestamp_us / 1_000_000) as i64,
        ((timestamp_us % 1_000_000) * 1000) as u32,
    ).single()?;
    
    let tags = parse_tags(span_data.get("tags"));
    
    let service_name = span_data
        .get("localEndpoint")
        .and_then(|e| e.get("serviceName"))
        .and_then(|s| s.as_str().map(String::from))
        .unwrap_or_else(|| "unknown".to_string());
    
    let status = if tags.iter().any(|t| t.key == "error") {
        SpanStatus::Error
    } else {
        SpanStatus::Ok
    };
    
    Some(Span {
        trace_id,
        span_id,
        parent_span_id,
        operation_name: name,
        service_name,
        start_time,
        duration_ms: duration_us / 1000,
        tags,
        logs: Vec::new(),
        status,
    })
}

fn parse_tags(tags_value: Option<&serde_json::Value>) -> Vec<Tag> {
    let mut tags = Vec::new();
    
    if let Some(tag_array) = tags_value.and_then(|v| v.as_array()) {
        for tag in tag_array {
            if let (Some(key), Some(value)) = (tag.get("key"), tag.get("value")) {
                if let Some(key_str) = key.as_str() {
                    let tag_value = if let Some(s) = value.as_str() {
                        TagValue::String(s.to_string())
                    } else if let Some(n) = value.as_i64() {
                        TagValue::Int(n)
                    } else if let Some(f) = value.as_f64() {
                        TagValue::Float(f)
                    } else if let Some(b) = value.as_bool() {
                        TagValue::Bool(b)
                    } else {
                        continue;
                    };
                    tags.push(Tag {
                        key: key_str.to_string(),
                        value: tag_value,
                    });
                }
            }
        }
    } else if let Some(tag_object) = tags_value.and_then(|v| v.as_object()) {
        for (key, value) in tag_object {
            let tag_value = if let Some(s) = value.as_str() {
                TagValue::String(s.to_string())
            } else if let Some(n) = value.as_i64() {
                TagValue::Int(n)
            } else if let Some(f) = value.as_f64() {
                TagValue::Float(f)
            } else if let Some(b) = value.as_bool() {
                TagValue::Bool(b)
            } else {
                continue;
            };
            tags.push(Tag {
                key: key.to_string(),
                value: tag_value,
            });
        }
    }
    
    tags
}

fn parse_span_logs(logs_value: Option<&serde_json::Value>) -> Vec<SpanLog> {
    let mut logs = Vec::new();
    
    if let Some(log_array) = logs_value.and_then(|v| v.as_array()) {
        for log in log_array {
            if let Some(ts) = log.get("timestamp").and_then(|t| t.as_u64()) {
                let timestamp = Utc.timestamp_opt(
                    (ts / 1_000_000) as i64,
                    ((ts % 1_000_000) * 1000) as u32,
                ).single();
                
                if let Some(t) = timestamp {
                    let fields = parse_tags(log.get("fields"));
                    logs.push(SpanLog {
                        timestamp: t,
                        fields,
                    });
                }
            }
        }
    }
    
    logs
}

#[tauri::command]
pub fn get_trace_detail(
    trace_id: String,
    state: tauri::State<'_, AppState>,
) -> Result<Trace, String> {
    let buffer = state.trace_buffer.lock();
    buffer.get_by_id(&trace_id)
        .cloned()
        .ok_or_else(|| format!("Trace {} not found", trace_id))
}

#[tauri::command]
pub fn get_trace_gantt_data(
    trace_id: String,
    state: tauri::State<'_, AppState>,
) -> Result<GanttData, String> {
    let buffer = state.trace_buffer.lock();
    let trace = buffer.get_by_id(&trace_id)
        .ok_or_else(|| format!("Trace {} not found", trace_id))?;
    
    let config = state.tracing_config.lock();
    let threshold = config.slow_span_threshold_ms;
    
    let mut span_map: HashMap<String, &Span> = HashMap::new();
    let mut children_map: HashMap<String, Vec<&Span>> = HashMap::new();
    
    for span in &trace.spans {
        span_map.insert(span.span_id.clone(), span);
        if let Some(ref parent_id) = span.parent_span_id {
            children_map
                .entry(parent_id.clone())
                .or_default()
                .push(span);
        }
    }
    
    let root_spans: Vec<&Span> = trace.spans
        .iter()
        .filter(|s| s.parent_span_id.is_none())
        .collect();
    
    let mut gantt_spans = Vec::new();
    let mut visited = std::collections::HashSet::new();
    let mut slow_spans = Vec::new();
    let mut error_spans = Vec::new();
    
    let trace_start = trace.start_time.timestamp_millis() as u64;
    
    for root in root_spans {
        build_gantt_spans(
            root,
            &span_map,
            &children_map,
            0,
            trace_start,
            threshold,
            &mut gantt_spans,
            &mut visited,
            &mut slow_spans,
            &mut error_spans,
        );
    }
    
    let critical_path = find_critical_path(&trace.spans, &span_map);
    
    Ok(GanttData {
        trace_id: trace.trace_id.clone(),
        total_duration_ms: trace.duration_ms,
        spans: gantt_spans,
        critical_path,
        slow_spans,
        error_spans,
    })
}

fn build_gantt_spans(
    span: &Span,
    span_map: &HashMap<String, &Span>,
    children_map: &HashMap<String, Vec<&Span>>,
    depth: usize,
    trace_start_ms: u64,
    threshold_ms: u64,
    result: &mut Vec<GanttSpan>,
    visited: &mut std::collections::HashSet<String>,
    slow_spans: &mut Vec<String>,
    error_spans: &mut Vec<String>,
) {
    if visited.contains(&span.span_id) {
        return;
    }
    visited.insert(span.span_id.clone());
    
    let start_ms = (span.start_time.timestamp_millis() as u64) - trace_start_ms;
    let is_slow = span.duration_ms > threshold_ms;
    
    let gantt_span = GanttSpan {
        id: span.span_id.clone(),
        parent_id: span.parent_span_id.clone(),
        label: span.operation_name.clone(),
        service: span.service_name.clone(),
        start_ms,
        duration_ms: span.duration_ms,
        status: span.status.clone(),
        is_slow,
        depth,
    };
    
    if is_slow {
        slow_spans.push(span.span_id.clone());
    }
    if matches!(span.status, SpanStatus::Error) {
        error_spans.push(span.span_id.clone());
    }
    
    result.push(gantt_span);
    
    if let Some(children) = children_map.get(&span.span_id) {
        for child in children {
            build_gantt_spans(
                child,
                span_map,
                children_map,
                depth + 1,
                trace_start_ms,
                threshold_ms,
                result,
                visited,
                slow_spans,
                error_spans,
            );
        }
    }
}

fn find_critical_path(
    spans: &[Span],
    span_map: &HashMap<String, &Span>,
) -> Vec<String> {
    let mut max_end = 0;
    let mut last_span: Option<&Span> = None;
    
    for span in spans {
        let end = (span.start_time.timestamp_millis() as u64) + span.duration_ms;
        if end > max_end {
            max_end = end;
            last_span = Some(span);
        }
    }
    
    let mut path = Vec::new();
    let mut current = last_span;
    
    while let Some(span) = current {
        path.push(span.span_id.clone());
        current = span.parent_span_id.as_ref().and_then(|id| span_map.get(id).copied());
    }
    
    path.reverse();
    path
}

#[tauri::command]
pub fn get_slow_spans(
    threshold_ms: Option<u64>,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<Span>, String> {
    let config = state.tracing_config.lock();
    let threshold = threshold_ms.unwrap_or(config.slow_span_threshold_ms);
    
    let buffer = state.trace_buffer.lock();
    let mut slow_spans = Vec::new();
    
    for trace in buffer.get_all() {
        for span in trace.spans {
            if span.duration_ms > threshold {
                slow_spans.push(span);
            }
        }
    }
    
    slow_spans.sort_by(|a, b| b.duration_ms.cmp(&a.duration_ms));
    Ok(slow_spans)
}

#[tauri::command]
pub fn get_error_traces(
    state: tauri::State<'_, AppState>,
) -> Result<Vec<Trace>, String> {
    let buffer = state.trace_buffer.lock();
    let error_traces: Vec<Trace> = buffer
        .get_all()
        .into_iter()
        .filter(|t| t.has_error)
        .collect();
    
    Ok(error_traces)
}
