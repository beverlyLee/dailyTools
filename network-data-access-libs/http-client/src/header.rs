//! 类型安全的 HTTP Header 处理模块

use crate::error::{Error, Result};
use std::collections::HashMap;
use std::fmt;
use std::iter::IntoIterator;

/// 类型安全的 Header 名称
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct HeaderName {
    inner: String,
}

impl HeaderName {
    /// 从字符串创建 Header 名称
    /// 
    /// # 错误
    /// 
    /// 如果 Header 名称包含无效字符，返回 `Error::InvalidHeaderName`
    pub fn from_str(name: &str) -> Result<Self> {
        // 验证 Header 名称是否符合 HTTP 规范
        // Header 名称只能包含 ASCII 字母、数字、连字符和下划线
        if name.is_empty() {
            return Err(Error::InvalidHeaderName("Header name cannot be empty".to_string()));
        }
        
        if !name.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_') {
            return Err(Error::InvalidHeaderName(format!(
                "Invalid header name: '{}'. Header names can only contain ASCII alphanumeric characters, '-', and '_'",
                name
            )));
        }
        
        Ok(HeaderName {
            inner: name.to_lowercase(),
        })
    }
    
    /// 获取 Header 名称的字符串表示
    pub fn as_str(&self) -> &str {
        &self.inner
    }
}

impl TryFrom<&str> for HeaderName {
    type Error = Error;
    
    fn try_from(value: &str) -> Result<Self> {
        HeaderName::from_str(value)
    }
}

impl TryFrom<String> for HeaderName {
    type Error = Error;
    
    fn try_from(value: String) -> Result<Self> {
        HeaderName::from_str(&value)
    }
}

impl fmt::Display for HeaderName {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.inner)
    }
}

/// 类型安全的 Header 值
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct HeaderValue {
    inner: String,
}

impl HeaderValue {
    /// 从字符串创建 Header 值
    /// 
    /// # 错误
    /// 
    /// 如果 Header 值包含无效字符，返回 `Error::InvalidHeaderValue`
    pub fn from_str(value: &str) -> Result<Self> {
        // 验证 Header 值是否符合 HTTP 规范
        // Header 值可以包含任何可见 ASCII 字符和空格，除了控制字符
        if value.chars().any(|c| c.is_control() && c != '\t') {
            return Err(Error::InvalidHeaderValue(format!(
                "Invalid header value: contains control characters"
            )));
        }
        
        Ok(HeaderValue {
            inner: value.to_string(),
        })
    }
    
    /// 获取 Header 值的字符串表示
    pub fn as_str(&self) -> &str {
        &self.inner
    }
}

impl TryFrom<&str> for HeaderValue {
    type Error = Error;
    
    fn try_from(value: &str) -> Result<Self> {
        HeaderValue::from_str(value)
    }
}

impl TryFrom<String> for HeaderValue {
    type Error = Error;
    
    fn try_from(value: String) -> Result<Self> {
        HeaderValue::from_str(&value)
    }
}

impl fmt::Display for HeaderValue {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.inner)
    }
}

/// HTTP Header Map - 类型安全的 Header 集合
#[derive(Debug, Clone, Default)]
pub struct HeaderMap {
    inner: HashMap<HeaderName, HeaderValue>,
}

impl HeaderMap {
    /// 创建一个新的空 HeaderMap
    pub fn new() -> Self {
        HeaderMap {
            inner: HashMap::new(),
        }
    }
    
    /// 插入一个 Header
    pub fn insert<K, V>(&mut self, name: K, value: V) -> Result<()>
    where
        K: TryInto<HeaderName, Error = Error>,
        V: TryInto<HeaderValue, Error = Error>,
    {
        let name = name.try_into()?;
        let value = value.try_into()?;
        self.inner.insert(name, value);
        Ok(())
    }
    
    /// 获取一个 Header
    pub fn get<K: TryInto<HeaderName, Error = Error>>(&self, name: K) -> Option<&HeaderValue> {
        let name = name.try_into().ok()?;
        self.inner.get(&name)
    }
    
    /// 移除一个 Header
    pub fn remove<K: TryInto<HeaderName, Error = Error>>(&mut self, name: K) -> Option<HeaderValue> {
        let name = name.try_into().ok()?;
        self.inner.remove(&name)
    }
    
