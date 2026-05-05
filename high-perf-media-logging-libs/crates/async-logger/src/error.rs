//! 日志库错误类型
//!
//! 该模块定义了日志库操作中可能出现的所有错误类型。

use std::io;
use thiserror::Error;

/// 日志库错误类型
#[derive(Error, Debug)]
pub enum LoggerError {
    /// 初始化错误
    #[error("Initialization error: {0}")]
    InitializationError(String),
    
    /// 配置错误
    #[error("Configuration error: {0}")]
    ConfigurationError(String),
    
    /// IO 错误
    #[error("IO error: {0}")]
    IoError(#[from] io::Error),
    
    /// 格式化错误
    #[error("Format error: {0}")]
    FormatError(String),
    
    /// 序列化错误
    #[error("Serialization error: {0}")]
    SerializationError(#[from] serde_json::Error),
    
    /// 队列已满
    #[error("Log queue is full")]
    QueueFull,
    
    /// 队列已关闭
    #[error("Log queue is closed")]
    QueueClosed,
    
    /// 超时错误
    #[error("Operation timed out")]
    Timeout,
    
    /// 内部错误
    #[error("Internal error: {0}")]
    InternalError(String),
}

impl LoggerError {
    /// 创建一个初始化错误
    ///
    /// # 参数
    /// * `msg` - 错误消息
    ///
    /// # 示例
    /// ```
    /// use async_logger::LoggerError;
    ///
    /// let error = LoggerError::initialization("Logger already initialized");
    /// ```
    pub fn initialization(msg: impl Into<String>) -> Self {
        LoggerError::InitializationError(msg.into())
    }

    /// 创建一个配置错误
    ///
    /// # 参数
    /// * `msg` - 错误消息
    ///
    /// # 示例
    /// ```
    /// use async_logger::LoggerError;
    ///
    /// let error = LoggerError::configuration("Invalid log level");
    /// ```
    pub fn configuration(msg: impl Into<String>) -> Self {
        LoggerError::ConfigurationError(msg.into())
    }

    /// 创建一个格式化错误
    ///
    /// # 参数
    /// * `msg` - 错误消息
    ///
    /// # 示例
    /// ```
    /// use async_logger::LoggerError;
    ///
    /// let error = LoggerError::format("Failed to format log record");
    /// ```
    pub fn format(msg: impl Into<String>) -> Self {
        LoggerError::FormatError(msg.into())
    }

    /// 创建一个内部错误
    ///
    /// # 参数
    /// * `msg` - 错误消息
    ///
    /// # 示例
    /// ```
    /// use async_logger::LoggerError;
    ///
    /// let error = LoggerError::internal("Unexpected state");
    /// ```
    pub fn internal(msg: impl Into<String>) -> Self {
        LoggerError::InternalError(msg.into())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_creation() {
        let init_error = LoggerError::initialization("test init error");
        assert!(matches!(init_error, LoggerError::InitializationError(_)));
        
        let config_error = LoggerError::configuration("test config error");
        assert!(matches!(config_error, LoggerError::ConfigurationError(_)));
        
        let format_error = LoggerError::format("test format error");
        assert!(matches!(format_error, LoggerError::FormatError(_)));
        
        let internal_error = LoggerError::internal("test internal error");
        assert!(matches!(internal_error, LoggerError::InternalError(_)));
    }

    #[test]
    fn test_error_display() {
        let error = LoggerError::initialization("test message");
        assert_eq!(format!("{}", error), "Initialization error: test message");
        
        let error = LoggerError::QueueFull;
        assert_eq!(format!("{}", error), "Log queue is full");
        
        let error = LoggerError::Timeout;
        assert_eq!(format!("{}", error), "Operation timed out");
    }

    #[test]
    fn test_io_error_conversion() {
        let io_error = std::io::Error::new(std::io::ErrorKind::NotFound, "file not found");
        let logger_error: LoggerError = io_error.into();
        
        assert!(matches!(logger_error, LoggerError::IoError(_)));
    }

    #[test]
    fn test_serde_error_conversion() {
        let serde_error = serde_json::from_str::<i32>("invalid").unwrap_err();
        let logger_error: LoggerError = serde_error.into();
        
        assert!(matches!(logger_error, LoggerError::SerializationError(_)));
    }
}
