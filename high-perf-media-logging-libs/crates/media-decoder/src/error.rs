//! 视频解码错误类型
//!
//! 该模块定义了视频解码操作中可能出现的所有错误类型。

use std::io;
use thiserror::Error;

/// 视频解码错误类型
#[derive(Error, Debug)]
pub enum DecoderError {
    /// 初始化错误
    #[error("Initialization error: {0}")]
    InitializationError(String),
    
    /// 配置错误
    #[error("Configuration error: {0}")]
    ConfigurationError(String),
    
    /// 不支持的编解码器
    #[error("Unsupported codec: {0}")]
    UnsupportedCodec(String),
    
    /// 不支持的像素格式
    #[error("Unsupported pixel format: {0}")]
    UnsupportedPixelFormat(String),
    
    /// 不支持的硬件平台
    #[error("Unsupported hardware platform")]
    UnsupportedPlatform,
    
    /// IO 错误
    #[error("IO error: {0}")]
    IoError(#[from] io::Error),
    
    /// 解码错误
    #[error("Decode error: {0}")]
    DecodeError(String),
    
    /// 硬件加速错误
    #[error("Hardware acceleration error: {0}")]
    HardwareAccelerationError(String),
    
    /// 内存分配错误
    #[error("Memory allocation error: {0}")]
    MemoryAllocationError(String),
    
    /// 超时错误
    #[error("Operation timed out")]
    Timeout,
    
    /// 队列已满
    #[error("Queue is full")]
    QueueFull,
    
    /// 队列已空
    #[error("Queue is empty")]
    QueueEmpty,
    
    /// 解码器已关闭
    #[error("Decoder is closed")]
    DecoderClosed,
    
    /// 无效参数
    #[error("Invalid parameter: {0}")]
    InvalidParameter(String),
    
    /// 内部错误
    #[error("Internal error: {0}")]
    InternalError(String),
}

impl DecoderError {
    /// 创建一个初始化错误
    ///
    /// # 参数
    /// * `msg` - 错误消息
    pub fn initialization(msg: impl Into<String>) -> Self {
        DecoderError::InitializationError(msg.into())
    }

    /// 创建一个配置错误
    ///
    /// # 参数
    /// * `msg` - 错误消息
    pub fn configuration(msg: impl Into<String>) -> Self {
        DecoderError::ConfigurationError(msg.into())
    }

    /// 创建一个不支持的编解码器错误
    ///
    /// # 参数
    /// * `codec` - 编解码器名称
    pub fn unsupported_codec(codec: impl Into<String>) -> Self {
        DecoderError::UnsupportedCodec(codec.into())
    }

    /// 创建一个不支持的像素格式错误
    ///
    /// # 参数
    /// * `format` - 像素格式名称
    pub fn unsupported_pixel_format(format: impl Into<String>) -> Self {
        DecoderError::UnsupportedPixelFormat(format.into())
    }

    /// 创建一个解码错误
    ///
    /// # 参数
    /// * `msg` - 错误消息
    pub fn decode(msg: impl Into<String>) -> Self {
        DecoderError::DecodeError(msg.into())
    }

    /// 创建一个硬件加速错误
    ///
    /// # 参数
    /// * `msg` - 错误消息
    pub fn hardware_acceleration(msg: impl Into<String>) -> Self {
        DecoderError::HardwareAccelerationError(msg.into())
    }

    /// 创建一个内存分配错误
    ///
    /// # 参数
    /// * `msg` - 错误消息
    pub fn memory_allocation(msg: impl Into<String>) -> Self {
        DecoderError::MemoryAllocationError(msg.into())
    }

    /// 创建一个无效参数错误
    ///
    /// # 参数
    /// * `msg` - 错误消息
    pub fn invalid_parameter(msg: impl Into<String>) -> Self {
        DecoderError::InvalidParameter(msg.into())
    }

    /// 创建一个内部错误
    ///
    /// # 参数
    /// * `msg` - 错误消息
    pub fn internal(msg: impl Into<String>) -> Self {
        DecoderError::InternalError(msg.into())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_creation() {
        let init_error = DecoderError::initialization("test init error");
        assert!(matches!(init_error, DecoderError::InitializationError(_)));
        
        let config_error = DecoderError::configuration("test config error");
        assert!(matches!(config_error, DecoderError::ConfigurationError(_)));
        
        let codec_error = DecoderError::unsupported_codec("H.265");
        assert!(matches!(codec_error, DecoderError::UnsupportedCodec(_)));
        
        let format_error = DecoderError::unsupported_pixel_format("YUV420");
        assert!(matches!(format_error, DecoderError::UnsupportedPixelFormat(_)));
        
        let decode_error = DecoderError::decode("test decode error");
        assert!(matches!(decode_error, DecoderError::DecodeError(_)));
        
        let hw_error = DecoderError::hardware_acceleration("test hw error");
        assert!(matches!(hw_error, DecoderError::HardwareAccelerationError(_)));
        
        let mem_error = DecoderError::memory_allocation("test mem error");
        assert!(matches!(mem_error, DecoderError::MemoryAllocationError(_)));
        
        let param_error = DecoderError::invalid_parameter("test param error");
        assert!(matches!(param_error, DecoderError::InvalidParameter(_)));
        
        let internal_error = DecoderError::internal("test internal error");
        assert!(matches!(internal_error, DecoderError::InternalError(_)));
    }

    #[test]
    fn test_error_display() {
        let error = DecoderError::initialization("test message");
        assert_eq!(format!("{}", error), "Initialization error: test message");
        
        let error = DecoderError::unsupported_codec("H.264");
        assert_eq!(format!("{}", error), "Unsupported codec: H.264");
        
        let error = DecoderError::Timeout;
        assert_eq!(format!("{}", error), "Operation timed out");
        
        let error = DecoderError::QueueFull;
        assert_eq!(format!("{}", error), "Queue is full");
        
        let error = DecoderError::DecoderClosed;
        assert_eq!(format!("{}", error), "Decoder is closed");
    }

    #[test]
    fn test_io_error_conversion() {
        let io_error = std::io::Error::new(std::io::ErrorKind::NotFound, "file not found");
        let decoder_error: DecoderError = io_error.into();
        
        assert!(matches!(decoder_error, DecoderError::IoError(_)));
    }
}
