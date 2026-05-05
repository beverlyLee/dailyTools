use crate::types::Alert;
use reqwest::Client;
use std::collections::HashMap;

pub struct WebhookChannel {
    pub url: String,
    pub method: String,
    pub headers: HashMap<String, String>,
    pub client: Client,
}

impl WebhookChannel {
    pub fn new(url: String, method: String, headers: HashMap<String, String>) -> Self {
        WebhookChannel {
            url,
            method,
            headers,
            client: Client::new(),
        }
    }

    pub fn new_default() -> Self {
        WebhookChannel {
            url: "".to_string(),
            method: "POST".to_string(),
            headers: HashMap::new(),
            client: Client::new(),
        }
    }

    fn build_webhook_payload(alert: &Alert) -> serde_json::Value {
        serde_json::json!({
            "id": alert.id.to_string(),
            "rule_id": alert.rule_id.map(|id| id.to_string()),
            "rule_name": alert.rule_name,
            "severity": alert.severity.to_string(),
            "title": alert.title,
            "message": alert.message,
            "status": alert.status.to_string(),
            "tags": alert.tags,
            "created_at": alert.created_at.to_rfc3339(),
            "updated_at": alert.updated_at.to_rfc3339(),
            "resolved_at": alert.resolved_at.map(|t| t.to_rfc3339()),
            "log_entries": alert.log_entries.iter().map(|id| id.to_string()).collect::<Vec<_>>()
        })
    }
}

#[async_trait::async_trait]
impl super::AlertChannel for WebhookChannel {
    async fn send(&self, alert: &Alert) -> anyhow::Result<()> {
        if self.url.is_empty() {
            tracing::warn!("Webhook URL not configured, skipping webhook alert");
            return Ok(());
        }

        let payload = Self::build_webhook_payload(alert);

        let request = match self.method.to_uppercase().as_str() {
            "POST" => self.client.post(&self.url),
            "PUT" => self.client.put(&self.url),
            "PATCH" => self.client.patch(&self.url),
            _ => self.client.post(&self.url),
        };

        let mut request = request.json(&payload);

        for (key, value) in &self.headers {
            request = request.header(key, value);
        }

        match request.send().await {
            Ok(response) => {
                if response.status().is_success() {
                    tracing::info!("Webhook alert sent successfully to {}", self.url);
                } else {
                    tracing::warn!(
                        "Webhook alert returned non-success status: {}",
                        response.status()
                    );
                }
            }
            Err(e) => {
                tracing::error!("Failed to send webhook alert: {}", e);
            }
        }

        Ok(())
    }

    fn name(&self) -> &str {
        "Webhook"
    }
}
