use crate::types::{LogEntry, LogLevel, LogSource as AppLogSource};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FilebeatLog {
    #[serde(rename = "@timestamp")]
    pub timestamp: Option<String>,
    pub message: Option<String>,
    pub log: Option<FilebeatLogDetails>,
    pub host: Option<FilebeatHost>,
    pub fields: Option<serde_json::Value>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FilebeatLogDetails {
    pub file: Option<FilebeatFile>,
    pub level: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FilebeatFile {
    pub path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FilebeatHost {
    pub hostname: Option<String>,
}

pub fn parse_filebeat_log(filebeat_log: FilebeatLog) -> anyhow::Result<LogEntry> {
    let message = filebeat_log.message.unwrap_or_else(|| "".to_string());
    
    let level = if let Some(log_details) = &filebeat_log.log {
        if let Some(level_str) = &log_details.level {
            level_str.parse::<LogLevel>().unwrap_or(LogLevel::Info)
        } else {
            LogLevel::Info
        }
    } else {
        LogLevel::Info
    };

    let mut entry = LogEntry::new(
        message,
        level,
        AppLogSource::Filebeat,
    );

    if let Some(host) = &filebeat_log.host {
        entry.hostname = host.hostname.clone();
    }

    entry.tags = filebeat_log.tags.unwrap_or_default();
    
    let mut fields = serde_json::Map::new();
    if let Some(file_fields) = filebeat_log.fields {
        if let serde_json::Value::Object(obj) = file_fields {
            fields.extend(obj);
        }
    }

    if let Some(log_details) = filebeat_log.log {
        if let Some(file) = log_details.file {
            if let Some(path) = file.path {
                fields.insert("log_file_path".to_string(), serde_json::Value::String(path));
            }
        }
    }

    entry.fields = serde_json::Value::Object(fields);

    if let Some(ts) = filebeat_log.timestamp {
        if let Ok(parsed_ts) = ts.parse::<chrono::DateTime<chrono::Utc>>() {
            entry.timestamp = parsed_ts;
        }
    }

    Ok(entry)
}
