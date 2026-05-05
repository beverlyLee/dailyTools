use super::*;
use crate::Result;
use crate::DsbtError;
use crate::storage::*;
use crate::encryption::*;
use chrono::Utc;
use std::path::{Path, PathBuf};
use std::collections::HashMap;
use uuid::Uuid;

pub struct BackupManager {
    config_dir: PathBuf,
    backup_configs: HashMap<String, BackupConfig>,
}

impl BackupManager {
    pub fn new(config_dir: &Path) -> Result<Self> {
        let config_dir = config_dir.to_path_buf();
        if !config_dir.exists() {
            std::fs::create_dir_all(&config_dir)?;
        }
        
        let backup_configs = Self::load_configs(&config_dir)?;
        
        Ok(Self {
            config_dir,
            backup_configs,
        })
    }
    
    fn load_configs(config_dir: &Path) -> Result<HashMap<String, BackupConfig>> {
        let mut configs = HashMap::new();
        
        let configs_dir = config_dir.join("backup_configs");
        if !configs_dir.exists() {
            return Ok(configs);
        }
        
        for entry in std::fs::read_dir(&configs_dir)? {
            let entry = entry?;
            let path = entry.path();
            
            if path.extension().map(|e| e == "toml").unwrap_or(false) {
                let content = std::fs::read_to_string(&path)?;
                let config: BackupConfig = toml::from_str(&content)
                    .map_err(|e| DsbtError::Config(format!("解析备份配置失败: {}", e)))?;
                configs.insert(config.id.clone(), config);
            }
        }
        
        Ok(configs)
    }
    
    fn save_config(&self, config: &BackupConfig) -> Result<()> {
        let configs_dir = self.config_dir.join("backup_configs");
        if !configs_dir.exists() {
            std::fs::create_dir_all(&configs_dir)?;
        }
        
        let config_path = configs_dir.join(format!("{}.toml", config.id));
        let content = toml::to_string_pretty(config)
            .map_err(|e| DsbtError::Config(format!("序列化备份配置失败: {}", e)))?;
        
        std::fs::write(&config_path, content)?;
        
        Ok(())
    }
    
    pub fn create_backup_config(
        &mut self,
        name: &str,
        source_paths: Vec<PathBuf>,
        storage_backend: crate::storage::StorageBackendType,
    ) -> Result<BackupConfig> {
        let id = Uuid::new_v4().to_string();
        
        let config = BackupConfig {
            id: id.clone(),
            name: name.to_string(),
            source_paths,
            exclude_patterns: Vec::new(),
            backup_type: BackupType::Full,
            storage_backend,
            compression: crate::utils::CompressionType::Zstd,
            encryption_enabled: false,
            encryption_key_id: None,
            schedule: None,
            retention_policy: RetentionPolicy::default(),
            max_file_size: None,
        };
        
        self.backup_configs.insert(id.clone(), config.clone());
        self.save_config(&config)?;
        
        Ok(config)
    }
    
    pub fn get_backup_config(&self, config_id: &str) -> Option<&BackupConfig> {
        self.backup_configs.get(config_id)
    }
    
    pub fn get_backup_config_by_name(&self, name: &str) -> Option<&BackupConfig> {
        self.backup_configs.values().find(|c| c.name == name)
    }
    
    pub fn list_backup_configs(&self) -> Vec<&BackupConfig> {
        self.backup_configs.values().collect()
    }
    
    pub fn update_backup_config(&mut self, config: BackupConfig) -> Result<()> {
        if !self.backup_configs.contains_key(&config.id) {
            return Err(DsbtError::Config(format!("备份配置不存在: {}", config.id)));
        }
        
        self.backup_configs.insert(config.id.clone(), config.clone());
        self.save_config(&config)?;
        
        Ok(())
    }
    
    pub fn delete_backup_config(&mut self, config_id: &str) -> Result<()> {
        if !self.backup_configs.contains_key(config_id) {
            return Err(DsbtError::Config(format!("备份配置不存在: {}", config_id)));
        }
        
        self.backup_configs.remove(config_id);
        
        let configs_dir = self.config_dir.join("backup_configs");
        let config_path = configs_dir.join(format!("{}.toml", config_id));
        
        if config_path.exists() {
            std::fs::remove_file(&config_path)?;
        }
        
        Ok(())
    }
    
    pub fn add_exclude_pattern(&mut self, config_id: &str, pattern: &str) -> Result<()> {
        let config = self.backup_configs.get_mut(config_id)
            .ok_or_else(|| DsbtError::Config(format!("备份配置不存在: {}", config_id)))?;
        
        config.exclude_patterns.push(pattern.to_string());
        self.save_config(config)?;
        
        Ok(())
    }
    
