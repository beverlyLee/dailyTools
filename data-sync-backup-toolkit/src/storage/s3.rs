#[cfg(feature = "s3")]
use super::*;
#[cfg(feature = "s3")]
use crate::Result;
#[cfg(feature = "s3")]
use crate::DsbtError;
#[cfg(feature = "s3")]
use std::path::Path;
#[cfg(feature = "s3")]
use std::collections::HashMap;
#[cfg(feature = "s3")]
use aws_sdk_s3 as s3;
#[cfg(feature = "s3")]
use aws_sdk_s3::types::{ByteStream, CompletedMultipartUpload, CompletedPart};
#[cfg(feature = "s3")]
use aws_config::meta::region::RegionProviderChain;
#[cfg(feature = "s3")]
use chrono::Utc;

#[cfg(feature = "s3")]
pub struct S3StorageBackend {
    client: s3::Client,
    bucket: String,
    prefix: Option<String>,
}

#[cfg(feature = "s3")]
impl S3StorageBackend {
    pub async fn new(
        bucket: &str,
        region: Option<&str>,
        endpoint: Option<&str>,
    ) -> Result<Self> {
        let region_provider = RegionProviderChain::first_try(
            region.map(|r| aws_config::Region::new(r))
        )
        .or_default_provider();
        
        let config_loader = aws_config::from_env().region(region_provider);
        
        let config = if let Some(endpoint) = endpoint {
            config_loader
                .endpoint_url(endpoint)
                .load()
                .await
        } else {
            config_loader.load().await
        };
        
        let client = s3::Client::new(&config);
        
        Ok(Self {
            client,
            bucket: bucket.to_string(),
            prefix: None,
        })
    }
    
    pub fn with_prefix(mut self, prefix: &str) -> Self {
        self.prefix = Some(prefix.to_string());
        self
    }
    
    fn full_key(&self, path: &Path) -> String {
        let path_str = path.to_string_lossy();
        match &self.prefix {
            Some(p) => format!("{}/{}", p, path_str),
            None => path_str.to_string(),
        }
    }
}

#[cfg(feature = "s3")]
impl StorageBackend for S3StorageBackend {
    fn name(&self) -> &str {
        "s3"
    }
    
    fn put_file(&self, path: &Path, content: &[u8], hash: &str) -> Result<()> {
        let key = self.full_key(path);
        let body = ByteStream::from(content.to_vec());
        
        let client = self.client.clone();
        let bucket = self.bucket.clone();
        let hash = hash.to_string();
        
        tokio::runtime::Runtime::new()
            .map_err(|e| DsbtError::Storage(format!("创建Tokio运行时失败: {}", e)))?
            .block_on(async move {
                client
                    .put_object()
                    .bucket(&bucket)
                    .key(&key)
                    .body(body)
                    .content_type("application/octet-stream")
                    .metadata("x-dsbt-hash", &hash)
                    .send()
                    .await
                    .map_err(|e| DsbtError::Storage(format!("S3上传失败: {}", e)))?;
                
                Ok(())
            })
    }
    
    fn get_file(&self, path: &Path) -> Result<(Vec<u8>, FileInfo)> {
        let key = self.full_key(path);
        let client = self.client.clone();
        let bucket = self.bucket.clone();
        
        tokio::runtime::Runtime::new()
            .map_err(|e| DsbtError::Storage(format!("创建Tokio运行时失败: {}", e)))?
            .block_on(async move {
                let resp = client
                    .get_object()
                    .bucket(&bucket)
                    .key(&key)
                    .send()
                    .await
                    .map_err(|e| DsbtError::Storage(format!("S3下载失败: {}", e)))?;
                
                let content = resp.body
                    .collect()
                    .await
                    .map_err(|e| DsbtError::Storage(format!("读取S3响应失败: {}", e)))?
                    .into_bytes()
                    .to_vec();
                
                let metadata = resp.metadata.unwrap_or_default();
                let hash = metadata.get("x-dsbt-hash").cloned();
                
                let file_info = FileInfo {
                    path: path.to_string_lossy().to_string(),
                    size: content.len() as u64,
                    created_at: resp.last_modified.map(|t| t.try_into().ok()).flatten(),
                    modified_at: resp.last_modified.map(|t| t.try_into().ok()).flatten(),
                    hash,
                    metadata: HashMap::new(),
                };
                
                Ok((content, file_info))
            })
    }
    
