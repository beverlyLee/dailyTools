use crate::types::{LogEntry, LogLevel, LogSource};
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct RegexParser {
    pub patterns: HashMap<String, RegexPattern>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegexPattern {
    pub name: String,
    pub regex: String,
    #[serde(skip)]
    pub compiled_regex: Option<Regex>,
    pub field_mappings: HashMap<String, String>,
    pub default_level: LogLevel,
}

impl RegexParser {
    pub fn new() -> Self {
        let mut patterns = HashMap::new();
        
        patterns.insert("nginx_access".to_string(), RegexPattern {
            name: "nginx_access".to_string(),
            regex: r#"^(\S+) - (\S+) \[([^\]]+)\] "(\S+) (\S+) (\S+)" (\d+) (\d+) "([^"]*)" "([^"]*)"$"#.to_string(),
            compiled_regex: None,
            field_mappings: [
                ("1".to_string(), "client_ip".to_string()),
                ("2".to_string(), "user".to_string()),
                ("3".to_string(), "timestamp".to_string()),
                ("4".to_string(), "method".to_string()),
                ("5".to_string(), "path".to_string()),
                ("6".to_string(), "protocol".to_string()),
                ("7".to_string(), "status_code".to_string()),
                ("8".to_string(), "response_size".to_string()),
                ("9".to_string(), "referrer".to_string()),
                ("10".to_string(), "user_agent".to_string()),
            ].iter().cloned().collect(),
            default_level: LogLevel::Info,
        });

        patterns.insert("apache_error".to_string(), RegexPattern {
            name: "apache_error".to_string(),
            regex: r#"^\[([^\]]+)\] \[(\w+):(\w+)\] \[pid (\d+)\] \[client ([^\]]+)\] (.*)$"#.to_string(),
            compiled_regex: None,
            field_mappings: [
                ("1".to_string(), "timestamp".to_string()),
                ("2".to_string(), "module".to_string()),
                ("3".to_string(), "level".to_string()),
                ("4".to_string(), "pid".to_string()),
                ("5".to_string(), "client".to_string()),
                ("6".to_string(), "message".to_string()),
            ].iter().cloned().collect(),
            default_level: LogLevel::Error,
        });

        patterns.insert("json_log".to_string(), RegexPattern {
            name: "json_log".to_string(),
            regex: r#"^\{.*\}$"#.to_string(),
            compiled_regex: None,
            field_mappings: HashMap::new(),
            default_level: LogLevel::Info,
        });

        RegexParser { patterns }
    }

    pub fn parse_with_pattern(
        &self,
        pattern_name: &str,
        raw: &str,
    ) -> anyhow::Result<LogEntry> {
        let pattern = self.patterns
            .get(pattern_name)
            .ok_or_else(|| anyhow::anyhow!("Pattern not found: {}", pattern_name))?;

        let regex = if let Some(re) = &pattern.compiled_regex {
            re
        } else {
            &Regex::new(&pattern.regex)?
        };

        if let Some(captures) = regex.captures(raw) {
            let mut fields = serde_json::Map::new();
            let mut message_parts = Vec::new();

            for (i, capture) in captures.iter().enumerate() {
                if let Some(cap) = capture {
                    let key = pattern.field_mappings
                        .get(&i.to_string())
                        .map(|k| k.as_str())
                        .unwrap_or(&format!("field_{}", i));

                    fields.insert(key.to_string(), serde_json::Value::String(cap.as_str().to_string()));
                    message_parts.push(cap.as_str().to_string());
                }
            }

            let level = if let Some(serde_json::Value::String(level_str)) = fields.get("level") {
                level_str.parse::<LogLevel>().unwrap_or(pattern.default_level.clone())
            } else {
                pattern.default_level.clone()
            };

            let message = if let Some(serde_json::Value::String(msg)) = fields.get("message") {
                msg.clone()
            } else {
                message_parts.join(" ")
            };

            let mut entry = LogEntry::new(
                message,
                level,
                LogSource::Http,
            );

            entry.fields = serde_json::Value::Object(fields);

            Ok(entry)
        } else {
            Ok(LogEntry::new(
                raw.to_string(),
                pattern.default_level.clone(),
                LogSource::Http,
            ))
        }
    }

    pub fn auto_parse(&self, raw: &str) -> anyhow::Result<LogEntry> {
        if raw.trim().starts_with('{') && raw.trim().ends_with('}') {
            match serde_json::from_str::<serde_json::Value>(raw) {
                Ok(json_val) => {
                    let message = json_val
                        .get("message")
                        .or_else(|| json_val.get("msg"))
                        .or_else(|| json_val.get("log"))
                        .map(|v| v.as_str().unwrap_or(""))
                        .unwrap_or(raw)
                        .to_string();

                    let level = json_val
                        .get("level")
                        .map(|v| v.as_str().unwrap_or("INFO"))
                        .unwrap_or("INFO")
                        .parse::<LogLevel>()
                        .unwrap_or(LogLevel::Info);

                    let mut entry = LogEntry::new(message, level, LogSource::Http);
                    entry.fields = json_val;

                    return Ok(entry);
                }
                Err(_) => {}
            }
        }

        for (pattern_name, _) in &self.patterns {
            if let Ok(entry) = self.parse_with_pattern(pattern_name, raw) {
                return Ok(entry);
            }
        }

        Ok(LogEntry::new(raw.to_string(), LogLevel::Info, LogSource::Http))
    }
}
