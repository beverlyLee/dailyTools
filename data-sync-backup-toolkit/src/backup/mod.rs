pub mod backup_engine;
pub mod restore_engine;
pub mod backup_manager;
pub mod snapshot;

pub use backup_engine::*;
pub use restore_engine::*;
pub use backup_manager::*;
pub use snapshot::*;

use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use std::path::PathBuf;

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub enum BackupType {
    Full,
    Incremental,
    Differential,
}

impl Default for BackupType {
    fn default() -> Self {
        BackupType::Full
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupConfig {
    pub id: String,
    pub name: String,
    pub source_paths: Vec<PathBuf>,
    pub exclude_patterns: Vec<String>,
    pub backup_type: BackupType,
    pub storage_backend: crate::storage::StorageBackendType,
    pub compression: crate::utils::CompressionType,
    pub encryption_enabled: bool,
    pub encryption_key_id: Option<String>,
    pub schedule: Option<BackupSchedule>,
    pub retention_policy: RetentionPolicy,
    pub max_file_size: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupSchedule {
    pub cron_expression: String,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RetentionPolicy {
    pub max_backups: Option<usize>,
    pub max_age_days: Option<u32>,
    pub keep_daily: Option<usize>,
    pub keep_weekly: Option<usize>,
    pub keep_monthly: Option<usize>,
}

impl Default for RetentionPolicy {
    fn default() -> Self {
        RetentionPolicy {
            max_backups: Some(10),
            max_age_days: Some(30),
            keep_daily: Some(7),
            keep_weekly: Some(4),
            keep_monthly: Some(12),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupProgress {
    pub backup_id: String,
    pub total_files: usize,
    pub processed_files: usize,
    pub total_bytes: u64,
    pub processed_bytes: u64,
    pub current_file: Option<String>,
    pub is_completed: bool,
    pub start_time: DateTime<Utc>,
    pub end_time: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupResult {
    pub backup_id: String,
    pub success: bool,
    pub start_time: DateTime<Utc>,
    pub end_time: DateTime<Utc>,
    pub total_files: usize,
    pub total_bytes: u64,
    pub compressed_bytes: Option<u64>,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
    pub snapshot_path: Option<PathBuf>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RestoreProgress {
    pub backup_id: String,
    pub total_files: usize,
    pub restored_files: usize,
    pub total_bytes: u64,
    pub restored_bytes: u64,
    pub current_file: Option<String>,
    pub is_completed: bool,
    pub start_time: DateTime<Utc>,
    pub end_time: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RestoreResult {
    pub backup_id: String,
    pub success: bool,
    pub start_time: DateTime<Utc>,
    pub end_time: DateTime<Utc>,
    pub total_files: usize,
    pub total_bytes: u64,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
}