    fn delete_file(&self, path: &Path) -> Result<()> {
        let key = self.full_key(path);
        let client = self.client.clone();
        let bucket = self.bucket.clone();
        
        tokio::runtime::Runtime::new()
            .map_err(|e| DsbtError::Storage(format!("创建Tokio运行时失败: {}", e)))?
            .block_on(async move {
                client
                    .delete_object()
                    .bucket(&bucket)
                    .key(&key)
                    .send()
                    .await
                    .map_err(|e| DsbtError::Storage(format!("S3删除失败: {}", e)))?;
                
                Ok(())
            })
    }
    
    fn file_exists(&self, path: &Path) -> Result<bool> {
        let key = self.full_key(path);
        let client = self.client.clone();
        let bucket = self.bucket.clone();
        
        tokio::runtime::Runtime::new()
            .map_err(|e| DsbtError::Storage(format!("创建Tokio运行时失败: {}", e)))?
            .block_on(async move {
                let result = client
                    .head_object()
                    .bucket(&bucket)
                    .key(&key)
                    .send()
                    .await;
                
                match result {
                    Ok(_) => Ok(true),
                    Err(s3::error::SdkError::ServiceError(err)) => {
                        if err.err().is_not_found() {
                            Ok(false)
                        } else {
                            Err(DsbtError::Storage(format!("S3检查文件存在失败: {}", err.err())))
                        }
                    }
                    Err(e) => Err(DsbtError::Storage(format!("S3检查文件存在失败: {}", e))),
                }
            })
    }
    
    fn get_file_info(&self, path: &Path) -> Result<FileInfo> {
        let key = self.full_key(path);
        let client = self.client.clone();
        let bucket = self.bucket.clone();
        
        tokio::runtime::Runtime::new()
            .map_err(|e| DsbtError::Storage(format!("创建Tokio运行时失败: {}", e)))?
            .block_on(async move {
                let resp = client
                    .head_object()
                    .bucket(&bucket)
                    .key(&key)
                    .send()
                    .await
                    .map_err(|e| DsbtError::Storage(format!("S3获取文件信息失败: {}", e)))?;
                
                let metadata = resp.metadata.unwrap_or_default();
                let hash = metadata.get("x-dsbt-hash").cloned();
                
                Ok(FileInfo {
                    path: path.to_string_lossy().to_string(),
                    size: resp.content_length.unwrap_or(0) as u64,
                    created_at: resp.last_modified.map(|t| t.try_into().ok()).flatten(),
                    modified_at: resp.last_modified.map(|t| t.try_into().ok()).flatten(),
                    hash,
                    metadata: HashMap::new(),
                })
            })
    }
    
