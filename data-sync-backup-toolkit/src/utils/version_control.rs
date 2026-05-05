use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use crate::Result;
use crate::DsbtError;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Version {
    pub version_id: String,
    pub file_path: String,
    pub hash: String,
    pub size: u64,
    pub created_at: DateTime<Utc>,
    pub modified_at: DateTime<Utc>,
    pub device_id: Option<String>,
    pub message: Option<String>,
    pub parent_version_id: Option<String>,
    pub metadata: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VersionHistory {
    pub file_path: String,
    pub versions: Vec<Version>,
    pub current_version_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VersionManifest {
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub files: HashMap<String, VersionHistory>,
}

pub struct VersionController {
    manifest_path: PathBuf,
    manifest: VersionManifest,
}

impl VersionController {
    pub fn new(manifest_path: &Path) -> Result<Self> {
        let manifest = if manifest_path.exists() {
            let content = std::fs::read_to_string(manifest_path)?;
            serde_json::from_str(&content)?
        } else {
            VersionManifest {
                created_at: Utc::now(),
                updated_at: Utc::now(),
                files: HashMap::new(),
            }
        };
        
        Ok(Self {
            manifest_path: manifest_path.to_path_buf(),
            manifest,
        })
    }
    
    pub fn save(&mut self) -> Result<()> {
        self.manifest.updated_at = Utc::now();
        let content = serde_json::to_string_pretty(&self.manifest)?;
        std::fs::write(&self.manifest_path, content)?;
        Ok(())
    }
    
    pub fn create_version(
        &mut self,
        file_path: &Path,
        hash: &str,
        size: u64,
        device_id: Option<&str>,
        message: Option<&str>,
    ) -> Result<Version> {
        let file_path_str = file_path.to_string_lossy().to_string();
        
        let history = self.manifest.files.entry(file_path_str.clone())
            .or_insert_with(|| VersionHistory {
                file_path: file_path_str.clone(),
                versions: Vec::new(),
                current_version_id: None,
            });
        
        let version_id = format!("v_{}_{}", 
            Utc::now().format("%Y%m%d%H%M%S"),
            &hash[..8]
        );
        
        let parent_version_id = history.current_version_id.clone();
        
        let version = Version {
            version_id: version_id.clone(),
            file_path: file_path_str.clone(),
            hash: hash.to_string(),
            size,
            created_at: Utc::now(),
            modified_at: Utc::now(),
            device_id: device_id.map(|s| s.to_string()),
            message: message.map(|s| s.to_string()),
            parent_version_id,
            metadata: HashMap::new(),
        };
        
        history.versions.push(version.clone());
        history.current_version_id = Some(version_id);
        
        self.save()?;
        
        Ok(version)
    }
    
    pub fn get_version(&self, file_path: &Path, version_id: &str) -> Option<&Version> {
        let file_path_str = file_path.to_string_lossy().to_string();
        self.manifest.files.get(&file_path_str)
            .and_then(|history| {
                history.versions.iter().find(|v| v.version_id == version_id)
            })
    }
    
    pub fn get_latest_version(&self, file_path: &Path) -> Option<&Version> {
        let file_path_str = file_path.to_string_lossy().to_string();
        self.manifest.files.get(&file_path_str)
            .and_then(|history| {
                history.versions.last()
            })
    }
    
    pub fn list_versions(&self, file_path: &Path) -> Vec<&Version> {
        let file_path_str = file_path.to_string_lossy().to_string();
        self.manifest.files.get(&file_path_str)
            .map(|history| history.versions.iter().collect())
            .unwrap_or_default()
    }
    
    pub fn rollback_to_version(&mut self, file_path: &Path, version_id: &str) -> Result<&Version> {
        let file_path_str = file_path.to_string_lossy().to_string();
        
        let history = self.manifest.files.get_mut(&file_path_str)
            .ok_or_else(|| DsbtError::Version(format!("文件 {} 没有版本历史", file_path_str)))?;
        
        let version_exists = history.versions.iter().any(|v| v.version_id == version_id);
        
        if !version_exists {
            return Err(DsbtError::Version(format!("版本 {} 不存在", version_id)));
        }
        
        history.current_version_id = Some(version_id.to_string());
        self.save()?;
        
        self.get_version(file_path, version_id)
            .ok_or_else(|| DsbtError::Version("获取版本失败".to_string()))
    }
    
    pub fn list_all_files(&self) -> Vec<&String> {
        self.manifest.files.keys().collect()
    }
    
    pub fn get_version_count(&self) -> usize {
        self.manifest.files.values()
            .map(|h| h.versions.len())
            .sum()
    }
}
