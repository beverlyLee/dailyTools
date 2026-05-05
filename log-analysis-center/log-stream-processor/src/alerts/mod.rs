pub mod email;
pub mod webhook;

pub use email::*;
pub use webhook::*;

use crate::types::Alert;

#[async_trait::async_trait]
pub trait AlertChannel: Send + Sync {
    async fn send(&self, alert: &Alert) -> anyhow::Result<()>;
    fn name(&self) -> &str;
}
