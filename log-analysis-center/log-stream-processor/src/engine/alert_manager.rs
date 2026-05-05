use crate::types::{Alert, AlertStatus, Action, ActionType};
use crate::alerts::{EmailChannel, WebhookChannel, AlertChannel};
use crate::storage::LogStorage;
use std::sync::Arc;
use tokio::sync::RwLock;

pub struct AlertManager {
    pub email_channel: Option<Arc<EmailChannel>>,
    pub webhook_channel: Option<Arc<WebhookChannel>>,
    pub storage: Arc<LogStorage>,
    pub active_alerts: Arc<RwLock<std::collections::HashMap<uuid::Uuid, Alert>>>,
}

impl AlertManager {
    pub fn new(storage: Arc<LogStorage>) -> Self {
        AlertManager {
            email_channel: None,
            webhook_channel: None,
            storage,
            active_alerts: Arc::new(RwLock::new(std::collections::HashMap::new())),
        }
    }

    pub fn with_email_channel(mut self, email_channel: EmailChannel) -> Self {
        self.email_channel = Some(Arc::new(email_channel));
        self
    }

    pub fn with_webhook_channel(mut self, webhook_channel: WebhookChannel) -> Self {
        self.webhook_channel = Some(Arc::new(webhook_channel));
        self
    }

    pub async fn process_actions(&self, actions: Vec<Action>) -> anyhow::Result<()> {
        for action in actions {
            self.execute_action(action).await?;
        }
        Ok(())
    }

    async fn execute_action(&self, action: Action) -> anyhow::Result<()> {
        match action.action_type {
            ActionType::CreateAlert => {
                self.create_alert_from_action(&action).await?;
            }
            ActionType::Email => {
                self.send_email_alert(&action).await?;
            }
            ActionType::Webhook => {
                self.send_webhook_alert(&action).await?;
            }
            ActionType::AddTag => {
                // Tagging logic would go here
                tracing::debug!("AddTag action: {:?}", action.config);
            }
        }
        Ok(())
    }

    async fn create_alert_from_action(&self, action: &Action) -> anyhow::Result<()> {
        let config = &action.config;
        
        let severity = if let Some(sev) = config.get("severity") {
            let sev_str = sev.as_str().unwrap_or("MEDIUM");
            match sev_str.to_uppercase().as_str() {
                "LOW" => crate::types::AlertSeverity::Low,
                "MEDIUM" => crate::types::AlertSeverity::Medium,
                "HIGH" => crate::types::AlertSeverity::High,
                "CRITICAL" => crate::types::AlertSeverity::Critical,
                _ => crate::types::AlertSeverity::Medium,
            }
        } else {
            crate::types::AlertSeverity::Medium
        };

        let title = config
            .get("title")
            .and_then(|v| v.as_str())
            .unwrap_or("Alert")
            .to_string();

        let message = config
            .get("message")
            .and_then(|v| v.as_str())
            .unwrap_or("An alert was triggered")
            .to_string();

        let alert = Alert::new(title, message, severity);
        
        self.storage.add_alert(alert.clone()).await?;
        
        let mut active_alerts = self.active_alerts.write().await;
        active_alerts.insert(alert.id, alert.clone());
        
        drop(active_alerts);
        
        // Send notifications through configured channels
        self.notify_alert(&alert).await?;
        
        tracing::info!("Alert created: {} - {}", alert.id, alert.title);
        Ok(())
    }

    async fn send_email_alert(&self, action: &Action) -> anyhow::Result<()> {
        if let Some(channel) = &self.email_channel {
            let config = &action.config;
            
            let severity = if let Some(sev) = config.get("severity") {
                let sev_str = sev.as_str().unwrap_or("MEDIUM");
                match sev_str.to_uppercase().as_str() {
                    "LOW" => crate::types::AlertSeverity::Low,
                    "MEDIUM" => crate::types::AlertSeverity::Medium,
                    "HIGH" => crate::types::AlertSeverity::High,
                    "CRITICAL" => crate::types::AlertSeverity::Critical,
                    _ => crate::types::AlertSeverity::Medium,
                }
            } else {
                crate::types::AlertSeverity::Medium
            };

            let title = config
                .get("title")
                .and_then(|v| v.as_str())
                .unwrap_or("Alert")
                .to_string();

            let message = config
                .get("message")
                .and_then(|v| v.as_str())
                .unwrap_or("An alert was triggered")
                .to_string();

            let alert = Alert::new(title, message, severity);
            channel.send(&alert).await?;
        }
        Ok(())
    }

    async fn send_webhook_alert(&self, action: &Action) -> anyhow::Result<()> {
        if let Some(channel) = &self.webhook_channel {
            let config = &action.config;
            
            let severity = if let Some(sev) = config.get("severity") {
                let sev_str = sev.as_str().unwrap_or("MEDIUM");
                match sev_str.to_uppercase().as_str() {
                    "LOW" => crate::types::AlertSeverity::Low,
                    "MEDIUM" => crate::types::AlertSeverity::Medium,
                    "HIGH" => crate::types::AlertSeverity::High,
                    "CRITICAL" => crate::types::AlertSeverity::Critical,
                    _ => crate::types::AlertSeverity::Medium,
                }
            } else {
                crate::types::AlertSeverity::Medium
            };

            let title = config
                .get("title")
                .and_then(|v| v.as_str())
                .unwrap_or("Alert")
                .to_string();

            let message = config
                .get("message")
                .and_then(|v| v.as_str())
                .unwrap_or("An alert was triggered")
                .to_string();

            let alert = Alert::new(title, message, severity);
            channel.send(&alert).await?;
        }
        Ok(())
    }

    async fn notify_alert(&self, alert: &Alert) -> anyhow::Result<()> {
        if let Some(channel) = &self.email_channel {
            channel.send(alert).await?;
        }
        
        if let Some(channel) = &self.webhook_channel {
            channel.send(alert).await?;
        }
        
        Ok(())
    }

    pub async fn acknowledge_alert(&self, alert_id: uuid::Uuid) -> anyhow::Result<()> {
        let mut active_alerts = self.active_alerts.write().await;
        
        if let Some(alert) = active_alerts.get_mut(&alert_id) {
            alert.status = AlertStatus::Acknowledged;
            alert.updated_at = chrono::Utc::now();
            tracing::info!("Alert acknowledged: {}", alert_id);
        }
        
        Ok(())
    }

    pub async fn resolve_alert(&self, alert_id: uuid::Uuid) -> anyhow::Result<()> {
        let mut active_alerts = self.active_alerts.write().await;
        
        if let Some(alert) = active_alerts.get_mut(&alert_id) {
            alert.status = AlertStatus::Resolved;
            alert.resolved_at = Some(chrono::Utc::now());
            alert.updated_at = chrono::Utc::now();
            tracing::info!("Alert resolved: {}", alert_id);
        }
        
        Ok(())
    }

    pub async fn close_alert(&self, alert_id: uuid::Uuid) -> anyhow::Result<()> {
        let mut active_alerts = self.active_alerts.write().await;
        
        if let Some(alert) = active_alerts.get_mut(&alert_id) {
            alert.status = AlertStatus::Closed;
            alert.updated_at = chrono::Utc::now();
            tracing::info!("Alert closed: {}", alert_id);
        }
        
        Ok(())
    }

    pub async fn get_active_alerts(&self) -> anyhow::Result<Vec<Alert>> {
        let active_alerts = self.active_alerts.read().await;
        Ok(active_alerts.values().cloned().collect())
    }
}
