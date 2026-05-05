use thiserror::Error;

#[derive(Error, Debug)]
pub enum AnalyzerError {
    #[error("IO错误: {0}")]
    Io(#[from] std::io::Error),
    
    #[error("JSON序列化错误: {0}")]
    Json(#[from] serde_json::Error),
    
    #[error("协议解析错误: {0}")]
    ProtocolParse(String),
    
    #[error("TCP流重组错误: {0}")]
    TcpReassembly(String),
    
    #[error("HTTP解析错误: {0}")]
    HttpParse(String),
    
    #[error("WebSocket解析错误: {0}")]
    WebSocketParse(String),
    
    #[error("文件提取错误: {0}")]
    FileExtract(String),
    
    #[error("十六进制查看错误: {0}")]
    HexView(String),
    
    #[error("无效的会话ID: {0}")]
    InvalidSessionId(String),
    
    #[error("会话不存在: {0}")]
    SessionNotFound(String),
    
    #[error("数据包类型不匹配")]
    PacketTypeMismatch,
    
    #[error("未知错误: {0}")]
    Other(String),
}

impl From<packet_sniffer::error::SnifferError> for AnalyzerError {
    fn from(err: packet_sniffer::error::SnifferError) -> Self {
        AnalyzerError::Other(err.to_string())
    }
}

pub type Result<T> = std::result::Result<T, AnalyzerError>;
