//! HTTP 响应模块

use crate::error::{Error, Result};
use crate::header::HeaderMap;
use serde::de::DeserializeOwned;
use std::fmt;

/// HTTP 响应状态
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Status {
    code: u16,
}

impl Status {
    /// 创建新的状态码
    pub fn new(code: u16) -> Self {
        Status { code }
    }
    
    /// 获取状态码数值
    pub fn code(&self) -> u16 {
        self.code
    }
    
    /// 检查是否为信息性响应 (1xx)
    pub fn is_informational(&self) -> bool {
        (100..200).contains(&self.code)
    }
    
    /// 检查是否为成功响应 (2xx)
    pub fn is_success(&self) -> bool {
        (200..300).contains(&self.code)
    }
    
    /// 检查是否为重定向响应 (3xx)
    pub fn is_redirection(&self) -> bool {
        (300..400).contains(&self.code)
    }
    
    /// 检查是否为客户端错误 (4xx)
    pub fn is_client_error(&self) -> bool {
        (400..500).contains(&self.code)
    }
    
    /// 检查是否为服务器错误 (5xx)
    pub fn is_server_error(&self) -> bool {
        (500..600).contains(&self.code)
    }
    
    /// 检查是否为错误状态 (4xx 或 5xx)
    pub fn is_error(&self) -> bool {
        self.is_client_error() || self.is_server_error()
    }
    
    /// 获取状态码的标准文本描述
    pub fn canonical_reason(&self) -> Option<&'static str> {
        match self.code {
            100 => Some("Continue"),
            101 => Some("Switching Protocols"),
            102 => Some("Processing"),
            200 => Some("OK"),
            201 => Some("Created"),
            202 => Some("Accepted"),
            203 => Some("Non-Authoritative Information"),
            204 => Some("No Content"),
            205 => Some("Reset Content"),
            206 => Some("Partial Content"),
            207 => Some("Multi-Status"),
            208 => Some("Already Reported"),
            226 => Some("IM Used"),
            300 => Some("Multiple Choices"),
            301 => Some("Moved Permanently"),
            302 => Some("Found"),
            303 => Some("See Other"),
            304 => Some("Not Modified"),
            305 => Some("Use Proxy"),
            307 => Some("Temporary Redirect"),
            308 => Some("Permanent Redirect"),
            400 => Some("Bad Request"),
            401 => Some("Unauthorized"),
            402 => Some("Payment Required"),
            403 => Some("Forbidden"),
            404 => Some("Not Found"),
            405 => Some("Method Not Allowed"),
            406 => Some("Not Acceptable"),
            407 => Some("Proxy Authentication Required"),
            408 => Some("Request Timeout"),
            409 => Some("Conflict"),
            410 => Some("Gone"),
            411 => Some("Length Required"),
            412 => Some("Precondition Failed"),
            413 => Some("Payload Too Large"),
            414 => Some("URI Too Long"),
            415 => Some("Unsupported Media Type"),
            416 => Some("Range Not Satisfiable"),
            417 => Some("Expectation Failed"),
            418 => Some("I'm a teapot"),
            422 => Some("Unprocessable Entity"),
            423 => Some("Locked"),
            424 => Some("Failed Dependency"),
            426 => Some("Upgrade Required"),
            428 => Some("Precondition Required"),
            429 => Some("Too Many Requests"),
            431 => Some("Request Header Fields Too Large"),
            451 => Some("Unavailable For Legal Reasons"),
            500 => Some("Internal Server Error"),
            501 => Some("Not Implemented"),
            502 => Some("Bad Gateway"),
            503 => Some("Service Unavailable"),
            504 => Some("Gateway Timeout"),
            505 => Some("HTTP Version Not Supported"),
            506 => Some("Variant Also Negotiates"),
            507 => Some("Insufficient Storage"),
            508 => Some("Loop Detected"),
            510 => Some("Not Extended"),
            511 => Some("Network Authentication Required"),
            _ => None,
        }
    }
}

impl fmt::Display for Status {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self.canonical_reason() {
            Some(reason) => write!(f, "{} {}", self.code, reason),
            None => write!(f, "{}", self.code),
        }
    }
}

