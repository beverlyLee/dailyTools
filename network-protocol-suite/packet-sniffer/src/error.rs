use thiserror::Error;

#[derive(Error, Debug)]
pub enum SnifferError {
    #[error("IO错误: {0}")]
    Io(#[from] std::io::Error),
    
    #[error("数据库错误: {0}")]
    Database(#[from] sqlx::Error),
    
    #[error("网络接口错误: {0}")]
    Interface(String),
    
    #[error("BPF过滤语法错误: {0}")]
    BpfFilter(String),
    
    #[error("协议解析错误: {0}")]
    ProtocolParse(String),
    
    #[error("JSON序列化错误: {0}")]
    Json(#[from] serde_json::Error),
    
    #[error("嗅探器未启动")]
    SnifferNotStarted,
    
    #[error("嗅探器已在运行")]
    SnifferAlreadyRunning,
    
    #[error("无效的数据包ID: {0}")]
    InvalidPacketId(i64),
    
    #[error("未知错误: {0}")]
    Other(String),
}

pub type Result<T> = std::result::Result<T, SnifferError>;
