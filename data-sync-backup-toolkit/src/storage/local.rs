use super::*;
use crate::utils::*;
use crate::Result;
use crate::DsbtError;
use std::path::{Path, PathBuf};
use std::collections::HashMap;
use chrono::Utc;
use filetime::FileTime;
use walkdir::WalkDir;

pub struct LocalStorageBackend {
    base_path: PathBuf,
    metadata_dir: PathBuf,
}

impl LocalStorageBackend {
    pub fn new(base_path: &Path) -> Result<Self> {
        let base_path = base_path.to_path_buf();
        if !base_path.exists() {
            std::fs::create_dir_all(&base_path)?;
        }
        
        let metadata_dir = base_path.join(".metadata");
        if !metadata_dir.exists() {
            std::fs::create_dir_all(&metadata_dir)?;
        }
        
        Ok(Self {
            base_path,
            metadata_dir,
        })
    }
    
    fn full_path(&self, path: &Path) -> PathBuf {
        let normalized = normalize_path(path);
        if normalized.is_absolute() {
            normalized
        } else {
            self.base_path.join(normalized)
        }
    }
    
    fn metadata_path(&self, path: &Path) -> PathBuf {
        let relative = if path.is_absolute() {
            path.strip_prefix(&self.base_path).unwrap_or(path)
        } else {
            path
        };
        let hash = calculate_sha256(relative.to_string_lossy().as_bytes());
        self.metadata_dir.join(format!("{}.json", hash))
    }
    
    fn load_metadata(&self, path: &Path) -> Result<FileMetadata> {
        let meta_path = self.metadata_path(path);
        if meta_path.exists() {
            let content = std::fs::read_to_string(&meta_path)?;
            let meta: FileMetadata = serde_json::from_str(&content)?;
            Ok(meta)
        } else {
            Ok(FileMetadata::default())
        }
    }
    
    fn save_metadata(&self, path: &Path, metadata: &FileMetadata) -> Result<()> {
        let meta_path = self.metadata_path(path);
        let content = serde_json::to_string_pretty(metadata)?;
        std::fs::write(&meta_path, content)?;
        Ok(())
    }
}

impl StorageBackend for LocalStorageBackend {
    fn name(&self) -> &str {
        "local"
    }
    
    fn put_file(&self, path: &Path, content: &[u8], hash: &str) -> Result<()> {
        let full_path = self.full_path(path);
        
        if let Some(parent) = full_path.parent() {
            if !parent.exists() {
                std::fs::create_dir_all(parent)?;
            }
        }
        
        std::fs::write(&full_path, content)?;
        
        let now = Utc::now();
        let metadata = FileMetadata {
            hash: Some(hash.to_string()),
            size: content.len() as u64,
            created_at: Some(now),
            modified_at: Some(now),
            custom: HashMap::new(),
        };
        
        self.save_metadata(path, &metadata)?;
        
        Ok(())
    }
    
    fn get_file(&self, path: &Path) -> Result<(Vec<u8>, FileInfo)> {
        let full_path = self.full_path(path);
        
        if !full_path.exists() {
            return Err(DsbtError::Storage(format!("文件不存在: {:?}", full_path)));
        }
        
        let content = std::fs::read(&full_path)?;
        let metadata = self.load_metadata(path)?;
        
        let file_info = FileInfo {
            path: path.to_string_lossy().to_string(),
            size: content.len() as u64,
            created_at: metadata.created_at,
            modified_at: metadata.modified_at,
            hash: metadata.hash,
            metadata: metadata.custom,
        };
        
        Ok((content, file_info))
    }
    
    fn delete_file(&self, path: &Path) -> Result<()> {
        let full_path = self.full_path(path);
        
        if full_path.exists() {
            std::fs::remove_file(&full_path)?;
        }
        
        let meta_path = self.metadata_path(path);
        if meta_path.exists() {
            std::fs::remove_file(&meta_path)?;
        }
        
        Ok(())
    }
    
    fn file_exists(&self, path: &Path) -> Result<bool> {
        let full_path = self.full_path(path);
        Ok(full_path.exists() && full_path.is_file())
    }
    
    fn get_file_info(&self, path: &Path) -> Result<FileInfo> {
        let full_path = self.full_path(path);
        
        if !full_path.exists() {
            return Err(DsbtError::Storage(format!("文件不存在: {:?}", full_path)));
        }
        
        let metadata = std::fs::metadata(&full_path)?;
        let custom_meta = self.load_metadata(path)?;
        
        let created_at = metadata.created()
            .ok()
            .map(|t| t.into());
        
        let modified_at = metadata.modified()
            .ok()
            .map(|t| t.into());
        
        Ok(FileInfo {
            path: path.to_string_lossy().to_string(),
            size: metadata.len(),
            created_at,
            modified_at: custom_meta.modified_at.or(modified_at),
            hash: custom_meta.hash,
            metadata: custom_meta.custom,
        })
    }
    
    fn list_files(&self, prefix: Option<&Path>) -> Result<Vec<FileInfo>> {
        let base = match prefix {
            Some(p) => self.full_path(p),
            None => self.base_path.clone(),
        };
        
        let mut files = Vec::new();
        
        if !base.exists() {
            return Ok(files);
        }
        
        for entry in WalkDir::new(&base) {
            let entry = entry?;
            if entry.file_type().is_file() {
                let path = entry.path();
                let relative = path.strip_prefix(&self.base_path)
                    .unwrap_or(path)
                    .to_path_buf();
                
                if let Ok(info) = self.get_file_info(&relative) {
                    files.push(info);
                }
            }
        }
        
        Ok(files)
    }
    
    fn copy_file(&self, from: &Path, to: &Path) -> Result<()> {
        let from_full = self.full_path(from);
        let to_full = self.full_path(to);
        
        if let Some(parent) = to_full.parent() {
            if !parent.exists() {
                std::fs::create_dir_all(parent)?;
            }
        }
        
        std::fs::copy(&from_full, &to_full)?;
        
        let from_meta = self.load_metadata(from)?;
        self.save_metadata(to, &from_meta)?;
        
        Ok(())
    }
    
    fn move_file(&self, from: &Path, to: &Path) -> Result<()> {
        self.copy_file(from, to)?;
        self.delete_file(from)?;
        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
struct FileMetadata {
    pub hash: Option<String>,
    pub size: u64,
    pub created_at: Option<chrono::DateTime<chrono::Utc>>,
    pub modified_at: Option<chrono::DateTime<chrono::Utc>>,
    #[serde(default)]
    pub custom: std::collections::HashMap<String, String>,
}
