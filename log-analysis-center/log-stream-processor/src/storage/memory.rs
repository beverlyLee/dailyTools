use crate::types::{LogEntry, Alert};
use std::collections::VecDeque;
use std::sync::Arc;
use tokio::sync::RwLock;

pub struct LogStorage {
    logs: Arc<RwLock<VecDeque<LogEntry>>>,
    alerts: Arc<RwLock<VecDeque<Alert>>>,
    max_logs: usize,
    max_alerts: usize,
}

impl LogStorage {
    pub fn new(max_logs: usize, max_alerts: usize) -> Self {
        LogStorage {
            logs: Arc::new(RwLock::new(VecDeque::with_capacity(max_logs))),
            alerts: Arc::new(RwLock::new(VecDeque::with_capacity(max_alerts))),
            max_logs,
            max_alerts,
        }
    }
}

#[async_trait::async_trait]
impl super::LogStorage for LogStorage {
    async fn add_log(&self, log: LogEntry) -> anyhow::Result<()> {
        let mut logs = self.logs.write().await;
        
        if logs.len() >= self.max_logs {
            logs.pop_front();
        }
        
        logs.push_back(log);
        
        Ok(())
    }

    async fn get_logs(&self, limit: usize) -> anyhow::Result<Vec<LogEntry>> {
        let logs = self.logs.read().await;
        
        Ok(logs
            .iter()
            .rev()
            .take(limit)
            .cloned()
            .collect())
    }

    async fn search_logs(&self, query: &str, limit: usize) -> anyhow::Result<Vec<LogEntry>> {
        let logs = self.logs.read().await;
        
        let query_lower = query.to_lowercase();
        
        Ok(logs
            .iter()
            .rev()
            .filter(|log| {
                log.message.to_lowercase().contains(&query_lower)
                    || log.service.as_ref().map_or(false, |s| s.to_lowercase().contains(&query_lower))
                    || log.hostname.as_ref().map_or(false, |h| h.to_lowercase().contains(&query_lower))
                    || log.tags.iter().any(|t| t.to_lowercase().contains(&query_lower))
                    || log.fields.to_string().to_lowercase().contains(&query_lower)
            })
            .take(limit)
            .cloned()
            .collect())
    }

    async fn add_alert(&self, alert: Alert) -> anyhow::Result<()> {
        let mut alerts = self.alerts.write().await;
        
        if alerts.len() >= self.max_alerts {
            alerts.pop_front();
        }
        
        alerts.push_back(alert);
        
        Ok(())
    }

    async fn get_alerts(&self, limit: usize) -> anyhow::Result<Vec<Alert>> {
        let alerts = self.alerts.read().await;
        
        Ok(alerts
            .iter()
            .rev()
            .take(limit)
            .cloned()
            .collect())
    }
}
