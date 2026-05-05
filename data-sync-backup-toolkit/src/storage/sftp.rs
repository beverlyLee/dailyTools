#[cfg(feature = "sftp")]
use super::*;
#[cfg(feature = "sftp")]
use crate::Result;
#[cfg(feature = "sftp")]
use crate::DsbtError;
#[cfg(feature = "sftp")]
use std::path::{Path, PathBuf};
#[cfg(feature = "sftp")]
use std::collections::HashMap;
#[cfg(feature = "sftp")]
use std::sync::Arc;
#[cfg(feature = "sftp")]
use thrussh::{
    client::{self, Config, Connection},
    keys,
    ChannelId,
};
#[cfg(feature = "sftp")]
use thrussh_keys::key;
#[cfg(feature = "sftp")]
use tokio::net::TcpStream;
#[cfg(feature = "sftp")]
use chrono::Utc;

#[cfg(feature = "sftp")]
pub struct SFTPStorageBackend {
    host: String,
    port: u16,
    username: String,
    password: Option<String>,
    key_path: Option<PathBuf>,
    base_path: PathBuf,
}

#[cfg(feature = "sftp")]
impl SFTPStorageBackend {
    pub async fn new(
        host: &str,
        port: u16,
        username: &str,
        password: Option<&str>,
        key_path: Option<&Path>,
    ) -> Result<Self> {
        Ok(Self {
            host: host.to_string(),
            port,
            username: username.to_string(),
            password: password.map(|s| s.to_string()),
            key_path: key_path.map(|p| p.to_path_buf()),
            base_path: PathBuf::from("/"),
        })
    }
    
    pub fn with_base_path(mut self, base_path: &Path) -> Self {
        self.base_path = base_path.to_path_buf();
        self
    }
    
    fn full_path(&self, path: &Path) -> PathBuf {
        let normalized = normalize_path(path);
        if normalized.is_absolute() {
            normalized
        } else {
            self.base_path.join(normalized)
        }
    }
}

#[cfg(feature = "sftp")]
struct SFTPClient {
    session: thrussh::client::Handle<SFTPHandler>,
}

#[cfg(feature = "sftp")]
struct SFTPHandler {
    password: Option<String>,
}

#[cfg(feature = "sftp")]
impl client::Handler for SFTPHandler {
    type Error = anyhow::Error;
    
    fn check_server_key(
        &mut self,
        _server_public_key: &key::PublicKey,
    ) -> std::result::Result<bool, Self::Error> {
        Ok(true)
    }
}

#[cfg(feature = "sftp")]
impl StorageBackend for SFTPStorageBackend {
    fn name(&self) -> &str {
        "sftp"
    }
    
    fn put_file(&self, path: &Path, content: &[u8], hash: &str) -> Result<()> {
        let full_path = self.full_path(path);
        
        tokio::runtime::Runtime::new()
            .map_err(|e| DsbtError::Storage(format!("创建Tokio运行时失败: {}", e)))?
            .block_on(async move {
                let config = Arc::new(Config::default());
                
                let key_pair = if let Some(ref key_path) = self.key_path {
                    let key_data = tokio::fs::read(key_path).await
                        .map_err(|e| DsbtError::Storage(format!("读取密钥文件失败: {}", e)))?;
                    Some(keys::decode_secret_key(&key_data, None)
                        .map_err(|e| DsbtError::Storage(format!("解析密钥失败: {}", e)))?)
                } else {
                    None
                };
                
                let handler = SFTPHandler {
                    password: self.password.clone(),
                };
                
                let addr = format!("{}:{}", self.host, self.port);
                let stream = TcpStream::connect(&addr).await
                    .map_err(|e| DsbtError::Storage(format!("连接SFTP服务器失败: {}", e)))?;
                
                let mut session = client::connect(config, stream, handler).await
                    .map_err(|e| DsbtError::Storage(format!("SFTP握手失败: {}", e)))?;
                
                if let Some(ref key_pair) = key_pair {
                    session.authenticate_publickey(&self.username, Arc::new(key_pair.clone())).await
                        .map_err(|e| DsbtError::Storage(format!("SFTP公钥认证失败: {}", e)))?;
                } else if let Some(ref password) = self.password {
                    session.authenticate_password(&self.username, password).await
                        .map_err(|e| DsbtError::Storage(format!("SFTP密码认证失败: {}", e)))?;
                } else {
                    return Err(DsbtError::Storage("未提供SFTP认证方式".to_string()));
                }
                
                let mut channel = session.channel_open_session().await
                    .map_err(|e| DsbtError::Storage(format!("打开SFTP通道失败: {}", e)))?;
                
                let path_str = full_path.to_string_lossy();
                let sftp_cmd = format!("echo -n '{}' | base64 -d > {}", 
                    base64::encode(content), 
                    path_str);
                
                channel.exec("bash").await
                    .map_err(|e| DsbtError::Storage(format!("执行SFTP命令失败: {}", e)))?;
                
                channel.data(&sftp_cmd).await
                    .map_err(|e| DsbtError::Storage(format!("发送SFTP数据失败: {}", e)))?;
                
                channel.eof().await
                    .map_err(|e| DsbtError::Storage(format!("关闭SFTP通道失败: {}", e)))?;
                
                let _exit_status = channel.wait().await
                    .map_err(|e| DsbtError::Storage(format!("等待SFTP命令完成失败: {}", e)))?;
                
                Ok(())
            })
    }
    
