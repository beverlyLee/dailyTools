use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PasswordEntry {
    pub id: i64,
    pub title: String,
    pub username: String,
    pub password: String,
    pub url: Option<String>,
    pub notes: Option<String>,
    pub category: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub last_used: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewPasswordEntry {
    pub title: String,
    pub username: String,
    pub password: String,
    pub url: Option<String>,
    pub notes: Option<String>,
    pub category: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PasswordStrength {
    pub score: u8,
    pub label: String,
    pub issues: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DuplicatePassword {
    pub password_hash: String,
    pub entries: Vec<PasswordEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityAuditReport {
    pub total_entries: usize,
    pub weak_passwords: Vec<PasswordEntry>,
    pub duplicate_passwords: Vec<DuplicatePassword>,
    pub pwned_passwords: Vec<PasswordEntry>,
    pub last_audit: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppState {
    pub is_locked: bool,
    pub encryption_key: Option<Vec<u8>>,
}

impl Default for AppState {
    fn default() -> Self {
        AppState {
            is_locked: true,
            encryption_key: None,
        }
    }
}
