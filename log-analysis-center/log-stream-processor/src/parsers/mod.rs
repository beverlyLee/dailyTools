pub mod regex;
pub mod grok;

pub use regex::*;
pub use grok::*;

use crate::types::LogEntry;

#[async_trait::async_trait]
pub trait LogParser: Send + Sync {
    async fn parse(&self, raw: &str) -> anyhow::Result<LogEntry>;
    fn name(&self) -> &str;
}
