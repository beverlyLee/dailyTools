//! HTTP 客户端错误类型

use thiserror::Error;

/// HTTP 客户端库的错误类型
#[derive(Debug, Error)]
pub enum Error {
    /// URL 解析错误
    #[error("URL parsing error: {0}")]
    UrlParseError(#[from] url::ParseError),
    
    /// 无效的 URL 方案
    #[error("Invalid URL scheme: {0}")]
    InvalidUrlScheme(String),
    
    /// 无效的 HTTP 方法
    #[error("Invalid HTTP method: {0}")]
    InvalidHttpMethod(String),
    
    /// 无效的 Header 名称
    #[error("Invalid header name: {0}")]
    InvalidHeaderName(String),
    
    /// 无效的 Header 值
    #[error("Invalid header value: {0}")]
    InvalidHeaderValue(String),
    
    /// 无效的请求体
    #[error("Invalid request body: {0}")]
    InvalidRequestBody(String),
    
    /// 连接错误
    #[error("Connection error: {0}")]
    ConnectionError(String),
    
    /// 超时错误
    #[error("Timeout error: {0}")]
    TimeoutError(String),
    
    /// 请求构建错误
    #[error("Request build error: {0}")]
    RequestBuildError(String),
    
    /// 响应错误
    #[error("Response error: {0}")]
    ResponseError(String),
    
    /// JSON 序列化/反序列化错误
    #[error("JSON error: {0}")]
    JsonError(#[from] serde_json::Error),
    
    /// 拦截器错误
    #[error("Interceptor error: {0}")]
    InterceptorError(String),
    
    /// 类型转换错误
    #[error("Type conversion error: {0}")]
    TypeConversionError(String),
    
    /// 内部错误
    #[error("Internal error: {0}")]
    InternalError(String),
}

/// 类型别名，用于简化函数返回类型
pub type Result<T> = std::result::Result<T, Error>;

// 从 reqwest 错误转换
impl From<reqwest::Error> for Error {
    fn from(err: reqwest::Error) -> Self {
        if err.is_timeout() {
            Error::TimeoutError(err.to_string())
        } else if err.is_connect() {
            Error::ConnectionError(err.to_string())
        } else if err.is_request() {
            Error::RequestBuildError(err.to_string())
        } else if err.is_body() {
            Error::InvalidRequestBody(err.to_string())
        } else if err.is_decode() || err.is_redirect() {
            Error::ResponseError(err.to_string())
        } else {
            Error::InternalError(err.to_string())
        }
    }
}
