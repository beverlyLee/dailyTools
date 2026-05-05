//! 类型安全的 URL 处理模块

use crate::error::{Error, Result};
use std::fmt;

/// 类型安全的 URL 结构
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct Url {
    inner: url::Url,
}

impl Url {
    /// 从字符串解析 URL
    /// 
    /// # 错误
    /// 
    /// 如果 URL 格式无效，返回 `Error::UrlParseError`
    pub fn parse(url_str: &str) -> Result<Self> {
        let inner = url::Url::parse(url_str)?;
        
        // 验证 URL 方案（仅支持 HTTP 和 HTTPS）
        match inner.scheme() {
            "http" | "https" => Ok(Url { inner }),
            scheme => Err(Error::InvalidUrlScheme(scheme.to_string())),
        }
    }
    
    /// 获取 URL 的字符串表示
    pub fn as_str(&self) -> &str {
        self.inner.as_str()
    }
    
    /// 获取 URL 方案
    pub fn scheme(&self) -> &str {
        self.inner.scheme()
    }
    
    /// 获取主机名
    pub fn host_str(&self) -> Option<&str> {
        self.inner.host_str()
    }
    
    /// 获取端口
    pub fn port(&self) -> Option<u16> {
        self.inner.port_or_known_default()
    }
    
    /// 获取路径
    pub fn path(&self) -> &str {
        self.inner.path()
    }
    
    /// 获取查询字符串
    pub fn query(&self) -> Option<&str> {
        self.inner.query()
    }
    
    /// 获取片段
    pub fn fragment(&self) -> Option<&str> {
        self.inner.fragment()
    }
    
    /// 添加查询参数
    pub fn query_pairs_mut(&mut self) -> url::form_urlencoded::Serializer<'_, url::UrlQuery<'_>> {
        self.inner.query_pairs_mut()
    }
    
    /// 合并相对路径
    pub fn join(&self, input: &str) -> Result<Self> {
        let inner = self.inner.join(input)?;
        
        // 再次验证方案
        match inner.scheme() {
            "http" | "https" => Ok(Url { inner }),
            scheme => Err(Error::InvalidUrlScheme(scheme.to_string())),
        }
    }
    
    /// 转换为原始 url::Url
    pub fn into_inner(self) -> url::Url {
        self.inner
    }
}

impl fmt::Display for Url {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.inner)
    }
}

impl TryFrom<&str> for Url {
    type Error = Error;
    
    fn try_from(value: &str) -> Result<Self> {
        Url::parse(value)
    }
}

impl TryFrom<String> for Url {
    type Error = Error;
    
    fn try_from(value: String) -> Result<Self> {
        Url::parse(&value)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_valid_http_url() {
        let url = Url::parse("http://example.com").unwrap();
        assert_eq!(url.scheme(), "http");
        assert_eq!(url.host_str(), Some("example.com"));
    }
    
    #[test]
    fn test_valid_https_url() {
        let url = Url::parse("https://api.example.com/v1/users").unwrap();
        assert_eq!(url.scheme(), "https");
        assert_eq!(url.host_str(), Some("api.example.com"));
        assert_eq!(url.path(), "/v1/users");
    }
    
    #[test]
    fn test_invalid_url_scheme() {
        let result = Url::parse("ftp://example.com");
        assert!(matches!(result, Err(Error::InvalidUrlScheme(_))));
    }
    
    #[test]
    fn test_invalid_url_format() {
        let result = Url::parse("not a url");
        assert!(matches!(result, Err(Error::UrlParseError(_))));
    }
    
    #[test]
    fn test_url_join() {
        let base = Url::parse("https://api.example.com/v1/").unwrap();
        let joined = base.join("users").unwrap();
        assert_eq!(joined.as_str(), "https://api.example.com/v1/users");
    }
}
