use crate::types::*;
use chrono::{DateTime, Utc, TimeZone};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, VecDeque, BTreeMap};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogSource {
    pub id: String,
    pub name: String,
    pub source_type: LogSourceType,
    pub connection_string: String,
    pub node_name: String,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LogSourceType {
    File,
    Tcp,
    Udp,
    Http,
    Kafka,
    Redis,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoggingConfig {
    pub sources: Vec<LogSource>,
    pub is_streaming: bool,
}

impl Default for LoggingConfig {
    fn default() -> Self {
        Self {
            sources: Vec::new(),
            is_streaming: false,
        }
    }
}

pub struct LogBuffer {
    logs: VecDeque<LogEntry>,
    max_size: usize,
    index_by_level: HashMap<LogLevel, Vec<String>>,
    index_by_node: HashMap<String, Vec<String>>,
    index_by_time: BTreeMap<i64, Vec<String>>,
}

impl LogBuffer {
    pub fn new(max_size: usize) -> Self {
        Self {
            logs: VecDeque::with_capacity(max_size),
            max_size,
            index_by_level: HashMap::new(),
            index_by_node: HashMap::new(),
            index_by_time: BTreeMap::new(),
        }
    }

    pub fn add(&mut self, entry: LogEntry) {
        if self.logs.len() >= self.max_size {
            if let Some(removed) = self.logs.pop_front() {
                self.remove_from_indexes(&removed);
            }
        }
        
        self.add_to_indexes(&entry);
        self.logs.push_back(entry);
    }

    fn add_to_indexes(&mut self, entry: &LogEntry) {
        self.index_by_level
            .entry(entry.level.clone())
            .or_default()
            .push(entry.id.clone());
        
        self.index_by_node
            .entry(entry.node.clone())
            .or_default()
            .push(entry.id.clone());
        
        let time_key = entry.timestamp.timestamp_millis();
        self.index_by_time
            .entry(time_key)
            .or_default()
            .push(entry.id.clone());
    }

    fn remove_from_indexes(&mut self, entry: &LogEntry) {
        if let Some(ids) = self.index_by_level.get_mut(&entry.level) {
            ids.retain(|id| id != &entry.id);
        }
        if let Some(ids) = self.index_by_node.get_mut(&entry.node) {
            ids.retain(|id| id != &entry.id);
        }
        let time_key = entry.timestamp.timestamp_millis();
        if let Some(ids) = self.index_by_time.get_mut(&time_key) {
            ids.retain(|id| id != &entry.id);
        }
    }

    pub fn get_all(&self) -> Vec<LogEntry> {
        self.logs.iter().cloned().collect()
    }

    pub fn get_by_id(&self, id: &str) -> Option<&LogEntry> {
        self.logs.iter().find(|e| e.id == id)
    }

    pub fn get_context(&self, id: &str, before: usize, after: usize) -> Vec<LogEntry> {
        let pos = self.logs.iter().position(|e| e.id == id)?;
        
        let start = if pos >= before { pos - before } else { 0 };
        let end = std::cmp::min(pos + after + 1, self.logs.len());
        
        self.logs.range(start..end).cloned().collect()
    }
}

static STREAMING_ACTIVE: AtomicBool = AtomicBool::new(false);

#[tauri::command]
pub fn configure_log_sources(
    sources: Vec<LogSource>,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let mut config = state.logging_config.lock();
    config.sources = sources;
    Ok(())
}

#[tauri::command]
pub fn add_log_source(
    source: LogSource,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let mut config = state.logging_config.lock();
    config.sources.push(source);
    Ok(())
}

#[tauri::command]
pub fn remove_log_source(
    source_id: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let mut config = state.logging_config.lock();
    config.sources.retain(|s| s.id != source_id);
    Ok(())
}

#[tauri::command]
pub fn get_logs(
    limit: Option<usize>,
    level: Option<LogLevel>,
    node: Option<String>,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<LogEntry>, String> {
    let buffer = state.log_buffer.lock();
    let mut logs = buffer.get_all();
    
    if let Some(l) = level {
        logs.retain(|e| matches!(e.level, l));
    }
    
    if let Some(n) = node {
        logs.retain(|e| e.node == n);
    }
    
    if let Some(l) = limit {
        logs.truncate(l);
    }
    
    Ok(logs)
}

#[tauri::command]
pub fn search_logs(
    query: String,
    limit: Option<usize>,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<LogEntry>, String> {
    let buffer = state.log_buffer.lock();
    let logs = buffer.get_all();
    
    let parsed_query = parse_lucene_query(&query);
    let mut results = Vec::new();
    
    for log in logs {
        if matches_query(&log, &parsed_query) {
            results.push(log);
        }
    }
    
    if let Some(l) = limit {
        results.truncate(l);
    }
    
    Ok(results)
}

fn parse_lucene_query(query: &str) -> LuceneQuery {
    let mut clauses = Vec::new();
    let parts: Vec<&str> = query.split_whitespace().collect();
    
    for part in parts {
        if let Some(colon_pos) = part.find(':') {
            let field = &part[..colon_pos];
            let value = &part[colon_pos + 1..];
            
            let field_name = match field.to_lowercase().as_str() {
                "level" => QueryField::Level,
                "node" => QueryField::Node,
                "message" => QueryField::Message,
                "source" => QueryField::Source,
                _ => QueryField::Message,
            };
            
            clauses.push(QueryClause {
                field: field_name,
                operator: QueryOperator::Must,
                value: value.to_string(),
                is_phrase: value.starts_with('"') && value.ends_with('"'),
            });
        } else {
            clauses.push(QueryClause {
                field: QueryField::Message,
                operator: QueryOperator::Should,
                value: part.to_string(),
                is_phrase: false,
            });
        }
    }
    
    LuceneQuery { clauses }
}

fn matches_query(log: &LogEntry, query: &LuceneQuery) -> bool {
    if query.clauses.is_empty() {
        return true;
    }
    
    let mut must_matched = true;
    let mut should_matched = false;
    let mut has_should = false;
    
    for clause in &query.clauses {
        let matched = matches_clause(log, clause);
        
        match clause.operator {
            QueryOperator::Must => {
                if !matched {
                    must_matched = false;
                }
            }
            QueryOperator::Should => {
                has_should = true;
                if matched {
                    should_matched = true;
                }
            }
            QueryOperator::MustNot => {
                if matched {
                    must_matched = false;
                }
            }
        }
    }
    
    if has_should {
        must_matched && should_matched
    } else {
        must_matched
    }
}

fn matches_clause(log: &LogEntry, clause: &QueryClause) -> bool {
    let field_value = match clause.field {
        QueryField::Level => match log.level {
            LogLevel::Trace => "trace",
            LogLevel::Debug => "debug",
            LogLevel::Info => "info",
            LogLevel::Warn => "warn",
            LogLevel::Error => "error",
            LogLevel::Fatal => "fatal",
        },
        QueryField::Node => &log.node,
        QueryField::Message => &log.message,
        QueryField::Source => &log.source,
    };
    
    let pattern = if clause.is_phrase {
        clause.value.trim_matches('"')
    } else {
        &clause.value
    };
    
    if clause.value.starts_with('*') || clause.value.ends_with('*') {
        let pattern = pattern.trim_matches('*');
        field_value.to_lowercase().contains(&pattern.to_lowercase())
    } else {
        field_value.to_lowercase() == pattern.to_lowercase()
    }
}

struct LuceneQuery {
    clauses: Vec<QueryClause>,
}

struct QueryClause {
    field: QueryField,
    operator: QueryOperator,
    value: String,
    is_phrase: bool,
}

enum QueryField {
    Level,
    Node,
    Message,
    Source,
}

enum QueryOperator {
    Must,
    Should,
    MustNot,
}

#[tauri::command]
pub fn get_log_context(
    log_id: String,
    before: Option<usize>,
    after: Option<usize>,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<LogEntry>, String> {
    let buffer = state.log_buffer.lock();
    let context = buffer.get_context(
        &log_id,
        before.unwrap_or(10),
        after.unwrap_or(10),
    );
    Ok(context)
}

#[tauri::command]
pub fn get_error_clusters(
    state: tauri::State<'_, AppState>,
) -> Result<Vec<LogCluster>, String> {
    let buffer = state.log_buffer.lock();
    let logs = buffer.get_all();
    
    let error_logs: Vec<_> = logs
        .into_iter()
        .filter(|e| matches!(e.level, LogLevel::Error | LogLevel::Fatal))
        .collect();
    
    let mut clusters: HashMap<String, LogCluster> = HashMap::new();
    
    for log in error_logs {
        let pattern = extract_error_pattern(&log.message);
        
        clusters
            .entry(pattern.clone())
            .and_modify(|cluster| {
                cluster.count += 1;
                cluster.last_seen = log.timestamp;
                if cluster.sample_logs.len() < 5 {
                    cluster.sample_logs.push(log.clone());
                }
                if matches!(log.level, LogLevel::Fatal) {
                    cluster.severity = LogLevel::Fatal;
                }
            })
            .or_insert_with(|| LogCluster {
                id: format!("cluster-{}", uuid::Uuid::new_v4()),
                pattern,
                count: 1,
                first_seen: log.timestamp,
                last_seen: log.timestamp,
                sample_logs: vec![log.clone()],
                severity: log.level.clone(),
            });
    }
    
    let mut result: Vec<LogCluster> = clusters.into_values().collect();
    result.sort_by(|a, b| b.count.cmp(&a.count));
    
    Ok(result)
}

fn extract_error_pattern(message: &str) -> String {
    let without_vars: String = message
        .split_whitespace()
        .map(|word| {
            if word.chars().all(|c| c.is_ascii_digit() || c == '.' || c == '-') {
                "<NUM>"
            } else if word.starts_with('[') && word.ends_with(']') {
                "<VAR>"
            } else if word.starts_with('"') && word.ends_with('"') {
                "<STRING>"
            } else {
                word
            }
        })
        .collect::<Vec<_>>()
        .join(" ");
    
    without_vars
}

#[tauri::command]
pub fn get_heatmap_data(
    bucket_seconds: Option<u64>,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<HeatmapPoint>, String> {
    let buffer = state.log_buffer.lock();
    let logs = buffer.get_all();
    let bucket_ms = bucket_seconds.unwrap_or(60) * 1000;
    
    let mut buckets: HashMap<(i64, String), HeatmapBucket> = HashMap::new();
    
    for log in logs {
        let time_bucket = (log.timestamp.timestamp_millis() / bucket_ms as i64) * bucket_ms as i64;
        let node = log.node.clone();
        
        let bucket = buckets
            .entry((time_bucket, node))
            .or_insert_with(|| HeatmapBucket {
                time_bucket,
                node: log.node.clone(),
                error_count: 0,
                warn_count: 0,
                total_count: 0,
            });
        
        bucket.total_count += 1;
        match log.level {
            LogLevel::Error | LogLevel::Fatal => bucket.error_count += 1,
            LogLevel::Warn => bucket.warn_count += 1,
            _ => {}
        }
    }
    
    let result: Vec<HeatmapPoint> = buckets
        .into_values()
        .map(|b| HeatmapPoint {
            time_bucket: format_time_bucket(b.time_bucket),
            node: b.node,
            error_count: b.error_count,
            warn_count: b.warn_count,
            total_count: b.total_count,
        })
        .collect();
    
    Ok(result)
}

struct HeatmapBucket {
    time_bucket: i64,
    node: String,
    error_count: u64,
    warn_count: u64,
    total_count: u64,
}

fn format_time_bucket(ms: i64) -> String {
    if let Some(dt) = Utc.timestamp_opt(ms / 1000, ((ms % 1000) * 1_000_000) as u32).single() {
        dt.format("%Y-%m-%d %H:%M:%S").to_string()
    } else {
        ms.to_string()
    }
}

#[tauri::command]
pub fn start_log_streaming(
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    STREAMING_ACTIVE.store(true, Ordering::SeqCst);
    
    let mut config = state.logging_config.lock();
    config.is_streaming = true;
    
    Ok(())
}

#[tauri::command]
pub fn stop_log_streaming(
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    STREAMING_ACTIVE.store(false, Ordering::SeqCst);
    
    let mut config = state.logging_config.lock();
    config.is_streaming = false;
    
    Ok(())
}
