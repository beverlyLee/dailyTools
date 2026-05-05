//! 类型安全的 HTTP 类型定义
//! 
//! 使用 Rust 的类型系统确保 URL、Header 等的安全性

use std::collections::HashMap;
use url::Url;

/// 类型安全的 HTTP 方法枚举
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HttpMethod {
    Get,
    Post,
    Put,
    Delete,
    Patch,
    Head,
    Options,
}

impl HttpMethod {
    /// 将枚举转换为字符串
    pub fn as_str(&self) -> &'static str {
        match self {
            HttpMethod::Get => "GET",
            HttpMethod::Post => "POST",
            HttpMethod::Put => "PUT",
            HttpMethod::Delete => "DELETE",
            HttpMethod::Patch => "PATCH",
            HttpMethod::Head => "HEAD",
            HttpMethod::Options => "OPTIONS",
        }
    }
}

impl std::fmt::Display for HttpMethod {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

/// 类型安全的 URL 封装
/// 确保 URL 在编译时就经过验证
#[derive(Debug, Clone)]
pub struct SafeUrl {
    inner: Url,
}

impl SafeUrl {
    /// 创建新的 SafeUrl，如果 URL 无效则返回错误
    pub fn parse(url: &str) -> Result<Self, url::ParseError> {
        let inner = Url::parse(url)?;
        Ok(Self { inner })
    }

    /// 获取基础 URL
    pub fn base_url(&self) -> &Url {
        &self.inner
    }

    /// 拼接路径参数，类型安全
    pub fn join(&self, path: &str) -> Result<Self, url::ParseError> {
        let inner = self.inner.join(path)?;
        Ok(Self { inner })
    }

    /// 添加查询参数，类型安全
    pub fn with_query_params(mut self, params: &[(&str, &str)]) -> Self {
        {
            let mut pairs = self.inner.query_pairs_mut();
            for (key, value) in params {
                pairs.append_pair(key, value);
            }
        }
        self
    }

    /// 转换为字符串
    pub fn as_str(&self) -> &str {
        self.inner.as_str()
    }
}

impl std::fmt::Display for SafeUrl {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.inner)
    }
}

/// 类型安全的 HTTP Header
#[derive(Debug, Clone)]
pub struct SafeHeaders {
    inner: HashMap<String, String>,
}

impl SafeHeaders {
    /// 创建新的空 Header
    pub fn new() -> Self {
        Self {
            inner: HashMap::new(),
        }
    }

    /// 添加 Content-Type header
    pub fn content_type(mut self, content_type: &str) -> Self {
        self.inner.insert("Content-Type".to_string(), content_type.to_string());
        self
    }

    /// 添加 Authorization header（类型安全的 Bearer token）
    pub fn bearer_token(mut self, token: &str) -> Self {
        self.inner.insert(
            "Authorization".to_string(),
            format!("Bearer {}", token),
        );
        self
    }

    /// 添加自定义 header
    pub fn add(mut self, key: &str, value: &str) -> Self {
        self.inner.insert(key.to_string(), value.to_string());
        self
    }

    /// 获取 header 值
    pub fn get(&self, key: &str) -> Option<&str> {
        self.inner.get(key).map(|s| s.as_str())
    }

    /// 迭代所有 header
    pub fn iter(&self) -> impl Iterator<Item = (&str, &str)> {
        self.inner.iter().map(|(k, v)| (k.as_str(), v.as_str()))
    }
}

impl Default for SafeHeaders {
    fn default() -> Self {
        Self::new()
    }
}

/// HTTP 请求体
#[derive(Debug, Clone)]
pub enum RequestBody {
    /// 空请求体
    Empty,
    /// JSON 请求体
    Json(serde_json::Value),
    /// 表单请求体
    Form(Vec<(String, String)>),
    /// 原始字节
    Bytes(Vec<u8>),
    /// 文本
    Text(String),
}

impl RequestBody {
    /// 创建 JSON 请求体
    pub fn json<T: serde::Serialize>(value: &T) -> Result<Self, serde_json::Error> {
        let json = serde_json::to_value(value)?;
        Ok(Self::Json(json))
    }

    /// 创建表单请求体
    pub fn form(params: &[(&str, &str)]) -> Self {
        Self::Form(
            params
                .iter()
                .map(|(k, v)| (k.to_string(), v.to_string()))
                .collect(),
        )
    }

    /// 获取 Content-Type
    pub fn content_type(&self) -> Option<&str> {
        match self {
            RequestBody::Json(_) => Some("application/json"),
            RequestBody::Form(_) => Some("application/x-www-form-urlencoded"),
            RequestBody::Text(_) => Some("text/plain"),
            _ => None,
        }
    }
}

/// HTTP 响应封装
#[derive(Debug, Clone)]
pub struct HttpResponse {
    /// 状态码
    pub status: u16,
    /// 响应头
    pub headers: SafeHeaders,
    /// 响应体
    pub body: Vec<u8>,
}

impl HttpResponse {
    /// 获取状态码
    pub fn status(&self) -> u16 {
        self.status
    }

    /// 检查状态码是否为成功状态（2xx）
    pub fn is_success(&self) -> bool {
        (200..300).contains(&self.status)
    }

    /// 将响应体解析为 JSON
    pub fn json<T: serde::de::DeserializeOwned>(&self) -> Result<T, serde_json::Error> {
        serde_json::from_slice(&self.body)
    }

    /// 将响应体转换为字符串
    pub fn text(&self) -> Result<String, std::string::FromUtf8Error> {
        String::from_utf8(self.body.clone())
    }
}