    fn get_file(&self, path: &Path) -> Result<(Vec<u8>, FileInfo)> {
        let full_path = self.full_path(path);
        
        tokio::runtime::Runtime::new()
            .map_err(|e| DsbtError::Storage(format!("创建Tokio运行时失败: {}", e)))?
            .block_on(async move {
                let config = Arc::new(Config::default());
                
                let key_pair = if let Some(ref key_path) = self.key_path {
                    let key_data = tokio::fs::read(key_path).await
                        .map_err(|e| DsbtError::Storage(format!("读取密钥文件失败: {}", e)))?;
                    Some(keys::decode_secret_key(&key_data, None)
                        .map_err(|e| DsbtError::Storage(format!("解析密钥失败: {}", e)))?)
                } else {
                    None
                };
                
                let handler = SFTPHandler {
                    password: self.password.clone(),
                };
                
                let addr = format!("{}:{}", self.host, self.port);
                let stream = TcpStream::connect(&addr).await
                    .map_err(|e| DsbtError::Storage(format!("连接SFTP服务器失败: {}", e)))?;
                
                let mut session = client::connect(config, stream, handler).await
                    .map_err(|e| DsbtError::Storage(format!("SFTP握手失败: {}", e)))?;
                
                if let Some(ref key_pair) = key_pair {
                    session.authenticate_publickey(&self.username, Arc::new(key_pair.clone())).await
                        .map_err(|e| DsbtError::Storage(format!("SFTP公钥认证失败: {}", e)))?;
                } else if let Some(ref password) = self.password {
                    session.authenticate_password(&self.username, password).await
                        .map_err(|e| DsbtError::Storage(format!("SFTP密码认证失败: {}", e)))?;
                } else {
                    return Err(DsbtError::Storage("未提供SFTP认证方式".to_string()));
                }
                
                let mut channel = session.channel_open_session().await
                    .map_err(|e| DsbtError::Storage(format!("打开SFTP通道失败: {}", e)))?;
                
                let path_str = full_path.to_string_lossy();
                let cat_cmd = format!("cat {}", path_str);
                
                channel.exec(&cat_cmd).await
                    .map_err(|e| DsbtError::Storage(format!("执行SFTP命令失败: {}", e)))?;
                
                let mut content = Vec::new();
                loop {
                    let msg = channel.wait().await;
                    match msg {
                        Some(thrussh::ChannelMsg::Data { data }) => {
                            content.extend_from_slice(&data);
                        }
                        Some(thrussh::ChannelMsg::Eof) | Some(thrussh::ChannelMsg::Close) => {
                            break;
                        }
                        _ => {}
                    }
                }
                
                let file_info = FileInfo {
                    path: path.to_string_lossy().to_string(),
                    size: content.len() as u64,
                    created_at: None,
                    modified_at: None,
                    hash: Some(calculate_sha256(&content)),
                    metadata: HashMap::new(),
                };
                
                Ok((content, file_info))
            })
    }
    
