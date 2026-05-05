use crate::types::{LogEntry, LogLevel, LogSource as AppLogSource};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KafkaLogMessage {
    pub message: String,
    pub level: Option<String>,
    pub service: Option<String>,
    pub timestamp: Option<i64>,
    pub metadata: Option<serde_json::Value>,
}

pub fn parse_kafka_message(message: &str) -> anyhow::Result<LogEntry> {
    match serde_json::from_str::<KafkaLogMessage>(message) {
        Ok(kafka_msg) => {
            let level = if let Some(level_str) = &kafka_msg.level {
                level_str.parse::<LogLevel>().unwrap_or(LogLevel::Info)
            } else {
                LogLevel::Info
            };

            let mut entry = LogEntry::new(
                kafka_msg.message,
                level,
                AppLogSource::Kafka,
            );

            entry.service = kafka_msg.service;
            
            if let Some(ts) = kafka_msg.timestamp {
                if let Some(datetime) = chrono::DateTime::from_timestamp(ts, 0) {
                    entry.timestamp = datetime;
                }
            }

            if let Some(metadata) = kafka_msg.metadata {
                entry.fields = metadata;
            }

            Ok(entry)
        }
        Err(_) => {
            Ok(LogEntry::new(
                message.to_string(),
                LogLevel::Info,
                AppLogSource::Kafka,
            ))
        }
    }
}
