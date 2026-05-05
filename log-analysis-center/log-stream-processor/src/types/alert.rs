use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Alert {
    pub id: Uuid,
    pub rule_id: Option<Uuid>,
    pub rule_name: Option<String>,
    pub severity: AlertSeverity,
    pub title: String,
    pub message: String,
    pub status: AlertStatus,
    pub tags: Vec<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub resolved_at: Option<DateTime<Utc>>,
    pub log_entries: Vec<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialOrd, Ord, PartialEq, Eq)]
pub enum AlertSeverity {
    Low,
    Medium,
    High,
    Critical,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AlertStatus {
    Open,
    Acknowledged,
    Resolved,
    Closed,
}

impl Alert {
    pub fn new(title: String, message: String, severity: AlertSeverity) -> Self {
        let now = Utc::now();
        Alert {
            id: Uuid::new_v4(),
            rule_id: None,
            rule_name: None,
            severity,
            title,
            message,
            status: AlertStatus::Open,
            tags: Vec::new(),
            created_at: now,
            updated_at: now,
            resolved_at: None,
            log_entries: Vec::new(),
        }
    }

    pub fn from_rule(rule_id: Uuid, rule_name: String, message: String, severity: AlertSeverity) -> Self {
        let mut alert = Self::new(
            format!("Alert from rule: {}", rule_name),
            message,
            severity,
        );
        alert.rule_id = Some(rule_id);
        alert.rule_name = Some(rule_name);
        alert
    }
}

impl std::fmt::Display for AlertSeverity {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AlertSeverity::Low => write!(f, "LOW"),
            AlertSeverity::Medium => write!(f, "MEDIUM"),
            AlertSeverity::High => write!(f, "HIGH"),
            AlertSeverity::Critical => write!(f, "CRITICAL"),
        }
    }
}

impl std::fmt::Display for AlertStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AlertStatus::Open => write!(f, "OPEN"),
            AlertStatus::Acknowledged => write!(f, "ACKNOWLEDGED"),
            AlertStatus::Resolved => write!(f, "RESOLVED"),
            AlertStatus::Closed => write!(f, "CLOSED"),
        }
    }
}
