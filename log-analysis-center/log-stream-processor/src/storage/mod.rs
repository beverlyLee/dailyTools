pub mod memory;

pub use memory::*;

use crate::types::{LogEntry, Alert};
use async_trait::async_trait;

#[async_trait]
pub trait LogStorage: Send + Sync {
    async fn add_log(&self, log: LogEntry) -> anyhow::Result<()>;
    async fn get_logs(&self, limit: usize) -> anyhow::Result<Vec<LogEntry>>;
    async fn search_logs(&self, query: &str, limit: usize) -> anyhow::Result<Vec<LogEntry>>;
    async fn add_alert(&self, alert: Alert) -> anyhow::Result<()>;
    async fn get_alerts(&self, limit: usize) -> anyhow::Result<Vec<Alert>>;
}
