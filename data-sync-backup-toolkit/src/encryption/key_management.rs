use rand::Rng;
use sha2::{Sha256, Digest};
use std::path::{Path, PathBuf};
use crate::Result;
use crate::DsbtError;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyInfo {
    pub key_id: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub algorithm: super::EncryptionAlgorithm,
    pub hint: Option<String>,
}

pub fn generate_secure_key() -> [u8; 32] {
    let mut key = [0u8; 32];
    rand::thread_rng().fill(&mut key);
    key
}

pub fn derive_key_from_password(password: &str, salt: &[u8]) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(password.as_bytes());
    hasher.update(salt);
    let result = hasher.finalize();
    
    let mut key = [0u8; 32];
    key.copy_from_slice(&result);
    key
}

pub fn generate_salt() -> [u8; 16] {
    let mut salt = [0u8; 16];
    rand::thread_rng().fill(&mut salt);
    salt
}

pub struct KeyStore {
    keys_dir: PathBuf,
}

impl KeyStore {
    pub fn new(keys_dir: &Path) -> Self {
        Self {
            keys_dir: keys_dir.to_path_buf(),
        }
    }
    
    pub fn init(&self) -> Result<()> {
        if !self.keys_dir.exists() {
            std::fs::create_dir_all(&self.keys_dir)?;
        }
        Ok(())
    }
    
    pub fn save_key(&self, key_id: &str, key: &[u8], hint: Option<&str>) -> Result<()> {
        if key.len() != 32 {
            return Err(DsbtError::Encryption("密钥长度必须为32字节".to_string()));
        }
        
        let key_file = self.keys_dir.join(format!("{}.key", key_id));
        let info_file = self.keys_dir.join(format!("{}.info", key_id));
        
        std::fs::write(&key_file, key)?;
        
        let key_info = KeyInfo {
            key_id: key_id.to_string(),
            created_at: chrono::Utc::now(),
            algorithm: super::EncryptionAlgorithm::Aes256Gcm,
            hint: hint.map(|s| s.to_string()),
        };
        
        let info_json = serde_json::to_string_pretty(&key_info)?;
        std::fs::write(&info_file, info_json)?;
        
        Ok(())
    }
    
    pub fn load_key(&self, key_id: &str) -> Result<(Vec<u8>, KeyInfo)> {
        let key_file = self.keys_dir.join(format!("{}.key", key_id));
        let info_file = self.keys_dir.join(format!("{}.info", key_id));
        
        if !key_file.exists() {
            return Err(DsbtError::Encryption(format!("密钥文件不存在: {:?}", key_file)));
        }
        
        let key = std::fs::read(&key_file)?;
        
        let info: KeyInfo = if info_file.exists() {
            let info_str = std::fs::read_to_string(&info_file)?;
            serde_json::from_str(&info_str)?
        } else {
            KeyInfo {
                key_id: key_id.to_string(),
                created_at: chrono::Utc::now(),
                algorithm: super::EncryptionAlgorithm::Aes256Gcm,
                hint: None,
            }
        };
        
        Ok((key, info))
    }
    
    pub fn list_keys(&self) -> Result<Vec<KeyInfo>> {
        let mut keys = Vec::new();
        
        if !self.keys_dir.exists() {
            return Ok(keys);
        }
        
        for entry in std::fs::read_dir(&self.keys_dir)? {
            let entry = entry?;
            let path = entry.path();
            
            if let Some(extension) = path.extension() {
                if extension == "info" {
                    let info_str = std::fs::read_to_string(&path)?;
                    let info: KeyInfo = serde_json::from_str(&info_str)?;
                    keys.push(info);
                }
            }
        }
        
        keys.sort_by(|a, b| b.created_at.cmp(&a.created_at));
        Ok(keys)
    }
    
    pub fn delete_key(&self, key_id: &str) -> Result<()> {
        let key_file = self.keys_dir.join(format!("{}.key", key_id));
        let info_file = self.keys_dir.join(format!("{}.info", key_id));
        
        if key_file.exists() {
            std::fs::remove_file(&key_file)?;
        }
        
        if info_file.exists() {
            std::fs::remove_file(&info_file)?;
        }
        
        Ok(())
    }
}