/// HTTP 响应体
#[derive(Debug, Clone)]
pub struct Response {
    status: Status,
    headers: HeaderMap,
    body: Vec<u8>,
    url: String,
}

impl Response {
    /// 创建新的响应
    pub fn new(status: Status, headers: HeaderMap, body: Vec<u8>, url: String) -> Self {
        Response {
            status,
            headers,
            body,
            url,
        }
    }
    
    /// 获取响应状态
    pub fn status(&self) -> Status {
        self.status
    }
    
    /// 获取状态码
    pub fn status_code(&self) -> u16 {
        self.status.code()
    }
    
    /// 检查响应是否成功 (2xx)
    pub fn is_success(&self) -> bool {
        self.status.is_success()
    }
    
    /// 如果状态为错误，返回错误
    pub fn error_for_status(self) -> Result<Self> {
        if self.status.is_error() {
            Err(Error::ResponseError(format!(
                "HTTP error status: {}",
                self.status
            )))
        } else {
            Ok(self)
        }
    }
    
    /// 获取响应头
    pub fn headers(&self) -> &HeaderMap {
        &self.headers
    }
    
    /// 获取请求的 URL
    pub fn url(&self) -> &str {
        &self.url
    }
    
    /// 获取响应体的原始字节
    pub fn bytes(&self) -> &[u8] {
        &self.body
    }
    
    /// 获取响应体的字节长度
    pub fn content_length(&self) -> usize {
        self.body.len()
    }
    
    /// 将响应体转换为 UTF-8 字符串
    pub fn text(&self) -> Result<&str> {
        std::str::from_utf8(&self.body)
            .map_err(|e| Error::ResponseError(format!("Failed to parse response body as UTF-8: {}", e)))
    }
    
    /// 将响应体反序列化为 JSON
    pub fn json<T: DeserializeOwned>(&self) -> Result<T> {
        serde_json::from_slice(&self.body)
            .map_err(Error::from)
    }
    
    /// 消费响应体并返回原始字节
    pub fn into_bytes(self) -> Vec<u8> {
        self.body
    }
    
    /// 消费响应体并返回 UTF-8 字符串
    pub fn into_text(self) -> Result<String> {
        String::from_utf8(self.body)
            .map_err(|e| Error::ResponseError(format!("Failed to parse response body as UTF-8: {}", e)))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_status_codes() {
        let ok = Status::new(200);
        assert!(ok.is_success());
        assert!(!ok.is_error());
        assert_eq!(ok.canonical_reason(), Some("OK"));
        
        let not_found = Status::new(404);
        assert!(not_found.is_client_error());
        assert!(not_found.is_error());
        assert_eq!(not_found.canonical_reason(), Some("Not Found"));
        
        let server_error = Status::new(500);
        assert!(server_error.is_server_error());
        assert!(server_error.is_error());
    }
    
    #[test]
    fn test_response_text() {
        let body = b"Hello, World!";
        let response = Response::new(
            Status::new(200),
            HeaderMap::new(),
            body.to_vec(),
            "https://example.com".to_string(),
        );
        
        assert_eq!(response.text().unwrap(), "Hello, World!");
        assert_eq!(response.content_length(), 13);
    }
    
    #[test]
    fn test_response_json() {
        #[derive(serde::Deserialize, PartialEq, Debug)]
        struct User {
            name: String,
            age: u32,
        }
        
        let json_body = r#"{"name":"John","age":30}"#;
        let response = Response::new(
            Status::new(200),
            HeaderMap::new(),
            json_body.as_bytes().to_vec(),
            "https://example.com".to_string(),
        );
        
        let user: User = response.json().unwrap();
        assert_eq!(user.name, "John");
        assert_eq!(user.age, 30);
    }
    
    #[test]
    fn test_error_for_status() {
        let success_response = Response::new(
            Status::new(200),
            HeaderMap::new(),
            vec![],
            "https://example.com".to_string(),
        );
        assert!(success_response.error_for_status().is_ok());
        
        let error_response = Response::new(
            Status::new(404),
            HeaderMap::new(),
            vec![],
            "https://example.com".to_string(),
        );
        assert!(error_response.error_for_status().is_err());
    }
}
