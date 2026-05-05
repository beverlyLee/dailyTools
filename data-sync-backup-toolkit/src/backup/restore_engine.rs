use super::*;
use crate::Result;
use crate::DsbtError;
use crate::utils::*;
use crate::storage::*;
use crate::encryption::*;
use chrono::Utc;
use filetime::FileTime;
use std::path::{Path, PathBuf};
use std::collections::HashMap;

pub struct RestoreEngine {
    snapshot_manager: SnapshotManager,
    storage_backend: Box<dyn StorageBackend>,
    encryption_engine: Option<EncryptionEngine>,
    key_store: Option<KeyStore>,
    progress_callback: Option<Box<dyn Fn(&RestoreProgress) + Send + Sync>>,
}

impl RestoreEngine {
    pub fn new(
        snapshot_manager: SnapshotManager,
        storage_backend: Box<dyn StorageBackend>,
    ) -> Self {
        Self {
            snapshot_manager,
            storage_backend,
            encryption_engine: None,
            key_store: None,
            progress_callback: None,
        }
    }
    
    pub fn with_encryption(
        mut self,
        algorithm: EncryptionAlgorithm,
        keys_dir: &Path,
    ) -> Result<Self> {
        self.encryption_engine = Some(EncryptionEngine::new(algorithm));
        self.key_store = Some(KeyStore::new(keys_dir));
        if let Some(ref ks) = self.key_store {
            ks.init()?;
        }
        Ok(self)
    }
    
    pub fn set_progress_callback<F>(&mut self, callback: F)
    where
        F: Fn(&RestoreProgress) + Send + Sync + 'static,
    {
        self.progress_callback = Some(Box::new(callback));
    }
    
    pub fn list_available_snapshots(&self) -> &[BackupSnapshot] {
        self.snapshot_manager.list_snapshots()
    }
    
    pub fn get_snapshot(&self, snapshot_id: &str) -> Option<&BackupSnapshot> {
        self.snapshot_manager.get_snapshot(snapshot_id)
    }
    
    pub fn get_latest_snapshot(&self) -> Option<&BackupSnapshot> {
        self.snapshot_manager.get_latest_snapshot()
    }
    
    pub fn execute_restore(
        &mut self,
        snapshot_id: &str,
        target_path: &Path,
        include_patterns: Option<&[&str]>,
        exclude_patterns: Option<&[&str]>,
    ) -> Result<RestoreResult> {
        let start_time = Utc::now();
        
        let snapshot = self.snapshot_manager.get_snapshot(snapshot_id)
            .ok_or_else(|| DsbtError::Backup(format!("快照不存在: {}", snapshot_id)))?
            .clone();
        
        snapshot.validate()?;
        
        let mut loaded_snapshot = self.load_snapshot_archive(&snapshot)?;
        
        let files_to_restore = self.filter_files_to_restore(
            &loaded_snapshot,
            include_patterns,
            exclude_patterns,
        );
        
        let total_bytes: u64 = files_to_restore.iter().map(|f| f.size).sum();
        
        let mut progress = RestoreProgress {
            backup_id: snapshot_id.to_string(),
            total_files: files_to_restore.len(),
            restored_files: 0,
            total_bytes,
            restored_bytes: 0,
            current_file: None,
            is_completed: false,
            start_time,
            end_time: None,
        };
        
        self.report_progress(&progress);
        
        let mut errors = Vec::new();
        let mut warnings = Vec::new();
        
        let mut restored_files = 0;
        let mut restored_bytes = 0u64;
        
        for file_snapshot in files_to_restore {
            progress.current_file = Some(file_snapshot.relative_path.to_string_lossy().to_string());
            self.report_progress(&progress);
            
            match self.restore_file(
                &file_snapshot,
                target_path,
                &mut loaded_snapshot,
            ) {
                Ok(()) => {
                    restored_files += 1;
                    progress.restored_files = restored_files;
                    restored_bytes += file_snapshot.size;
                    progress.restored_bytes = restored_bytes;
                    self.report_progress(&progress);
                }
                Err(e) => {
                    warnings.push(format!("恢复文件 {:?} 失败: {}", file_snapshot.relative_path, e));
                }
            }
        }
        
        let end_time = Utc::now();
        progress.end_time = Some(end_time);
        progress.is_completed = true;
        self.report_progress(&progress);
        
        Ok(RestoreResult {
            backup_id: snapshot_id.to_string(),
            success: errors.is_empty(),
            start_time,
            end_time,
            total_files: restored_files,
            total_bytes: restored_bytes,
            errors,
            warnings,
        })
    }
    
    pub fn restore_specific_file(
        &mut self,
        snapshot_id: &str,
        file_path: &Path,
        target_path: &Path,
    ) -> Result<RestoreResult> {
        let start_time = Utc::now();
        
        let snapshot = self.snapshot_manager.get_snapshot(snapshot_id)
            .ok_or_else(|| DsbtError::Backup(format!("快照不存在: {}", snapshot_id)))?
            .clone();
        
        snapshot.validate()?;
        
        let mut loaded_snapshot = self.load_snapshot_archive(&snapshot)?;
        
        let file_snapshot = loaded_snapshot.get_file_by_path(file_path)
            .ok_or_else(|| DsbtError::Backup(format!("文件不存在于快照中: {:?}", file_path)))?
            .clone();
        
        let mut errors = Vec::new();
        let mut warnings = Vec::new();
        
        let result = self.restore_file(&file_snapshot, target_path, &mut loaded_snapshot);
        
        if let Err(e) = result {
            errors.push(format!("恢复文件 {:?} 失败: {}", file_path, e));
        }
        
        let end_time = Utc::now();
        
        Ok(RestoreResult {
            backup_id: snapshot_id.to_string(),
            success: errors.is_empty(),
            start_time,
            end_time,
            total_files: if errors.is_empty() { 1 } else { 0 },
            total_bytes: if errors.is_empty() { file_snapshot.size } else { 0 },
            errors,
            warnings,
        })
    }
    
