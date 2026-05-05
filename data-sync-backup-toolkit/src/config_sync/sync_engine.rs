use super::*;
use crate::utils::*;
use crate::encryption::*;
use crate::storage::*;
use crate::Result;
use crate::DsbtError;
use std::path::{Path, PathBuf};
use std::collections::HashMap;
use chrono::Utc;
use uuid::Uuid;

pub struct SyncEngine {
    config_manager: ConfigManager,
    storage_backend: Box<dyn StorageBackend>,
    conflict_resolver: ConflictResolver,
    version_controller: Option<VersionController>,
    encryption_engine: Option<EncryptionEngine>,
    key_store: Option<KeyStore>,
}

impl SyncEngine {
    pub fn new(
        config_manager: ConfigManager,
        storage_backend: Box<dyn StorageBackend>,
        conflict_resolver: ConflictResolver,
    ) -> Self {
        Self {
            config_manager,
            storage_backend,
            conflict_resolver,
            version_controller: None,
            encryption_engine: None,
            key_store: None,
        }
    }
    
    pub fn with_version_control(mut self, manifest_path: &Path) -> Result<Self> {
        self.version_controller = Some(VersionController::new(manifest_path)?);
        Ok(self)
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
    
    pub fn sync_profile(&mut self, profile_id: &str) -> Result<SyncResult> {
        let profile = self.config_manager.get_profile(profile_id)
            .ok_or_else(|| DsbtError::Sync(format!("配置文件不存在: {}", profile_id)))?
            .clone();
        
        let mut result = SyncResult {
            profile_id: profile_id.to_string(),
            synced_files: Vec::new(),
            conflicts: Vec::new(),
            errors: Vec::new(),
            start_time: Utc::now(),
            end_time: None,
        };
        
        for config_file in &profile.config_files {
            match self.sync_file(&profile, config_file) {
                Ok(SyncFileResult::Synced) => {
                    result.synced_files.push(config_file.id.clone());
                }
                Ok(SyncFileResult::Conflict(conflict)) => {
                    result.conflicts.push(conflict);
                }
                Err(e) => {
                    result.errors.push(SyncError {
                        file_id: config_file.id.clone(),
                        file_path: config_file.source_path.to_string_lossy().to_string(),
                        error: e.to_string(),
                    });
                }
            }
        }
        
        result.end_time = Some(Utc::now());
        
        Ok(result)
    }
    
    fn sync_file(
        &mut self,
        profile: &SyncProfile,
        config_file: &ConfigFile,
    ) -> Result<SyncFileResult> {
        let local_exists = config_file.source_path.exists();
        let local_hash = if local_exists {
            Some(calculate_file_hash(&config_file.source_path)?)
        } else {
            None
        };
        
        let remote_exists = self.storage_backend.file_exists(&config_file.target_path)?;
        let remote_info = if remote_exists {
            Some(self.storage_backend.get_file_info(&config_file.target_path)?)
        } else {
            None
        };
        
        if !local_exists && !remote_exists {
            return Err(DsbtError::Sync(format!("本地和远程文件都不存在: {:?}", config_file.source_path)));
        }
        
        if !local_exists {
            return self.download_file(profile, config_file);
        }
        
        if !remote_exists {
            return self.upload_file(profile, config_file);
        }
        
        let local_hash = local_hash.ok_or_else(|| 
            DsbtError::Sync(format!("无法计算本地文件哈希: {:?}", config_file.source_path)))?;
        
        let remote_hash = remote_info.as_ref().unwrap().hash.clone()
            .ok_or_else(|| DsbtError::Sync("远程文件没有哈希信息".to_string()))?;
        
        if local_hash == remote_hash {
            return Ok(SyncFileResult::Synced);
        }
        
        let local_version = ConflictVersion {
            version_id: Uuid::new_v4().to_string(),
            hash: local_hash.clone(),
            size: std::fs::metadata(&config_file.source_path)?.len(),
            modified_at: Utc::now(),
            device_id: Some(profile.device_id.clone()),
            message: None,
        };
        
        let remote_version = ConflictVersion {
            version_id: Uuid::new_v4().to_string(),
            hash: remote_hash.clone(),
            size: remote_info.as_ref().unwrap().size,
            modified_at: remote_info.as_ref().unwrap().modified_at.unwrap_or_else(Utc::now),
            device_id: None,
            message: None,
        };
        
        if self.conflict_resolver.detect_conflict(&local_version, &remote_version, None) {
            let conflict = ConflictInfo {
                id: Uuid::new_v4().to_string(),
                file_id: config_file.id.clone(),
                file_path: config_file.source_path.to_string_lossy().to_string(),
                local_version,
                remote_version,
                detected_at: Utc::now(),
                resolved: false,
                resolved_at: None,
                resolution_strategy: None,
            };
            
            return Ok(SyncFileResult::Conflict(conflict));
        }
        
        if self.is_local_newer(config_file, remote_info.as_ref().unwrap()) {
            self.upload_file(profile, config_file)
        } else {
            self.download_file(profile, config_file)
        }
    }
    
    fn is_local_newer(&self, config_file: &ConfigFile, remote_info: &FileInfo) -> bool {
        if let Ok(local_meta) = std::fs::metadata(&config_file.source_path) {
            if let Ok(local_modified) = local_meta.modified() {
                let local_time: chrono::DateTime<Utc> = local_modified.into();
                if let Some(remote_modified) = remote_info.modified_at {
                    return local_time > remote_modified;
                }
            }
        }
        true
    }
    
    fn upload_file(&mut self, profile: &SyncProfile, config_file: &ConfigFile) -> Result<SyncFileResult> {
        let mut content = std::fs::read(&config_file.source_path)?;
        
        if profile.encryption_enabled && config_file.is_sensitive {
            if let (Some(engine), Some(key_store), Some(key_id)) = (
                &self.encryption_engine,
                &self.key_store,
                &profile.encryption_key_id,
            ) {
                let (key, _) = key_store.load_key(key_id)?;
                content = engine.encrypt(&content, &key)?;
            }
        }
        
        let hash = calculate_sha256(&content);
        self.storage_backend.put_file(&config_file.target_path, &content, &hash)?;
        
        if let Some(ref mut vc) = self.version_controller {
            let file_size = content.len() as u64;
            vc.create_version(
                &config_file.source_path,
                &hash,
                file_size,
                Some(&profile.device_id),
                Some("同步上传"),
            )?;
        }
        
        Ok(SyncFileResult::Synced)
    }
    
    fn download_file(&mut self, profile: &SyncProfile, config_file: &ConfigFile) -> Result<SyncFileResult> {
        let (content, _) = self.storage_backend.get_file(&config_file.target_path)?;
        let mut content = content;
        
        if profile.encryption_enabled && config_file.is_sensitive {
            if let (Some(engine), Some(key_store), Some(key_id)) = (
                &self.encryption_engine,
                &self.key_store,
                &profile.encryption_key_id,
            ) {
                let (key, _) = key_store.load_key(key_id)?;
                content = engine.decrypt(&content, &key)?;
            }
        }
        
        if let Some(parent) = config_file.source_path.parent() {
            if !parent.exists() {
                std::fs::create_dir_all(parent)?;
            }
        }
        
        std::fs::write(&config_file.source_path, &content)?;
        
        let hash = calculate_sha256(&content);
        if let Some(ref mut vc) = self.version_controller {
            let file_size = content.len() as u64;
            vc.create_version(
                &config_file.source_path,
                &hash,
                file_size,
                Some(&profile.device_id),
                Some("同步下载"),
            )?;
        }
        
        Ok(SyncFileResult::Synced)
    }
    
    pub fn resolve_conflict(
        &mut self,
        profile_id: &str,
        conflict: &ConflictInfo,
        strategy: ConflictResolutionStrategy,
    ) -> Result<()> {
        let profile = self.config_manager.get_profile(profile_id)
            .ok_or_else(|| DsbtError::Sync(format!("配置文件不存在: {}", profile_id)))?;
        
        let config_file = profile.config_files.iter()
            .find(|c| c.id == conflict.file_id)
            .ok_or_else(|| DsbtError::Sync(format!("配置文件不存在: {}", conflict.file_id)))?;
        
        match strategy {
            ConflictResolutionStrategy::LocalFirst => {
                self.upload_file(profile, config_file)?;
            }
            ConflictResolutionStrategy::RemoteFirst => {
                self.download_file(profile, config_file)?;
            }
            ConflictResolutionStrategy::LatestFirst => {
                if conflict.local_version.modified_at > conflict.remote_version.modified_at {
                    self.upload_file(profile, config_file)?;
                } else {
                    self.download_file(profile, config_file)?;
                }
            }
            ConflictResolutionStrategy::KeepBoth => {
                let backup_path = config_file.source_path.with_extension(format!(
                    "{}.backup.{}",
                    config_file.source_path.extension().unwrap_or_default().to_string_lossy(),
                    Utc::now().format("%Y%m%d%H%M%S")
                ));
                std::fs::copy(&config_file.source_path, &backup_path)?;
                self.download_file(profile, config_file)?;
            }
            ConflictResolutionStrategy::Manual => {
                return Err(DsbtError::Conflict("需要手动解决冲突".to_string()));
            }
        }
        
        Ok(())
    }
    
    pub fn get_sync_status(&self, profile_id: &str) -> Result<SyncStatus> {
        let profile = self.config_manager.get_profile(profile_id)
            .ok_or_else(|| DsbtError::Sync(format!("配置文件不存在: {}", profile_id)))?;
        
        let mut pending = 0;
        let mut synced = 0;
        
        for config_file in &profile.config_files {
            let local_exists = config_file.source_path.exists();
            let remote_exists = self.storage_backend.file_exists(&config_file.target_path)
                .unwrap_or(false);
            
            if !local_exists || !remote_exists {
                pending += 1;
                continue;
            }
            
            let local_hash = calculate_file_hash(&config_file.source_path).ok();
            let remote_info = self.storage_backend.get_file_info(&config_file.target_path).ok();
            
            match (local_hash, remote_info) {
                (Some(lh), Some(ri)) => {
                    if Some(lh) == ri.hash {
                        synced += 1;
                    } else {
                        pending += 1;
                    }
                }
                _ => pending += 1,
            }
        }
        
        Ok(SyncStatus {
            profile_id: profile_id.to_string(),
            last_sync_time: None,
            pending_files: pending,
            synced_files: synced,
            conflicts: 0,
            is_syncing: false,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SyncFileResult {
    Synced,
    Conflict(ConflictInfo),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncResult {
    pub profile_id: String,
    pub synced_files: Vec<String>,
    pub conflicts: Vec<ConflictInfo>,
    pub errors: Vec<SyncError>,
    pub start_time: chrono::DateTime<chrono::Utc>,
    pub end_time: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncError {
    pub file_id: String,
    pub file_path: String,
    pub error: String,
}
