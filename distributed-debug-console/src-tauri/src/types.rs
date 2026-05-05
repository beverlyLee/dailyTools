use crate::tracing;
use crate::logging;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use std::sync::Arc;
use parking_lot::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppState {
    pub tracing_config: Arc<Mutex<tracing::TracingConfig>>,
    pub logging_config: Arc<Mutex<logging::LoggingConfig>>,
    pub log_buffer: Arc<Mutex<logging::LogBuffer>>,
    pub trace_buffer: Arc<Mutex<tracing::TraceBuffer>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Span {
    pub trace_id: String,
    pub span_id: String,
    pub parent_span_id: Option<String>,
    pub operation_name: String,
    pub service_name: String,
    pub start_time: DateTime<Utc>,
    pub duration_ms: u64,
    pub tags: Vec<Tag>,
    pub logs: Vec<SpanLog>,
    pub status: SpanStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tag {
    pub key: String,
    pub value: TagValue,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum TagValue {
    String(String),
    Int(i64),
    Float(f64),
    Bool(bool),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpanLog {
    pub timestamp: DateTime<Utc>,
    pub fields: Vec<Tag>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SpanStatus {
    Ok,
    Error,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Trace {
    pub trace_id: String,
    pub spans: Vec<Span>,
    pub start_time: DateTime<Utc>,
    pub end_time: DateTime<Utc>,
    pub duration_ms: u64,
    pub service_count: usize,
    pub has_error: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntry {
    pub id: String,
    pub timestamp: DateTime<Utc>,
    pub level: LogLevel,
    pub message: String,
    pub source: String,
    pub node: String,
    pub tags: Vec<Tag>,
    pub raw: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LogLevel {
    Trace,
    Debug,
    Info,
    Warn,
    Error,
    Fatal,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogCluster {
    pub id: String,
    pub pattern: String,
    pub count: u64,
    pub first_seen: DateTime<Utc>,
    pub last_seen: DateTime<Utc>,
    pub sample_logs: Vec<LogEntry>,
    pub severity: LogLevel,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HeatmapPoint {
    pub time_bucket: String,
    pub node: String,
    pub error_count: u64,
    pub warn_count: u64,
    pub total_count: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GanttSpan {
    pub id: String,
    pub parent_id: Option<String>,
    pub label: String,
    pub service: String,
    pub start_ms: u64,
    pub duration_ms: u64,
    pub status: SpanStatus,
    pub is_slow: bool,
    pub depth: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GanttData {
    pub trace_id: String,
    pub total_duration_ms: u64,
    pub spans: Vec<GanttSpan>,
    pub critical_path: Vec<String>,
    pub slow_spans: Vec<String>,
    pub error_spans: Vec<String>,
}
