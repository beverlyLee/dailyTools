use super::*;
use crate::Result;
use crate::DsbtError;
use crate::utils::*;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileSnapshot {
    pub path: PathBuf,
    pub relative_path: PathBuf,
    pub hash: String,
    pub size: u64,
    pub modified_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub is_symlink: bool,
    pub is_directory: bool,
    pub permissions: Option<u32>,
    pub owner: Option<String>,
    pub group: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupSnapshot {
    pub id: String,
    pub config_id: String,
    pub backup_type: BackupType,
    pub parent_snapshot_id: Option<String>,
    pub base_snapshot_id: Option<String>,
    pub created_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
    pub files: Vec<FileSnapshot>,
    pub total_files: usize,
    pub total_bytes: u64,
    pub compressed_bytes: Option<u64>,
    pub storage_path: PathBuf,
    pub is_encrypted: bool,
    pub encryption_key_id: Option<String>,
    pub compression_type: crate::utils::CompressionType,
    pub metadata: HashMap<String, String>,
    pub is_valid: bool,
    pub errors: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SnapshotIndex {
    pub config_id: String,
    pub snapshots: Vec<BackupSnapshot>,
    pub updated_at: DateTime<Utc>,
}

pub struct SnapshotManager {
    index_path: PathBuf,
    index: SnapshotIndex,
}

impl SnapshotManager {
    pub fn new(config_id: &str, index_path: &Path) -> Result<Self> {
        let index = if index_path.exists() {
            let content = std::fs::read_to_string(index_path)?;
            serde_json::from_str(&content)?
        } else {
            SnapshotIndex {
                config_id: config_id.to_string(),
                snapshots: Vec::new(),
                updated_at: Utc::now(),
            }
        };
        
        Ok(Self {
            index_path: index_path.to_path_buf(),
            index,
        })
    }
    
    pub fn save(&mut self) -> Result<()> {
        self.index.updated_at = Utc::now();
        let content = serde_json::to_string_pretty(&self.index)?;
        std::fs::write(&self.index_path, content)?;
        Ok(())
    }
    
    pub fn create_snapshot(
        &mut self,
        config: &BackupConfig,
        backup_type: BackupType,
        parent_snapshot_id: Option<&str>,
    ) -> BackupSnapshot {
        let id = format!("backup_{}", Utc::now().format("%Y%m%d%H%M%S"));
        
        BackupSnapshot {
            id: id.clone(),
            config_id: config.id.clone(),
            backup_type,
            parent_snapshot_id: parent_snapshot_id.map(|s| s.to_string()),
            base_snapshot_id: None,
            created_at: Utc::now(),
            completed_at: None,
            files: Vec::new(),
            total_files: 0,
            total_bytes: 0,
            compressed_bytes: None,
            storage_path: PathBuf::from(&id),
            is_encrypted: config.encryption_enabled,
            encryption_key_id: config.encryption_key_id.clone(),
            compression_type: config.compression,
            metadata: HashMap::new(),
            is_valid: false,
            errors: Vec::new(),
        }
    }
    
    pub fn add_snapshot(&mut self, snapshot: BackupSnapshot) -> Result<()> {
        self.index.snapshots.push(snapshot);
        self.save()?;
        Ok(())
    }
    
    pub fn get_snapshot(&self, snapshot_id: &str) -> Option<&BackupSnapshot> {
        self.index.snapshots.iter().find(|s| s.id == snapshot_id)
    }
    
    pub fn get_latest_snapshot(&self) -> Option<&BackupSnapshot> {
        self.index.snapshots.last()
    }
    
    pub fn list_snapshots(&self) -> &[BackupSnapshot] {
        &self.index.snapshots
    }
    
    pub fn list_snapshots_by_type(&self, backup_type: BackupType) -> Vec<&BackupSnapshot> {
        self.index.snapshots
            .iter()
            .filter(|s| s.backup_type == backup_type)
            .collect()
    }
    
    pub fn get_full_snapshots(&self) -> Vec<&BackupSnapshot> {
        self.list_snapshots_by_type(BackupType::Full)
    }
    
    pub fn get_incremental_chain(&self, snapshot_id: &str) -> Result<Vec<&BackupSnapshot>> {
        let mut chain = Vec::new();
        let mut current_id = Some(snapshot_id);
        
        while let Some(id) = current_id {
            if let Some(snapshot) = self.get_snapshot(id) {
                chain.push(snapshot);
                current_id = snapshot.parent_snapshot_id.as_deref();
            } else {
                break;
            }
        }
        
        chain.reverse();
        Ok(chain)
    }
    
    pub fn apply_retention_policy(&mut self, policy: &RetentionPolicy) -> Result<Vec<String>> {
        let mut to_remove = Vec::new();
        let now = Utc::now();
        
        if let Some(max_age_days) = policy.max_age_days {
            let cutoff = now - chrono::Duration::days(max_age_days as i64);
            for snapshot in &self.index.snapshots {
                if snapshot.created_at < cutoff {
                    to_remove.push(snapshot.id.clone());
                }
            }
        }
        
        if let Some(max_backups) = policy.max_backups {
            if self.index.snapshots.len() > max_backups {
                let excess = self.index.snapshots.len() - max_backups;
                for i in 0..excess {
                    if let Some(snapshot) = self.index.snapshots.get(i) {
                        to_remove.push(snapshot.id.clone());
                    }
                }
            }
        }
        
        to_remove.sort();
        to_remove.dedup();
        
        let removed = to_remove.clone();
        self.index.snapshots.retain(|s| !to_remove.contains(&s.id));
        
        self.save()?;
        
        Ok(removed)
    }
    
    pub fn delete_snapshot(&mut self, snapshot_id: &str) -> Result<()> {
        let original_len = self.index.snapshots.len();
        self.index.snapshots.retain(|s| s.id != snapshot_id);
        
        if self.index.snapshots.len() == original_len {
            return Err(DsbtError::Backup(format!("快照不存在: {}", snapshot_id)));
        }
        
        self.save()?;
        Ok(())
    }
}

impl BackupSnapshot {
    pub fn validate(&self) -> Result<()> {
        if !self.is_valid {
            return Err(DsbtError::Backup(format!("快照 {} 无效", self.id)));
        }
        
        if self.files.is_empty() {
            return Err(DsbtError::Backup(format!("快照 {} 不包含任何文件", self.id)));
        }
        
        Ok(())
    }
    
    pub fn get_file_by_path(&self, path: &Path) -> Option<&FileSnapshot> {
        self.files.iter().find(|f| f.path == path || f.relative_path == path)
    }
    
    pub fn get_changed_files(&self, other: &BackupSnapshot) -> Vec<(&FileSnapshot, &FileSnapshot)> {
        let mut changes = Vec::new();
        let mut other_map: HashMap<&PathBuf, &FileSnapshot> = HashMap::new();
        
        for file in &other.files {
            other_map.insert(&file.relative_path, file);
        }
        
        for file in &self.files {
            if let Some(other_file) = other_map.get(&file.relative_path) {
                if file.hash != other_file.hash {
                    changes.push((file, *other_file));
                }
            }
        }
        
        changes
    }
    
    pub fn get_new_files(&self, other: &BackupSnapshot) -> Vec<&FileSnapshot> {
        let other_paths: std::collections::HashSet<_> = 
            other.files.iter().map(|f| &f.relative_path).collect();
        
        self.files
            .iter()
            .filter(|f| !other_paths.contains(&f.relative_path))
            .collect()
    }
    
    pub fn get_deleted_files(&self, other: &BackupSnapshot) -> Vec<&FileSnapshot> {
        let self_paths: std::collections::HashSet<_> = 
            self.files.iter().map(|f| &f.relative_path).collect();
        
        other.files
            .iter()
            .filter(|f| !self_paths.contains(&f.relative_path))
            .collect()
    }
}