    pub fn restore_to_point_in_time(
        &mut self,
        target_time: DateTime<Utc>,
        target_path: &Path,
    ) -> Result<RestoreResult> {
        let snapshots = self.snapshot_manager.list_snapshots();
        
        let mut best_snapshot: Option<&BackupSnapshot> = None;
        let mut best_diff = chrono::Duration::max_value();
        
        for snapshot in snapshots {
            if let Some(completed_at) = snapshot.completed_at {
                let diff = if completed_at <= target_time {
                    target_time - completed_at
                } else {
                    completed_at - target_time
                };
                
                if diff < best_diff {
                    best_diff = diff;
                    best_snapshot = Some(snapshot);
                }
            }
        }
        
        let best_snapshot = best_snapshot
            .ok_or_else(|| DsbtError::Backup("没有找到适合时间点的快照".to_string()))?;
        
        self.execute_restore(&best_snapshot.id, target_path, None, None)
    }
    
    fn load_snapshot_archive(&mut self, snapshot: &BackupSnapshot) -> Result<BackupSnapshot> {
        let (archive_data, _) = self.storage_backend.get_file(&snapshot.storage_path)?;
        
        let mut data = archive_data;
        
        if snapshot.is_encrypted {
            if let (Some(engine), Some(key_store), Some(key_id)) = (
                &self.encryption_engine,
                &self.key_store,
                &snapshot.encryption_key_id,
            ) {
                let (key, _) = key_store.load_key(key_id)?;
                data = engine.decrypt(&data, &key)?;
            } else {
                return Err(DsbtError::Encryption("快照已加密，但未提供加密引擎或密钥".to_string()));
            }
        }
        
        if snapshot.compression_type != crate::utils::CompressionType::None {
            data = decompress(&data, snapshot.compression_type)?;
        }
        
        let loaded_snapshot: BackupSnapshot = serde_json::from_slice(&data)?;
        
        Ok(loaded_snapshot)
    }
    
    fn filter_files_to_restore(
        &self,
        snapshot: &BackupSnapshot,
        include_patterns: Option<&[&str]>,
        exclude_patterns: Option<&[&str]>,
    ) -> Vec<FileSnapshot> {
        let include_globs: Vec<glob::Pattern> = include_patterns
            .unwrap_or(&[])
            .iter()
            .filter_map(|p| glob::Pattern::new(p).ok())
            .collect();
        
        let exclude_globs: Vec<glob::Pattern> = exclude_patterns
            .unwrap_or(&[])
            .iter()
            .filter_map(|p| glob::Pattern::new(p).ok())
            .collect();
        
        snapshot.files
            .iter()
            .filter(|f| {
                if !include_globs.is_empty() {
                    if !include_globs.iter().any(|p| p.matches(&f.relative_path.to_string_lossy())) {
                        return false;
                    }
                }
                
                if !exclude_globs.is_empty() {
                    if exclude_globs.iter().any(|p| p.matches(&f.relative_path.to_string_lossy())) {
                        return false;
                    }
                }
                
                true
            })
            .cloned()
            .collect()
    }
    
    fn restore_file(
        &self,
        file_snapshot: &FileSnapshot,
        target_path: &Path,
        _snapshot: &mut BackupSnapshot,
    ) -> Result<()> {
        let full_target_path = target_path.join(&file_snapshot.relative_path);
        
        if let Some(parent) = full_target_path.parent() {
            if !parent.exists() {
                std::fs::create_dir_all(parent)?;
            }
        }
        
        if file_snapshot.is_symlink {
            return Ok(());
        }
        
        if file_snapshot.is_directory {
            if !full_target_path.exists() {
                std::fs::create_dir_all(&full_target_path)?;
            }
            return Ok(());
        }
        
        if let Some(ref source_path) = self.find_file_in_backup(file_snapshot) {
            std::fs::copy(source_path, &full_target_path)?;
        }
        
        self.set_file_permissions(&full_target_path, file_snapshot)?;
        
        if let Err(e) = filetime::set_file_mtime(
            &full_target_path,
            FileTime::from_system_time(file_snapshot.modified_at.into()),
        ) {
            tracing::warn!("设置文件修改时间失败: {:?}", e);
        }
        
        Ok(())
    }
    
    fn find_file_in_backup(&self, _file_snapshot: &FileSnapshot) -> Option<PathBuf> {
        None
    }
    
    fn set_file_permissions(&self, _path: &Path, _file_snapshot: &FileSnapshot) -> Result<()> {
        Ok(())
    }
    
    fn report_progress(&self, progress: &RestoreProgress) {
        if let Some(ref callback) = self.progress_callback {
            callback(progress);
        }
    }
}
