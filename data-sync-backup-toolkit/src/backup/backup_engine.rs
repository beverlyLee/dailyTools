use super::*;
use crate::Result;
use crate::DsbtError;
use crate::utils::*;
use crate::storage::*;
use crate::encryption::*;
use chrono::Utc;
use std::path::{Path, PathBuf};
use std::collections::HashMap;
use walkdir::WalkDir;
use ignore::WalkBuilder;

pub struct BackupEngine {
    config: BackupConfig,
    storage_backend: Box<dyn StorageBackend>,
    snapshot_manager: SnapshotManager,
    encryption_engine: Option<EncryptionEngine>,
    key_store: Option<KeyStore>,
    progress_callback: Option<Box<dyn Fn(&BackupProgress) + Send + Sync>>,
}

impl BackupEngine {
    pub fn new(
        config: BackupConfig,
        storage_backend: Box<dyn StorageBackend>,
        snapshot_index_path: &Path,
    ) -> Result<Self> {
        let snapshot_manager = SnapshotManager::new(&config.id, snapshot_index_path)?;
        
        Ok(Self {
            config,
            storage_backend,
            snapshot_manager,
            encryption_engine: None,
            key_store: None,
            progress_callback: None,
        })
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
        F: Fn(&BackupProgress) + Send + Sync + 'static,
    {
        self.progress_callback = Some(Box::new(callback));
    }
    
    pub fn execute_backup(&mut self, backup_type: Option<BackupType>) -> Result<BackupResult> {
        let start_time = Utc::now();
        let backup_type = backup_type.unwrap_or(self.config.backup_type);
        
        let (total_files, total_bytes) = self.calculate_backup_size()?;
        
        let mut progress = BackupProgress {
            backup_id: String::new(),
            total_files,
            processed_files: 0,
            total_bytes,
            processed_bytes: 0,
            current_file: None,
            is_completed: false,
            start_time,
            end_time: None,
        };
        
        let parent_snapshot_id = match backup_type {
            BackupType::Incremental | BackupType::Differential => {
                self.snapshot_manager.get_latest_snapshot().map(|s| s.id.clone())
            }
            BackupType::Full => None,
        };
        
        let mut snapshot = self.snapshot_manager.create_snapshot(
            &self.config,
            backup_type,
            parent_snapshot_id.as_deref(),
        );
        
        progress.backup_id = snapshot.id.clone();
        self.report_progress(&progress);
        
        let mut errors = Vec::new();
        let mut warnings = Vec::new();
        
        let files_to_backup = self.collect_files_to_backup(&mut snapshot, backup_type)?;
        
        let mut processed_files = 0;
        let mut processed_bytes = 0u64;
        
        for file_path in files_to_backup {
            progress.current_file = Some(file_path.to_string_lossy().to_string());
            self.report_progress(&progress);
            
            match self.process_file(&file_path, &mut snapshot) {
                Ok(file_snapshot) => {
                    snapshot.files.push(file_snapshot);
                    processed_files += 1;
                    progress.processed_files = processed_files;
                    processed_bytes += file_snapshot.size;
                    progress.processed_bytes = processed_bytes;
                    self.report_progress(&progress);
                }
                Err(e) => {
                    warnings.push(format!("跳过文件 {:?}: {}", file_path, e));
                }
            }
        }
        
        snapshot.total_files = snapshot.files.len();
        snapshot.total_bytes = processed_bytes;
        
        let compressed_bytes = self.create_backup_archive(&mut snapshot)?;
        snapshot.compressed_bytes = Some(compressed_bytes);
        snapshot.is_valid = true;
        snapshot.completed_at = Some(Utc::now());
        
        self.snapshot_manager.add_snapshot(snapshot.clone())?;
        
        let end_time = Utc::now();
        progress.end_time = Some(end_time);
        progress.is_completed = true;
        self.report_progress(&progress);
        
        let removed = self.snapshot_manager.apply_retention_policy(&self.config.retention_policy)?;
        for snapshot_id in removed {
            let snapshot_path = PathBuf::from(&snapshot_id);
            if self.storage_backend.file_exists(&snapshot_path)? {
                self.storage_backend.delete_file(&snapshot_path)?;
            }
        }
        
        Ok(BackupResult {
            backup_id: snapshot.id.clone(),
            success: errors.is_empty(),
            start_time,
            end_time,
            total_files: snapshot.total_files,
            total_bytes: snapshot.total_bytes,
            compressed_bytes: snapshot.compressed_bytes,
            errors,
            warnings,
            snapshot_path: Some(snapshot.storage_path.clone()),
        })
    }
    
    fn collect_files_to_backup(
        &self,
        _snapshot: &mut BackupSnapshot,
        backup_type: BackupType,
    ) -> Result<Vec<PathBuf>> {
        let mut files = Vec::new();
        let exclude_patterns: Vec<glob::Pattern> = self.config.exclude_patterns
            .iter()
            .filter_map(|p| glob::Pattern::new(p).ok())
            .collect();
        
        for source_path in &self.config.source_paths {
            if !source_path.exists() {
                continue;
            }
            
            if source_path.is_file() {
                if !self.should_exclude(source_path, &exclude_patterns) {
                    if backup_type == BackupType::Incremental || backup_type == BackupType::Differential {
                        if let Some(latest) = self.snapshot_manager.get_latest_snapshot() {
                            if let Some(old_file) = latest.get_file_by_path(source_path) {
                                if let Ok(current_hash) = calculate_file_hash(source_path) {
                                    if current_hash == old_file.hash {
                                        continue;
                                    }
                                }
                            }
                        }
                    }
                    files.push(source_path.clone());
                }
            } else if source_path.is_dir() {
                for entry in WalkDir::new(source_path) {
                    let entry = entry?;
                    if entry.file_type().is_file() {
                        let entry_path = entry.path();
                        if !self.should_exclude(entry_path, &exclude_patterns) {
                            if backup_type == BackupType::Incremental || backup_type == BackupType::Differential {
                                if let Some(latest) = self.snapshot_manager.get_latest_snapshot() {
                                    if let Some(old_file) = latest.get_file_by_path(entry_path) {
                                        if let Ok(current_hash) = calculate_file_hash(entry_path) {
                                            if current_hash == old_file.hash {
                                                continue;
                                            }
                                        }
                                    }
                                }
                            }
                            files.push(entry_path.to_path_buf());
                        }
                    }
                }
            }
        }
        
        Ok(files)
    }
    
    fn should_exclude(&self, path: &Path, patterns: &[glob::Pattern]) -> bool {
        for pattern in patterns {
            if pattern.matches(&path.to_string_lossy()) {
                return true;
            }
        }
        false
    }
    
    fn calculate_backup_size(&self) -> Result<(usize, u64)> {
        let mut file_count = 0;
        let mut total_bytes = 0u64;
        
        let exclude_patterns: Vec<glob::Pattern> = self.config.exclude_patterns
            .iter()
            .filter_map(|p| glob::Pattern::new(p).ok())
            .collect();
        
        for source_path in &self.config.source_paths {
            if !source_path.exists() {
                continue;
            }
            
            if source_path.is_file() {
                if !self.should_exclude(source_path, &exclude_patterns) {
                    if let Ok(meta) = std::fs::metadata(source_path) {
                        file_count += 1;
                        total_bytes += meta.len();
                    }
                }
            } else if source_path.is_dir() {
                for entry in WalkDir::new(source_path) {
                    let entry = entry?;
                    if entry.file_type().is_file() {
                        let entry_path = entry.path();
                        if !self.should_exclude(entry_path, &exclude_patterns) {
                            if let Ok(meta) = std::fs::metadata(entry_path) {
                                file_count += 1;
                                total_bytes += meta.len();
                            }
                        }
                    }
                }
            }
        }
        
        Ok((file_count, total_bytes))
    }
    
    fn process_file(&self, path: &Path, snapshot: &BackupSnapshot) -> Result<FileSnapshot> {
        let metadata = std::fs::metadata(path)?;
        
        let hash = calculate_file_hash(path)?;
        
        let modified_at: chrono::DateTime<Utc> = metadata.modified()?.into();
        let created_at: chrono::DateTime<Utc> = metadata.created()?.into();
        
        let mut common_base = PathBuf::new();
        for source_path in &self.config.source_paths {
            if path.starts_with(source_path) {
                common_base = source_path.clone();
                break;
            }
        }
        
        let relative_path = if common_base != PathBuf::new() {
            path.strip_prefix(&common_base)
                .unwrap_or(path)
                .to_path_buf()
        } else {
            path.to_path_buf()
        };
        
        Ok(FileSnapshot {
            path: path.to_path_buf(),
            relative_path,
            hash,
            size: metadata.len(),
            modified_at,
            created_at,
            is_symlink: metadata.file_type().is_symlink(),
            is_directory: metadata.is_dir(),
            permissions: None,
            owner: None,
            group: None,
        })
    }
    
    fn create_backup_archive(&mut self, snapshot: &mut BackupSnapshot) -> Result<u64> {
        let snapshot_data = serde_json::to_vec(snapshot)?;
        
        let mut archive_data = snapshot_data;
        
        if snapshot.compression_type != crate::utils::CompressionType::None {
            archive_data = compress(&archive_data, snapshot.compression_type)?;
        }
        
        if snapshot.is_encrypted {
            if let (Some(engine), Some(key_store), Some(key_id)) = (
                &self.encryption_engine,
                &self.key_store,
                &snapshot.encryption_key_id,
            ) {
                let (key, _) = key_store.load_key(key_id)?;
                archive_data = engine.encrypt(&archive_data, &key)?;
            }
        }
        
        let hash = calculate_sha256(&archive_data);
        self.storage_backend.put_file(&snapshot.storage_path, &archive_data, &hash)?;
        
        Ok(archive_data.len() as u64)
    }
    
    fn report_progress(&self, progress: &BackupProgress) {
        if let Some(ref callback) = self.progress_callback {
            callback(progress);
        }
    }
}