    fn delete_file(&self, path: &Path) -> Result<()> {
        let full_path = self.full_path(path);
        
        tokio::runtime::Runtime::new()
            .map_err(|e| DsbtError::Storage(format!("创建Tokio运行时失败: {}", e)))?
            .block_on(async move {
                let config = Arc::new(Config::default());
                
                let key_pair = if let Some(ref key_path) = self.key_path {
                    let key_data = tokio::fs::read(key_path).await
                        .map_err(|e| DsbtError::Storage(format!("读取密钥文件失败: {}", e)))?;
                    Some(keys::decode_secret_key(&key_data, None)
                        .map_err(|e| DsbtError::Storage(format!("解析密钥失败: {}", e)))?)
                } else {
                    None
                };
                
                let handler = SFTPHandler {
                    password: self.password.clone(),
                };
                
                let addr = format!("{}:{}", self.host, self.port);
                let stream = TcpStream::connect(&addr).await
                    .map_err(|e| DsbtError::Storage(format!("连接SFTP服务器失败: {}", e)))?;
                
                let mut session = client::connect(config, stream, handler).await
                    .map_err(|e| DsbtError::Storage(format!("SFTP握手失败: {}", e)))?;
                
                if let Some(ref key_pair) = key_pair {
                    session.authenticate_publickey(&self.username, Arc::new(key_pair.clone())).await
                        .map_err(|e| DsbtError::Storage(format!("SFTP公钥认证失败: {}", e)))?;
                } else if let Some(ref password) = self.password {
                    session.authenticate_password(&self.username, password).await
                        .map_err(|e| DsbtError::Storage(format!("SFTP密码认证失败: {}", e)))?;
                } else {
                    return Err(DsbtError::Storage("未提供SFTP认证方式".to_string()));
                }
                
                let mut channel = session.channel_open_session().await
                    .map_err(|e| DsbtError::Storage(format!("打开SFTP通道失败: {}", e)))?;
                
                let path_str = full_path.to_string_lossy();
                let rm_cmd = format!("rm -f {}", path_str);
                
                channel.exec(&rm_cmd).await
                    .map_err(|e| DsbtError::Storage(format!("执行SFTP命令失败: {}", e)))?;
                
                channel.eof().await
                    .map_err(|e| DsbtError::Storage(format!("关闭SFTP通道失败: {}", e)))?;
                
                let _exit_status = channel.wait().await
                    .map_err(|e| DsbtError::Storage(format!("等待SFTP命令完成失败: {}", e)))?;
                
                Ok(())
            })
    }
    
    fn file_exists(&self, path: &Path) -> Result<bool> {
        let full_path = self.full_path(path);
        
        tokio::runtime::Runtime::new()
            .map_err(|e| DsbtError::Storage(format!("创建Tokio运行时失败: {}", e)))?
            .block_on(async move {
                let config = Arc::new(Config::default());
                
                let key_pair = if let Some(ref key_path) = self.key_path {
                    let key_data = tokio::fs::read(key_path).await
                        .map_err(|e| DsbtError::Storage(format!("读取密钥文件失败: {}", e)))?;
                    Some(keys::decode_secret_key(&key_data, None)
                        .map_err(|e| DsbtError::Storage(format!("解析密钥失败: {}", e)))?)
                } else {
                    None
                };
                
                let handler = SFTPHandler {
                    password: self.password.clone(),
                };
                
                let addr = format!("{}:{}", self.host, self.port);
                let stream = TcpStream::connect(&addr).await
                    .map_err(|e| DsbtError::Storage(format!("连接SFTP服务器失败: {}", e)))?;
                
                let mut session = client::connect(config, stream, handler).await
                    .map_err(|e| DsbtError::Storage(format!("SFTP握手失败: {}", e)))?;
                
                if let Some(ref key_pair) = key_pair {
                    session.authenticate_publickey(&self.username, Arc::new(key_pair.clone())).await
                        .map_err(|e| DsbtError::Storage(format!("SFTP公钥认证失败: {}", e)))?;
                } else if let Some(ref password) = self.password {
                    session.authenticate_password(&self.username, password).await
                        .map_err(|e| DsbtError::Storage(format!("SFTP密码认证失败: {}", e)))?;
                } else {
                    return Err(DsbtError::Storage("未提供SFTP认证方式".to_string()));
                }
                
                let mut channel = session.channel_open_session().await
                    .map_err(|e| DsbtError::Storage(format!("打开SFTP通道失败: {}", e)))?;
                
                let path_str = full_path.to_string_lossy();
                let test_cmd = format!("test -f {} && echo exists || echo not_exists", path_str);
                
                channel.exec(&test_cmd).await
                    .map_err(|e| DsbtError::Storage(format!("执行SFTP命令失败: {}", e)))?;
                
                let mut output = String::new();
                loop {
                    let msg = channel.wait().await;
                    match msg {
                        Some(thrussh::ChannelMsg::Data { data }) => {
                            output.push_str(&String::from_utf8_lossy(&data));
                        }
                        Some(thrussh::ChannelMsg::Eof) | Some(thrussh::ChannelMsg::Close) => {
                            break;
                        }
                        _ => {}
                    }
                }
                
                Ok(output.trim() == "exists")
            })
    }
    