    /// 检查是否包含某个 Header
    pub fn contains_key<K: TryInto<HeaderName, Error = Error>>(&self, name: K) -> bool {
        let name = name.try_into().ok();
        name.map(|n| self.inner.contains_key(&n)).unwrap_or(false)
    }
    
    /// 获取 Header 数量
    pub fn len(&self) -> usize {
        self.inner.len()
    }
    
    /// 检查是否为空
    pub fn is_empty(&self) -> bool {
        self.inner.is_empty()
    }
    
    /// 清空所有 Header
    pub fn clear(&mut self) {
        self.inner.clear();
    }
    
    /// 获取迭代器
    pub fn iter(&self) -> std::collections::hash_map::Iter<HeaderName, HeaderValue> {
        self.inner.iter()
    }
}

impl IntoIterator for HeaderMap {
    type Item = (HeaderName, HeaderValue);
    type IntoIter = std::collections::hash_map::IntoIter<HeaderName, HeaderValue>;
    
    fn into_iter(self) -> Self::IntoIter {
        self.inner.into_iter()
    }
}

// 标准 Header 名称常量
pub mod constants {
    use super::HeaderName;
    
    // 通用 Header
    pub const CONTENT_TYPE: HeaderName = HeaderName { inner: String::from("content-type") };
    pub const CONTENT_LENGTH: HeaderName = HeaderName { inner: String::from("content-length") };
    pub const ACCEPT: HeaderName = HeaderName { inner: String::from("accept") };
    pub const ACCEPT_ENCODING: HeaderName = HeaderName { inner: String::from("accept-encoding") };
    pub const ACCEPT_LANGUAGE: HeaderName = HeaderName { inner: String::from("accept-language") };
    pub const CONNECTION: HeaderName = HeaderName { inner: String::from("connection") };
    pub const DATE: HeaderName = HeaderName { inner: String::from("date") };
    pub const HOST: HeaderName = HeaderName { inner: String::from("host") };
    pub const USER_AGENT: HeaderName = HeaderName { inner: String::from("user-agent") };
    
    // 请求 Header
    pub const AUTHORIZATION: HeaderName = HeaderName { inner: String::from("authorization") };
    pub const COOKIE: HeaderName = HeaderName { inner: String::from("cookie") };
    pub const REFERER: HeaderName = HeaderName { inner: String::from("referer") };
    
    // 响应 Header
    pub const SET_COOKIE: HeaderName = HeaderName { inner: String::from("set-cookie") };
    pub const LOCATION: HeaderName = HeaderName { inner: String::from("location") };
    pub const CACHE_CONTROL: HeaderName = HeaderName { inner: String::from("cache-control") };
    pub const EXPIRES: HeaderName = HeaderName { inner: String::from("expires") };
    pub const LAST_MODIFIED: HeaderName = HeaderName { inner: String::from("last-modified") };
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_valid_header_name() {
        let name = HeaderName::from_str("Content-Type").unwrap();
        assert_eq!(name.as_str(), "content-type");
    }
    
    #[test]
    fn test_invalid_header_name() {
        let result = HeaderName::from_str("Content@Type");
        assert!(matches!(result, Err(Error::InvalidHeaderName(_))));
    }
    
    #[test]
    fn test_empty_header_name() {
        let result = HeaderName::from_str("");
        assert!(matches!(result, Err(Error::InvalidHeaderName(_))));
    }
    
    #[test]
    fn test_valid_header_value() {
        let value = HeaderValue::from_str("application/json").unwrap();
        assert_eq!(value.as_str(), "application/json");
    }
    
    #[test]
    fn test_header_map_insert() {
        let mut headers = HeaderMap::new();
        headers.insert("Content-Type", "application/json").unwrap();
        headers.insert("Accept", "*/*").unwrap();
        
        assert_eq!(headers.len(), 2);
        assert!(headers.contains_key("content-type"));
        assert_eq!(headers.get("content-type").unwrap().as_str(), "application/json");
    }
    
    #[test]
    fn test_header_map_remove() {
        let mut headers = HeaderMap::new();
        headers.insert("Content-Type", "application/json").unwrap();
        
        let removed = headers.remove("content-type");
        assert!(removed.is_some());
        assert!(headers.is_empty());
    }
}