    fn list_files(&self, prefix: Option<&Path>) -> Result<Vec<FileInfo>> {
        let list_prefix = match (prefix, &self.prefix) {
            (Some(p), Some(global)) => format!("{}/{}", global, p.to_string_lossy()),
            (Some(p), None) => p.to_string_lossy().to_string(),
            (None, Some(global)) => global.clone(),
            (None, None) => String::new(),
        };
        
        let client = self.client.clone();
        let bucket = self.bucket.clone();
        
        tokio::runtime::Runtime::new()
            .map_err(|e| DsbtError::Storage(format!("创建Tokio运行时失败: {}", e)))?
            .block_on(async move {
                let resp = client
                    .list_objects_v2()
                    .bucket(&bucket)
                    .prefix(&list_prefix)
                    .send()
                    .await
                    .map_err(|e| DsbtError::Storage(format!("S3列出文件失败: {}", e)))?;
                
                let mut files = Vec::new();
                
                if let Some(contents) = resp.contents {
                    for obj in contents {
                        if let Some(key) = obj.key {
                            let metadata = obj.metadata.unwrap_or_default();
                            let hash = metadata.get("x-dsbt-hash").cloned();
                            
                            files.push(FileInfo {
                                path: key.clone(),
                                size: obj.size.unwrap_or(0) as u64,
                                created_at: obj.last_modified.map(|t| t.try_into().ok()).flatten(),
                                modified_at: obj.last_modified.map(|t| t.try_into().ok()).flatten(),
                                hash,
                                metadata: HashMap::new(),
                            });
                        }
                    }
                }
                
                Ok(files)
            })
    }
    
    fn copy_file(&self, from: &Path, to: &Path) -> Result<()> {
        let from_key = self.full_key(from);
        let to_key = self.full_key(to);
        let client = self.client.clone();
        let bucket = self.bucket.clone();
        let source = format!("{}/{}", bucket, from_key);
        
        tokio::runtime::Runtime::new()
            .map_err(|e| DsbtError::Storage(format!("创建Tokio运行时失败: {}", e)))?
            .block_on(async move {
                client
                    .copy_object()
                    .bucket(&bucket)
                    .key(&to_key)
                    .copy_source(&source)
                    .send()
                    .await
                    .map_err(|e| DsbtError::Storage(format!("S3复制文件失败: {}", e)))?;
                
                Ok(())
            })
    }
    
    fn move_file(&self, from: &Path, to: &Path) -> Result<()> {
        self.copy_file(from, to)?;
        self.delete_file(from)?;
        Ok(())
    }
}

#[cfg(not(feature = "s3"))]
pub struct S3StorageBackend;

#[cfg(not(feature = "s3"))]
impl S3StorageBackend {
    pub async fn new(_bucket: &str, _region: Option<&str>, _endpoint: Option<&str>) -> Result<Self> {
        Err(DsbtError::Storage("S3功能未启用，请使用 --features s3 编译".to_string()))
    }
}

#[cfg(not(feature = "s3"))]
impl StorageBackend for S3StorageBackend {
    fn name(&self) -> &str {
        "s3"
    }
    
    fn put_file(&self, _path: &Path, _content: &[u8], _hash: &str) -> Result<()> {
        Err(DsbtError::Storage("S3功能未启用，请使用 --features s3 编译".to_string()))
    }
    
    fn get_file(&self, _path: &Path) -> Result<(Vec<u8>, FileInfo)> {
        Err(DsbtError::Storage("S3功能未启用，请使用 --features s3 编译".to_string()))
    }
    
    fn delete_file(&self, _path: &Path) -> Result<()> {
        Err(DsbtError::Storage("S3功能未启用，请使用 --features s3 编译".to_string()))
    }
    
    fn file_exists(&self, _path: &Path) -> Result<bool> {
        Err(DsbtError::Storage("S3功能未启用，请使用 --features s3 编译".to_string()))
    }
    
    fn get_file_info(&self, _path: &Path) -> Result<FileInfo> {
        Err(DsbtError::Storage("S3功能未启用，请使用 --features s3 编译".to_string()))
    }
    
    fn list_files(&self, _prefix: Option<&Path>) -> Result<Vec<FileInfo>> {
        Err(DsbtError::Storage("S3功能未启用，请使用 --features s3 编译".to_string()))
    }
    
    fn copy_file(&self, _from: &Path, _to: &Path) -> Result<()> {
        Err(DsbtError::Storage("S3功能未启用，请使用 --features s3 编译".to_string()))
    }
    
    fn move_file(&self, _from: &Path, _to: &Path) -> Result<()> {
        Err(DsbtError::Storage("S3功能未启用，请使用 --features s3 编译".to_string()))
    }
}