    fn get_file_info(&self, path: &Path) -> Result<FileInfo> {
        let (content, mut info) = self.get_file(path)?;
        info.hash = Some(calculate_sha256(&content));
        Ok(info)
    }
    
    fn list_files(&self, prefix: Option<&Path>) -> Result<Vec<FileInfo>> {
        let base = match prefix {
            Some(p) => self.full_path(p),
            None => self.base_path.clone(),
        };
        
        tokio::runtime::Runtime::new()
            .map_err(|e| DsbtError::Storage(format!("创建Tokio运行时失败: {}", e)))?
            .block_on(async move {
                let config = Arc::new(Config::default());
                
                let key_pair = if let Some(ref key_path) = self.key_path {
                    let key_data = tokio::fs::read(key_path).await
                        .map_err(|e| DsbtError::Storage(format!("读取密钥文件失败: {}", e)))?;
                    Some(keys::decode_secret_key(&key_data, None)
                        .map_err(|e| DsbtError::Storage(format!("解析密钥失败: {}", e)))?)
                } else {
                    None
                };
                
                let handler = SFTPHandler {
                    password: self.password.clone(),
                };
                
                let addr = format!("{}:{}", self.host, self.port);
                let stream = TcpStream::connect(&addr).await
                    .map_err(|e| DsbtError::Storage(format!("连接SFTP服务器失败: {}", e)))?;
                
                let mut session = client::connect(config, stream, handler).await
                    .map_err(|e| DsbtError::Storage(format!("SFTP握手失败: {}", e)))?;
                
                if let Some(ref key_pair) = key_pair {
                    session.authenticate_publickey(&self.username, Arc::new(key_pair.clone())).await
                        .map_err(|e| DsbtError::Storage(format!("SFTP公钥认证失败: {}", e)))?;
                } else if let Some(ref password) = self.password {
                    session.authenticate_password(&self.username, password).await
                        .map_err(|e| DsbtError::Storage(format!("SFTP密码认证失败: {}", e)))?;
                } else {
                    return Err(DsbtError::Storage("未提供SFTP认证方式".to_string()));
                }
                
                let mut channel = session.channel_open_session().await
                    .map_err(|e| DsbtError::Storage(format!("打开SFTP通道失败: {}", e)))?;
                
                let base_str = base.to_string_lossy();
                let find_cmd = format!("find {} -type f 2>/dev/null", base_str);
                
                channel.exec(&find_cmd).await
                    .map_err(|e| DsbtError::Storage(format!("执行SFTP命令失败: {}", e)))?;
                
                let mut output = String::new();
                loop {
                    let msg = channel.wait().await;
                    match msg {
                        Some(thrussh::ChannelMsg::Data { data }) => {
                            output.push_str(&String::from_utf8_lossy(&data));
                        }
                        Some(thrussh::ChannelMsg::Eof) | Some(thrussh::ChannelMsg::Close) => {
                            break;
                        }
                        _ => {}
                    }
                }
                
                let mut files = Vec::new();
                for line in output.lines() {
                    if !line.is_empty() {
                        files.push(FileInfo {
                            path: line.to_string(),
                            size: 0,
                            created_at: None,
                            modified_at: None,
                            hash: None,
                            metadata: HashMap::new(),
                        });
                    }
                }
                
                Ok(files)
            })
    }
    
