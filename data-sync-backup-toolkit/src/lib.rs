pub mod config_sync;
pub mod backup;
pub mod encryption;
pub mod storage;
pub mod utils;

pub use config_sync::*;
pub use backup::*;
pub use encryption::*;
pub use storage::*;
pub use utils::*;

#[derive(Debug, thiserror::Error)]
pub enum DsbtError {
    #[error("IO错误: {0}")]
    Io(#[from] std::io::Error),
    
    #[error("配置错误: {0}")]
    Config(String),
    
    #[error("加密错误: {0}")]
    Encryption(String),
    
    #[error("存储错误: {0}")]
    Storage(String),
    
    #[error("同步错误: {0}")]
    Sync(String),
    
    #[error("备份错误: {0}")]
    Backup(String),
    
    #[error("冲突错误: {0}")]
    Conflict(String),
    
    #[error("版本错误: {0}")]
    Version(String),
    
    #[error("解析错误: {0}")]
    Parse(#[from] serde_json::Error),
    
    #[error("其他错误: {0}")]
    Other(String),
}

pub type Result<T> = std::result::Result<T, DsbtError>;
