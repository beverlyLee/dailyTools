use super::*;
use crate::utils::*;
use crate::encryption::*;
use crate::Result;
use crate::DsbtError;
use std::path::{Path, PathBuf};
use std::collections::HashMap;
use chrono::Utc;
use uuid::Uuid;

pub struct ConfigManager {
    config_dir: PathBuf,
    profiles: HashMap<String, SyncProfile>,
    encryption_engine: Option<EncryptionEngine>,
    key_store: Option<KeyStore>,
}

impl ConfigManager {
    pub fn new(config_dir: &Path) -> Result<Self> {
        let config_dir = config_dir.to_path_buf();
        if !config_dir.exists() {
            std::fs::create_dir_all(&config_dir)?;
        }
        
        let profiles = Self::load_profiles(&config_dir)?;
        
        Ok(Self {
            config_dir,
            profiles,
            encryption_engine: None,
            key_store: None,
        })
    }
    
    pub fn with_encryption(mut self, algorithm: EncryptionAlgorithm, keys_dir: &Path) -> Result<Self> {
        self.encryption_engine = Some(EncryptionEngine::new(algorithm));
        self.key_store = Some(KeyStore::new(keys_dir));
        if let Some(ref ks) = self.key_store {
            ks.init()?;
        }
        Ok(self)
    }
    
    fn load_profiles(config_dir: &Path) -> Result<HashMap<String, SyncProfile>> {
        let mut profiles = HashMap::new();
        
        let profiles_dir = config_dir.join("profiles");
        if !profiles_dir.exists() {
            return Ok(profiles);
        }
        
        for entry in std::fs::read_dir(&profiles_dir)? {
            let entry = entry?;
            let path = entry.path();
            
            if path.extension().map(|e| e == "toml").unwrap_or(false) {
                let content = std::fs::read_to_string(&path)?;
                let profile: SyncProfile = toml::from_str(&content)
                    .map_err(|e| DsbtError::Config(format!("解析配置文件失败: {}", e)))?;
                profiles.insert(profile.id.clone(), profile);
            }
        }
        
        Ok(profiles)
    }
    
    pub fn create_profile(&mut self, name: &str, device_id: Option<&str>) -> Result<SyncProfile> {
        let id = Uuid::new_v4().to_string();
        let device_id = device_id.map(|s| s.to_string())
            .unwrap_or_else(|| Uuid::new_v4().to_string());
        
        let profile = SyncProfile {
            id: id.clone(),
            name: name.to_string(),
            device_id,
            config_files: Vec::new(),
            storage_backend: StorageBackendType::Local,
            auto_sync: false,
            sync_interval_seconds: 3600,
            conflict_resolution: ConflictResolutionStrategy::LatestFirst,
            encryption_enabled: false,
            encryption_key_id: None,
        };
        
        self.profiles.insert(id.clone(), profile.clone());
        self.save_profile(&profile)?;
        
        Ok(profile)
    }
    
    pub fn get_profile(&self, profile_id: &str) -> Option<&SyncProfile> {
        self.profiles.get(profile_id)
    }
    
    pub fn get_profile_by_name(&self, name: &str) -> Option<&SyncProfile> {
        self.profiles.values().find(|p| p.name == name)
    }
    
    pub fn list_profiles(&self) -> Vec<&SyncProfile> {
        self.profiles.values().collect()
    }
    
    pub fn update_profile(&mut self, profile: SyncProfile) -> Result<()> {
        if !self.profiles.contains_key(&profile.id) {
            return Err(DsbtError::Config(format!("配置文件不存在: {}", profile.id)));
        }
        
        self.profiles.insert(profile.id.clone(), profile.clone());
        self.save_profile(&profile)?;
        
        Ok(())
    }
    
    pub fn delete_profile(&mut self, profile_id: &str) -> Result<()> {
        if !self.profiles.contains_key(profile_id) {
            return Err(DsbtError::Config(format!("配置文件不存在: {}", profile_id)));
        }
        
        self.profiles.remove(profile_id);
        
        let profiles_dir = self.config_dir.join("profiles");
        let profile_path = profiles_dir.join(format!("{}.toml", profile_id));
        
        if profile_path.exists() {
            std::fs::remove_file(&profile_path)?;
        }
        
        Ok(())
    }
    
