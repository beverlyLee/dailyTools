pub mod http;
pub mod syslog;
pub mod filebeat;
pub mod kafka;

pub use http::*;
pub use syslog::*;
pub use filebeat::*;
pub use kafka::*;

use crate::types::LogEntry;

#[async_trait::async_trait]
pub trait LogSource: Send + Sync {
    async fn receive(&mut self) -> anyhow::Result<LogEntry>;
    fn source_type(&self) -> crate::types::LogSource;
}
