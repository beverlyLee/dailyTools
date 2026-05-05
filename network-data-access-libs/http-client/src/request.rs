//! HTTP 请求模块

use crate::error::{Error, Result};
use crate::header::HeaderMap;
use crate::url::Url;
use serde::Serialize;
use std::fmt;

/// HTTP 方法
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Method {
    Get,
    Post,
    Put,
    Delete,
    Patch,
    Head,
    Options,
    Connect,
    Trace,
}

impl Method {
    /// 从字符串解析 HTTP 方法
    pub fn from_str(method: &str) -> Result<Self> {
        match method.to_uppercase().as_str() {
            "GET" => Ok(Method::Get),
            "POST" => Ok(Method::Post),
            "PUT" => Ok(Method::Put),
            "DELETE" => Ok(Method::Delete),
            "PATCH" => Ok(Method::Patch),
            "HEAD" => Ok(Method::Head),
            "OPTIONS" => Ok(Method::Options),
            "CONNECT" => Ok(Method::Connect),
            "TRACE" => Ok(Method::Trace),
            _ => Err(Error::InvalidHttpMethod(method.to_string())),
        }
    }
    
    /// 转换为大写字符串
    pub fn as_str(&self) -> &'static str {
        match self {
            Method::Get => "GET",
            Method::Post => "POST",
            Method::Put => "PUT",
            Method::Delete => "DELETE",
            Method::Patch => "PATCH",
            Method::Head => "HEAD",
            Method::Options => "OPTIONS",
            Method::Connect => "CONNECT",
            Method::Trace => "TRACE",
        }
    }
}

impl fmt::Display for Method {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

impl Default for Method {
    fn default() -> Self {
        Method::Get
    }
}

/// HTTP 请求体
#[derive(Debug, Clone)]
pub enum Body {
    /// 空请求体
    Empty,
    /// 原始字节
    Bytes(Vec<u8>),
    /// 文本字符串
    Text(String),
    /// JSON 对象
    Json(serde_json::Value),
    /// 表单数据
    Form(Vec<(String, String)>),
}

impl Body {
    /// 创建空请求体
    pub fn empty() -> Self {
        Body::Empty
    }
    
    /// 从字节创建请求体
    pub fn bytes<T: Into<Vec<u8>>>(data: T) -> Self {
        Body::Bytes(data.into())
    }
    
    /// 从文本创建请求体
    pub fn text<T: Into<String>>(text: T) -> Self {
        Body::Text(text.into())
    }
    
    /// 从可序列化对象创建 JSON 请求体
    pub fn json<T: Serialize>(value: &T) -> Result<Self> {
        let json = serde_json::to_value(value)?;
        Ok(Body::Json(json))
    }
    
    /// 从键值对创建表单数据
    pub fn form<T: IntoIterator<Item = (K, V)>, K: Into<String>, V: Into<String>>(
        pairs: T,
    ) -> Self {
        let form = pairs.into_iter().map(|(k, v)| (k.into(), v.into())).collect();
        Body::Form(form)
    }
    
    /// 检查是否为空
    pub fn is_empty(&self) -> bool {
        match self {
            Body::Empty => true,
            Body::Bytes(v) => v.is_empty(),
            Body::Text(s) => s.is_empty(),
            Body::Json(_) => false,
            Body::Form(f) => f.is_empty(),
        }
    }
    
    /// 获取内容类型
    pub fn content_type(&self) -> Option<&'static str> {
        match self {
            Body::Empty => None,
            Body::Bytes(_) => Some("application/octet-stream"),
            Body::Text(_) => Some("text/plain; charset=utf-8"),
            Body::Json(_) => Some("application/json"),
            Body::Form(_) => Some("application/x-www-form-urlencoded"),
        }
    }
    
    /// 转换为字节
    pub fn into_bytes(self) -> Result<Vec<u8>> {
        match self {
            Body::Empty => Ok(vec![]),
            Body::Bytes(b) => Ok(b),
            Body::Text(s) => Ok(s.into_bytes()),
            Body::Json(j) => Ok(serde_json::to_vec(&j)?),
            Body::Form(f) => {
                let encoded = serde_urlencoded::to_string(f)
                    .map_err(|e| Error::InvalidRequestBody(e.to_string()))?;
                Ok(encoded.into_bytes())
            }
        }
    }
}

impl Default for Body {
    fn default() -> Self {
        Body::Empty
    }
}

/// HTTP 请求构建器
pub struct RequestBuilder {
    method: Method,
    url: Option<Url>,
    headers: HeaderMap,
    body: Body,
    timeout: Option<std::time::Duration>,
}

impl RequestBuilder {
    /// 创建新的请求构建器
    pub fn new(method: Method) -> Self {
        RequestBuilder {
            method,
            url: None,
            headers: HeaderMap::new(),
            body: Body::empty(),
            timeout: None,
        }
    }
    
    /// 设置请求 URL
    pub fn url<T: TryInto<Url, Error = Error>>(mut self, url: T) -> Result<Self> {
        self.url = Some(url.try_into()?);
        Ok(self)
    }
    