    fn save_profile(&self, profile: &SyncProfile) -> Result<()> {
        let profiles_dir = self.config_dir.join("profiles");
        if !profiles_dir.exists() {
            std::fs::create_dir_all(&profiles_dir)?;
        }
        
        let profile_path = profiles_dir.join(format!("{}.toml", profile.id));
        let content = toml::to_string_pretty(profile)
            .map_err(|e| DsbtError::Config(format!("序列化配置失败: {}", e)))?;
        
        std::fs::write(&profile_path, content)?;
        
        Ok(())
    }
    
    pub fn add_config_file(
        &mut self,
        profile_id: &str,
        source_path: &Path,
        name: Option<&str>,
        is_sensitive: bool,
        tags: Vec<&str>,
    ) -> Result<ConfigFile> {
        let profile = self.profiles.get_mut(profile_id)
            .ok_or_else(|| DsbtError::Config(format!("配置文件不存在: {}", profile_id)))?;
        
        if !source_path.exists() {
            return Err(DsbtError::Config(format!("源文件不存在: {:?}", source_path)));
        }
        
        if !source_path.is_file() {
            return Err(DsbtError::Config(format!("源路径不是文件: {:?}", source_path)));
        }
        
        let id = Uuid::new_v4().to_string();
        let name = name.map(|s| s.to_string())
            .unwrap_or_else(|| source_path.file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_else(|| "config".to_string()));
        
        let hash = calculate_file_hash(source_path).ok();
        
        let config_file = ConfigFile {
            id: id.clone(),
            name,
            source_path: source_path.to_path_buf(),
            target_path: PathBuf::from(&id),
            is_sensitive,
            last_synced: None,
            hash,
            tags: tags.into_iter().map(|s| s.to_string()).collect(),
            metadata: HashMap::new(),
        };
        
        profile.config_files.push(config_file.clone());
        self.save_profile(profile)?;
        
        Ok(config_file)
    }
    
    pub fn remove_config_file(&mut self, profile_id: &str, config_id: &str) -> Result<()> {
        let profile = self.profiles.get_mut(profile_id)
            .ok_or_else(|| DsbtError::Config(format!("配置文件不存在: {}", profile_id)))?;
        
        let original_len = profile.config_files.len();
        profile.config_files.retain(|c| c.id != config_id);
        
        if profile.config_files.len() == original_len {
            return Err(DsbtError::Config(format!("配置文件不存在: {}", config_id)));
        }
        
        self.save_profile(profile)?;
        
        Ok(())
    }
    
    pub fn get_config_file(&self, profile_id: &str, config_id: &str) -> Option<&ConfigFile> {
        self.profiles.get(profile_id)
            .and_then(|p| p.config_files.iter().find(|c| c.id == config_id))
    }
    
    pub fn list_config_files(&self, profile_id: &str) -> Result<Vec<&ConfigFile>> {
        let profile = self.profiles.get(profile_id)
            .ok_or_else(|| DsbtError::Config(format!("配置文件不存在: {}", profile_id)))?;
        
        Ok(profile.config_files.iter().collect())
    }
    
    pub fn enable_encryption(&mut self, profile_id: &str, key_id: &str) -> Result<()> {
        let profile = self.profiles.get_mut(profile_id)
            .ok_or_else(|| DsbtError::Config(format!("配置文件不存在: {}", profile_id)))?;
        
        if self.key_store.is_none() {
            return Err(DsbtError::Config("密钥存储未初始化".to_string()));
        }
        
        profile.encryption_enabled = true;
        profile.encryption_key_id = Some(key_id.to_string());
        
        self.save_profile(profile)?;
        
        Ok(())
    }
    
    pub fn disable_encryption(&mut self, profile_id: &str) -> Result<()> {
        let profile = self.profiles.get_mut(profile_id)
            .ok_or_else(|| DsbtError::Config(format!("配置文件不存在: {}", profile_id)))?;
        
        profile.encryption_enabled = false;
        profile.encryption_key_id = None;
        
        self.save_profile(profile)?;
        
        Ok(())
    }
}
