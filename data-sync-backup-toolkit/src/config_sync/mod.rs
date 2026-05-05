pub mod config_manager;
pub mod sync_engine;
pub mod conflict_resolver;

pub use config_manager::*;
pub use sync_engine::*;
pub use conflict_resolver::*;

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use chrono::DateTime;
use chrono::Utc;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigFile {
    pub id: String,
    pub name: String,
    pub source_path: PathBuf,
    pub target_path: PathBuf,
    pub is_sensitive: bool,
    pub last_synced: Option<DateTime<Utc>>,
    pub hash: Option<String>,
    pub tags: Vec<String>,
    pub metadata: std::collections::HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncProfile {
    pub id: String,
    pub name: String,
    pub device_id: String,
    pub config_files: Vec<ConfigFile>,
    pub storage_backend: StorageBackendType,
    pub auto_sync: bool,
    pub sync_interval_seconds: u64,
    pub conflict_resolution: ConflictResolutionStrategy,
    pub encryption_enabled: bool,
    pub encryption_key_id: Option<String>,
}

pub use crate::storage::StorageBackendType;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncStatus {
    pub profile_id: String,
    pub last_sync_time: Option<DateTime<Utc>>,
    pub pending_files: usize,
    pub synced_files: usize,
    pub conflicts: usize,
    pub is_syncing: bool,
}
