use crate::types::{LogEntry, LogLevel, LogSource as AppLogSource};
use chrono::{DateTime, Utc};
use regex::Regex;
use std::sync::Arc;
use tokio::net::UdpSocket;
use tracing::info;

pub struct SyslogSource {
    socket: Option<Arc<UdpSocket>>,
    buffer: [u8; 65535],
}

impl SyslogSource {
    pub fn new() -> Self {
        SyslogSource {
            socket: None,
            buffer: [0; 65535],
        }
    }

    pub async fn bind(&mut self, addr: &str) -> anyhow::Result<()> {
        let socket = UdpSocket::bind(addr).await?;
        info!("Syslog UDP listener bound to {}", addr);
        self.socket = Some(Arc::new(socket));
        Ok(())
    }

    pub async fn receive(&mut self) -> anyhow::Result<LogEntry> {
        if let Some(socket) = &self.socket {
            let (len, _src) = socket.recv_from(&mut self.buffer).await?;
            let message = String::from_utf8_lossy(&self.buffer[..len]).to_string();
            self.parse_syslog_message(&message)
        } else {
            Err(anyhow::anyhow!("Socket not bound"))
        }
    }

    fn parse_syslog_message(&self, message: &str) -> anyhow::Result<LogEntry> {
        let syslog_re = Regex::new(r"<(\d+)>(.*)")?;
        
        if let Some(captures) = syslog_re.captures(message) {
            let priority: u8 = captures[1].parse()?;
            let content = &captures[2];
            
            let facility = priority / 8;
            let severity = priority % 8;
            
            let level = match severity {
                0 => LogLevel::Fatal,
                1 => LogLevel::Fatal,
                2 => LogLevel::Critical,
                3 => LogLevel::Error,
                4 => LogLevel::Warn,
                5 => LogLevel::Info,
                6 => LogLevel::Info,
                7 => LogLevel::Debug,
                _ => LogLevel::Info,
            };

            let mut entry = LogEntry::new(
                content.to_string(),
                level,
                AppLogSource::Syslog,
            );

            entry.fields = serde_json::json!({
                "syslog_facility": facility,
                "syslog_severity": severity
            });

            Ok(entry)
        } else {
            Ok(LogEntry::new(
                message.to_string(),
                LogLevel::Info,
                AppLogSource::Syslog,
            ))
        }
    }
}