    fn copy_file(&self, from: &Path, to: &Path) -> Result<()> {
        let from_full = self.full_path(from);
        let to_full = self.full_path(to);
        
        tokio::runtime::Runtime::new()
            .map_err(|e| DsbtError::Storage(format!("创建Tokio运行时失败: {}", e)))?
            .block_on(async move {
                let config = Arc::new(Config::default());
                
                let key_pair = if let Some(ref key_path) = self.key_path {
                    let key_data = tokio::fs::read(key_path).await
                        .map_err(|e| DsbtError::Storage(format!("读取密钥文件失败: {}", e)))?;
                    Some(keys::decode_secret_key(&key_data, None)
                        .map_err(|e| DsbtError::Storage(format!("解析密钥失败: {}", e)))?)
                } else {
                    None
                };
                
                let handler = SFTPHandler {
                    password: self.password.clone(),
                };
                
                let addr = format!("{}:{}", self.host, self.port);
                let stream = TcpStream::connect(&addr).await
                    .map_err(|e| DsbtError::Storage(format!("连接SFTP服务器失败: {}", e)))?;
                
                let mut session = client::connect(config, stream, handler).await
                    .map_err(|e| DsbtError::Storage(format!("SFTP握手失败: {}", e)))?;
                
                if let Some(ref key_pair) = key_pair {
                    session.authenticate_publickey(&self.username, Arc::new(key_pair.clone())).await
                        .map_err(|e| DsbtError::Storage(format!("SFTP公钥认证失败: {}", e)))?;
                } else if let Some(ref password) = self.password {
                    session.authenticate_password(&self.username, password).await
                        .map_err(|e| DsbtError::Storage(format!("SFTP密码认证失败: {}", e)))?;
                } else {
                    return Err(DsbtError::Storage("未提供SFTP认证方式".to_string()));
                }
                
                let mut channel = session.channel_open_session().await
                    .map_err(|e| DsbtError::Storage(format!("打开SFTP通道失败: {}", e)))?;
                
                let from_str = from_full.to_string_lossy();
                let to_str = to_full.to_string_lossy();
                let cp_cmd = format!("cp {} {}", from_str, to_str);
                
                channel.exec(&cp_cmd).await
                    .map_err(|e| DsbtError::Storage(format!("执行SFTP命令失败: {}", e)))?;
                
                channel.eof().await
                    .map_err(|e| DsbtError::Storage(format!("关闭SFTP通道失败: {}", e)))?;
                
                let _exit_status = channel.wait().await
                    .map_err(|e| DsbtError::Storage(format!("等待SFTP命令完成失败: {}", e)))?;
                
                Ok(())
            })
    }
    
    fn move_file(&self, from: &Path, to: &Path) -> Result<()> {
        self.copy_file(from, to)?;
        self.delete_file(from)?;
        Ok(())
    }
}

#[cfg(not(feature = "sftp"))]
pub struct SFTPStorageBackend;

#[cfg(not(feature = "sftp"))]
impl SFTPStorageBackend {
    pub async fn new(
        _host: &str,
        _port: u16,
        _username: &str,
        _password: Option<&str>,
        _key_path: Option<&Path>,
    ) -> Result<Self> {
        Err(DsbtError::Storage("SFTP功能未启用，请使用 --features sftp 编译".to_string()))
    }
}

#[cfg(not(feature = "sftp"))]
impl StorageBackend for SFTPStorageBackend {
    fn name(&self) -> &str {
        "sftp"
    }
    
    fn put_file(&self, _path: &Path, _content: &[u8], _hash: &str) -> Result<()> {
        Err(DsbtError::Storage("SFTP功能未启用，请使用 --features sftp 编译".to_string()))
    }
    
    fn get_file(&self, _path: &Path) -> Result<(Vec<u8>, FileInfo)> {
        Err(DsbtError::Storage("SFTP功能未启用，请使用 --features sftp 编译".to_string()))
    }
    
    fn delete_file(&self, _path: &Path) -> Result<()> {
        Err(DsbtError::Storage("SFTP功能未启用，请使用 --features sftp 编译".to_string()))
    }
    
    fn file_exists(&self, _path: &Path) -> Result<bool> {
        Err(DsbtError::Storage("SFTP功能未启用，请使用 --features sftp 编译".to_string()))
    }
    
    fn get_file_info(&self, _path: &Path) -> Result<FileInfo> {
        Err(DsbtError::Storage("SFTP功能未启用，请使用 --features sftp 编译".to_string()))
    }
    
    fn list_files(&self, _prefix: Option<&Path>) -> Result<Vec<FileInfo>> {
        Err(DsbtError::Storage("SFTP功能未启用，请使用 --features sftp 编译".to_string()))
    }
    
    fn copy_file(&self, _from: &Path, _to: &Path) -> Result<()> {
        Err(DsbtError::Storage("SFTP功能未启用，请使用 --features sftp 编译".to_string()))
    }
    
    fn move_file(&self, _from: &Path, _to: &Path) -> Result<()> {
        Err(DsbtError::Storage("SFTP功能未启用，请使用 --features sftp 编译".to_string()))
    }
}