    /// 设置请求头
    pub fn header<K, V>(mut self, name: K, value: V) -> Result<Self>
    where
        K: TryInto<crate::header::HeaderName, Error = Error>,
        V: TryInto<crate::header::HeaderValue, Error = Error>,
    {
        self.headers.insert(name, value)?;
        Ok(self)
    }
    
    /// 设置 JSON 请求体
    pub fn json<T: Serialize>(mut self, value: &T) -> Result<Self> {
        // 自动设置 Content-Type
        self.headers.insert("Content-Type", "application/json")?;
        self.body = Body::json(value)?;
        Ok(self)
    }
    
    /// 设置表单请求体
    pub fn form<T: IntoIterator<Item = (K, V)>, K: Into<String>, V: Into<String>>(
        mut self,
        pairs: T,
    ) -> Result<Self> {
        self.headers.insert("Content-Type", "application/x-www-form-urlencoded")?;
        self.body = Body::form(pairs);
        Ok(self)
    }
    
    /// 设置原始请求体
    pub fn body(mut self, body: Body) -> Self {
        if let Some(content_type) = body.content_type() {
            let _ = self.headers.insert("Content-Type", content_type);
        }
        self.body = body;
        self
    }
    
    /// 设置超时时间
    pub fn timeout(mut self, duration: std::time::Duration) -> Self {
        self.timeout = Some(duration);
        self
    }
    
    /// 构建请求
    pub fn build(self) -> Result<Request> {
        let url = self.url.ok_or_else(|| {
            Error::RequestBuildError("URL is required for request".to_string())
        })?;
        
        Ok(Request {
            method: self.method,
            url,
            headers: self.headers,
            body: self.body,
            timeout: self.timeout,
        })
    }
}

/// HTTP 请求
#[derive(Debug, Clone)]
pub struct Request {
    method: Method,
    url: Url,
    headers: HeaderMap,
    body: Body,
    timeout: Option<std::time::Duration>,
}

impl Request {
    /// 创建一个 GET 请求构建器
    pub fn get() -> RequestBuilder {
        RequestBuilder::new(Method::Get)
    }
    
    /// 创建一个 POST 请求构建器
    pub fn post() -> RequestBuilder {
        RequestBuilder::new(Method::Post)
    }
    
    /// 创建一个 PUT 请求构建器
    pub fn put() -> RequestBuilder {
        RequestBuilder::new(Method::Put)
    }
    
    /// 创建一个 DELETE 请求构建器
    pub fn delete() -> RequestBuilder {
        RequestBuilder::new(Method::Delete)
    }
    
    /// 创建一个 PATCH 请求构建器
    pub fn patch() -> RequestBuilder {
        RequestBuilder::new(Method::Patch)
    }
    
    /// 获取请求方法
    pub fn method(&self) -> Method {
        self.method
    }
    
    /// 获取请求 URL
    pub fn url(&self) -> &Url {
        &self.url
    }
    
    /// 获取请求头的可变引用
    pub fn headers_mut(&mut self) -> &mut HeaderMap {
        &mut self.headers
    }
    
    /// 获取请求头
    pub fn headers(&self) -> &HeaderMap {
        &self.headers
    }
    
    /// 获取请求体的可变引用
    pub fn body_mut(&mut self) -> &mut Body {
        &mut self.body
    }
    
    /// 获取请求体
    pub fn body(&self) -> &Body {
        &self.body
    }
    
    /// 获取超时时间
    pub fn timeout(&self) -> Option<std::time::Duration> {
        self.timeout
    }
    
    /// 设置超时时间
    pub fn set_timeout(&mut self, timeout: Option<std::time::Duration>) {
        self.timeout = timeout;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_method_from_str() {
        assert_eq!(Method::from_str("GET").unwrap(), Method::Get);
        assert_eq!(Method::from_str("post").unwrap(), Method::Post);
        assert_eq!(Method::from_str("DELETE").unwrap(), Method::Delete);
    }
    
    #[test]
    fn test_invalid_method() {
        assert!(matches!(
            Method::from_str("INVALID"),
            Err(Error::InvalidHttpMethod(_))
        ));
    }
    
    #[test]
    fn test_request_builder() {
        let request = Request::get()
            .url("https://api.example.com/users")
            .unwrap()
            .header("Accept", "application/json")
            .unwrap()
            .build()
            .unwrap();
        
        assert_eq!(request.method(), Method::Get);
        assert_eq!(request.url().as_str(), "https://api.example.com/users");
        assert!(request.headers().contains_key("accept"));
    }
    
    #[test]
    fn test_json_body() {
        #[derive(Serialize)]
        struct User {
            name: String,
            age: u32,
        }
        
        let user = User {
            name: "John".to_string(),
            age: 30,
        };
        
        let request = Request::post()
            .url("https://api.example.com/users")
            .unwrap()
            .json(&user)
            .unwrap()
            .build()
            .unwrap();
        
        assert_eq!(request.method(), Method::Post);
        assert_eq!(
            request.headers().get("content-type").unwrap().as_str(),
            "application/json"
        );
    }
}