    pub fn remove_exclude_pattern(&mut self, config_id: &str, pattern: &str) -> Result<()> {
        let config = self.backup_configs.get_mut(config_id)
            .ok_or_else(|| DsbtError::Config(format!("备份配置不存在: {}", config_id)))?;
        
        let original_len = config.exclude_patterns.len();
        config.exclude_patterns.retain(|p| p != pattern);
        
        if config.exclude_patterns.len() == original_len {
            return Err(DsbtError::Config(format!("排除模式不存在: {}", pattern)));
        }
        
        self.save_config(config)?;
        
        Ok(())
    }
    
    pub fn enable_encryption(&mut self, config_id: &str, key_id: &str) -> Result<()> {
        let config = self.backup_configs.get_mut(config_id)
            .ok_or_else(|| DsbtError::Config(format!("备份配置不存在: {}", config_id)))?;
        
        config.encryption_enabled = true;
        config.encryption_key_id = Some(key_id.to_string());
        
        self.save_config(config)?;
        
        Ok(())
    }
    
    pub fn disable_encryption(&mut self, config_id: &str) -> Result<()> {
        let config = self.backup_configs.get_mut(config_id)
            .ok_or_else(|| DsbtError::Config(format!("备份配置不存在: {}", config_id)))?;
        
        config.encryption_enabled = false;
        config.encryption_key_id = None;
        
        self.save_config(config)?;
        
        Ok(())
    }
    
    pub fn set_backup_type(&mut self, config_id: &str, backup_type: BackupType) -> Result<()> {
        let config = self.backup_configs.get_mut(config_id)
            .ok_or_else(|| DsbtError::Config(format!("备份配置不存在: {}", config_id)))?;
        
        config.backup_type = backup_type;
        
        self.save_config(config)?;
        
        Ok(())
    }
    
    pub fn set_compression(&mut self, config_id: &str, compression: crate::utils::CompressionType) -> Result<()> {
        let config = self.backup_configs.get_mut(config_id)
            .ok_or_else(|| DsbtError::Config(format!("备份配置不存在: {}", config_id)))?;
        
        config.compression = compression;
        
        self.save_config(config)?;
        
        Ok(())
    }
    
    pub fn set_retention_policy(&mut self, config_id: &str, policy: RetentionPolicy) -> Result<()> {
        let config = self.backup_configs.get_mut(config_id)
            .ok_or_else(|| DsbtError::Config(format!("备份配置不存在: {}", config_id)))?;
        
        config.retention_policy = policy;
        
        self.save_config(config)?;
        
        Ok(())
    }
    
    pub fn create_backup_engine(
        &self,
        config_id: &str,
        storage_backend: Box<dyn StorageBackend>,
    ) -> Result<BackupEngine> {
        let config = self.backup_configs.get(config_id)
            .ok_or_else(|| DsbtError::Config(format!("备份配置不存在: {}", config_id)))?
            .clone();
        
        let snapshot_index_path = self.config_dir.join("snapshots").join(&config.id).join("index.json");
        
        let snapshots_dir = snapshot_index_path.parent().unwrap();
        if !snapshots_dir.exists() {
            std::fs::create_dir_all(snapshots_dir)?;
        }
        
        BackupEngine::new(config, storage_backend, &snapshot_index_path)
    }
    
    pub fn create_restore_engine(
        &self,
        config_id: &str,
        storage_backend: Box<dyn StorageBackend>,
    ) -> Result<RestoreEngine> {
        let snapshot_index_path = self.config_dir.join("snapshots").join(config_id).join("index.json");
        
        let snapshot_manager = SnapshotManager::new(config_id, &snapshot_index_path)?;
        
        Ok(RestoreEngine::new(snapshot_manager, storage_backend))
    }
    
    pub fn get_snapshot_manager(&self, config_id: &str) -> Result<SnapshotManager> {
        let snapshot_index_path = self.config_dir.join("snapshots").join(config_id).join("index.json");
        
        SnapshotManager::new(config_id, &snapshot_index_path)
    }
    
    pub fn list_snapshots(&self, config_id: &str) -> Result<Vec<BackupSnapshot>> {
        let snapshot_manager = self.get_snapshot_manager(config_id)?;
        Ok(snapshot_manager.list_snapshots().to_vec())
    }
    
    pub fn get_latest_snapshot(&self, config_id: &str) -> Result<Option<BackupSnapshot>> {
        let snapshot_manager = self.get_snapshot_manager(config_id)?;
        Ok(snapshot_manager.get_latest_snapshot().cloned())
    }
}
