pub mod local;
pub mod s3;
pub mod sftp;

pub use local::*;
pub use s3::*;
pub use sftp::*;

use serde::{Deserialize, Serialize};
use std::path::Path;
use crate::Result;
use chrono::DateTime;
use chrono::Utc;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileInfo {
    pub path: String,
    pub size: u64,
    pub created_at: Option<DateTime<Utc>>,
    pub modified_at: Option<DateTime<Utc>>,
    pub hash: Option<String>,
    pub metadata: std::collections::HashMap<String, String>,
}

pub trait StorageBackend: Send + Sync {
    fn name(&self) -> &str;
    
    fn put_file(&self, path: &Path, content: &[u8], hash: &str) -> Result<()>;
    
    fn get_file(&self, path: &Path) -> Result<(Vec<u8>, FileInfo)>;
    
    fn delete_file(&self, path: &Path) -> Result<()>;
    
    fn file_exists(&self, path: &Path) -> Result<bool>;
    
    fn get_file_info(&self, path: &Path) -> Result<FileInfo>;
    
    fn list_files(&self, prefix: Option<&Path>) -> Result<Vec<FileInfo>>;
    
    fn copy_file(&self, from: &Path, to: &Path) -> Result<()>;
    
    fn move_file(&self, from: &Path, to: &Path) -> Result<()>;
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub enum StorageBackendType {
    Local,
    S3,
    SFTP,
}

impl Default for StorageBackendType {
    fn default() -> Self {
        StorageBackendType::Local
    }
}

pub struct StorageFactory;

impl StorageFactory {
    pub fn create_local_backend(base_path: &Path) -> Result<Box<dyn StorageBackend>> {
        Ok(Box::new(LocalStorageBackend::new(base_path)?))
    }
    
    #[cfg(feature = "s3")]
    pub async fn create_s3_backend(
        bucket: &str,
        region: Option<&str>,
        endpoint: Option<&str>,
    ) -> Result<Box<dyn StorageBackend>> {
        Ok(Box::new(S3StorageBackend::new(bucket, region, endpoint).await?))
    }
    
    #[cfg(feature = "sftp")]
    pub async fn create_sftp_backend(
        host: &str,
        port: u16,
        username: &str,
        password: Option<&str>,
        key_path: Option<&Path>,
    ) -> Result<Box<dyn StorageBackend>> {
        Ok(Box::new(SFTPStorageBackend::new(host, port, username, password, key_path).await?))
    }
}
