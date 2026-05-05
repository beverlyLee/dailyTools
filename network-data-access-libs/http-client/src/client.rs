//! HTTP 客户端核心模块

use crate::error::{Error, Result};
use crate::header::{HeaderMap, HeaderName, HeaderValue};
use crate::interceptor::InterceptorChain;
use crate::request::{Body, Method, Request, RequestBuilder};
use crate::response::{Response, Status};
use crate::url::Url;
use std::sync::Arc;
use std::time::Duration;

/// HTTP 客户端配置
#[derive(Debug, Clone)]
pub struct ClientConfig {
    /// 连接超时时间
    pub connect_timeout: Option<Duration>,
    /// 请求超时时间
    pub timeout: Option<Duration>,
    /// 最大连接数
    pub max_connections: Option<usize>,
    /// 是否启用连接池
    pub pool_enabled: bool,
    /// 连接池空闲超时时间
    pub pool_idle_timeout: Option<Duration>,
    /// 是否自动重定向
    pub follow_redirects: bool,
    /// 最大重定向次数
    pub max_redirects: Option<usize>,
    /// 默认请求头
    pub default_headers: HeaderMap,
    /// 是否启用 HTTPS
    pub https_only: bool,
    /// 用户代理
    pub user_agent: Option<String>,
}

impl Default for ClientConfig {
    fn default() -> Self {
        ClientConfig {
            connect_timeout: Some(Duration::from_secs(30)),
            timeout: Some(Duration::from_secs(60)),
            max_connections: Some(100),
            pool_enabled: true,
            pool_idle_timeout: Some(Duration::from_secs(90)),
            follow_redirects: true,
            max_redirects: Some(10),
            default_headers: HeaderMap::new(),
            https_only: false,
            user_agent: Some("http-client/0.1.0".to_string()),
        }
    }
}

impl ClientConfig {
    /// 创建新的配置
    pub fn new() -> Self {
        Self::default()
    }
    
    /// 设置连接超时时间
    pub fn connect_timeout(mut self, timeout: Duration) -> Self {
        self.connect_timeout = Some(timeout);
        self
    }
    
    /// 设置请求超时时间
    pub fn timeout(mut self, timeout: Duration) -> Self {
        self.timeout = Some(timeout);
        self
    }
    
    /// 设置最大连接数
    pub fn max_connections(mut self, max: usize) -> Self {
        self.max_connections = Some(max);
        self
    }
    
    /// 启用或禁用连接池
    pub fn pool_enabled(mut self, enabled: bool) -> Self {
        self.pool_enabled = enabled;
        self
    }
    
    /// 设置连接池空闲超时时间
    pub fn pool_idle_timeout(mut self, timeout: Duration) -> Self {
        self.pool_idle_timeout = Some(timeout);
        self
    }
    
    /// 设置是否自动重定向
    pub fn follow_redirects(mut self, follow: bool) -> Self {
        self.follow_redirects = follow;
        self
    }
    
    /// 设置最大重定向次数
    pub fn max_redirects(mut self, max: usize) -> Self {
        self.max_redirects = Some(max);
        self
    }
    
    /// 添加默认请求头
    pub fn default_header<K, V>(mut self, name: K, value: V) -> Result<Self>
    where
        K: TryInto<HeaderName, Error = Error>,
        V: TryInto<HeaderValue, Error = Error>,
    {
        self.default_headers.insert(name, value)?;
        Ok(self)
    }
    
    /// 设置是否仅使用 HTTPS
    pub fn https_only(mut self, https_only: bool) -> Self {
        self.https_only = https_only;
        self
    }
    
    /// 设置用户代理
    pub fn user_agent(mut self, user_agent: &str) -> Self {
        self.user_agent = Some(user_agent.to_string());
        self
    }
}

/// HTTP 客户端
/// 
/// 提供异步 HTTP 请求功能，支持连接池、拦截器等高级特性。
pub struct HttpClient {
    inner: reqwest::Client,
    config: ClientConfig,
    interceptors: Arc<InterceptorChain>,
}

impl HttpClient {
    /// 使用默认配置创建新的 HTTP 客户端
    pub fn new() -> Result<Self> {
        Self::with_config(ClientConfig::default())
    }
    
    /// 使用指定配置创建新的 HTTP 客户端
    pub fn with_config(config: ClientConfig) -> Result<Self> {
        let mut builder = reqwest::Client::builder();
        
        // 配置连接超时
        if let Some(timeout) = config.connect_timeout {
            builder = builder.connect_timeout(timeout);
        }
        
        // 配置请求超时
        if let Some(timeout) = config.timeout {
            builder = builder.timeout(timeout);
        }
        
        // 配置连接池
        if config.pool_enabled {
            if let Some(max_connections) = config.max_connections {
                builder = builder.pool_max_idle_per_host(max_connections);
            }
            if let Some(idle_timeout) = config.pool_idle_timeout {
                builder = builder.pool_idle_timeout(idle_timeout);
            }
        }
        
        // 配置重定向
        if config.follow_redirects {
            if let Some(max_redirects) = config.max_redirects {
                builder = builder.redirect(reqwest::redirect::Policy::limited(max_redirects));
            } else {
                builder = builder.redirect(reqwest::redirect::Policy::limited(10));
            }
        } else {
            builder = builder.redirect(reqwest::redirect::Policy::none());
        }
        
        // 配置默认请求头
        let mut default_headers = reqwest::header::HeaderMap::new();
        
        // 添加用户代理
        if let Some(user_agent) = &config.user_agent {
            default_headers.insert(
                reqwest::header::USER_AGENT,
                reqwest::header::HeaderValue::from_str(user_agent)
                    .map_err(|e| Error::InvalidHeaderValue(e.to_string()))?,
            );
        }
        
        // 添加自定义默认头
        for (name, value) in &config.default_headers {
            default_headers.insert(
                reqwest::header::HeaderName::from_str(name.as_str())
                    .map_err(|e| Error::InvalidHeaderName(e.to_string()))?,
                reqwest::header::HeaderValue::from_str(value.as_str())
                    .map_err(|e| Error::InvalidHeaderValue(e.to_string()))?,
            );
        }
        
        builder = builder.default_headers(default_headers);
        
        // 配置 HTTPS 强制
        if config.https_only {
            builder = builder.https_only(true);
        }
        
        // 构建客户端
        let inner = builder
            .build()
            .map_err(|e| Error::InternalError(format!("Failed to build HTTP client: {}", e)))?;
        
        Ok(HttpClient {
            inner,
            config,
            interceptors: Arc::new(InterceptorChain::new()),
        })
    }
    
    /// 获取客户端配置
    pub fn config(&self) -> &ClientConfig {
        &self.config
    }
    
    /// 添加拦截器
    pub fn add_interceptor<T: crate::interceptor::Interceptor + 'static>(&mut self, interceptor: T) {
        Arc::make_mut(&mut self.interceptors).add(interceptor);
    }
    
    /// 获取拦截器链（用于测试目的）
    pub fn interceptors(&self) -> &InterceptorChain {
        &self.interceptors
    }
    
    // 快捷方法
    
    /// 创建 GET 请求
    pub fn get<U: TryInto<Url, Error = Error>>(&self, url: U) -> Result<RequestBuilder> {
        Request::get().url(url)
    }
    
    /// 创建 POST 请求
    pub fn post<U: TryInto<Url, Error = Error>>(&self, url: U) -> Result<RequestBuilder> {
        Request::post().url(url)
    }
    
    /// 创建 PUT 请求
    pub fn put<U: TryInto<Url, Error = Error>>(&self, url: U) -> Result<RequestBuilder> {
        Request::put().url(url)
    }
    
    /// 创建 DELETE 请求
    pub fn delete<U: TryInto<Url, Error = Error>>(&self, url: U) -> Result<RequestBuilder> {
        Request::delete().url(url)
    }
    
    /// 创建 PATCH 请求
    pub fn patch<U: TryInto<Url, Error = Error>>(&self, url: U) -> Result<RequestBuilder> {
        Request::patch().url(url)
    }
    
    /// 执行 HTTP 请求
    pub async fn execute(&self, request: Request) -> Result<Response> {
        let mut request = request;
        
        // 执行请求前拦截器
        if !self.interceptors.is_empty() {
            self.interceptors.execute_before_request(&mut request).await?;
        }
        
        // 构建 reqwest 请求
        let method = match request.method() {
            Method::Get => reqwest::Method::GET,
            Method::Post => reqwest::Method::POST,
            Method::Put => reqwest::Method::PUT,
            Method::Delete => reqwest::Method::DELETE,
            Method::Patch => reqwest::Method::PATCH,
            Method::Head => reqwest::Method::HEAD,
            Method::Options => reqwest::Method::OPTIONS,
            Method::Connect => reqwest::Method::CONNECT,
            Method::Trace => reqwest::Method::TRACE,
        };
        
        let mut req_builder = self.inner.request(method, request.url().as_str());
        
        // 添加请求头
        for (name, value) in request.headers() {
            req_builder = req_builder.header(name.as_str(), value.as_str());
        }
        
        // 设置超时
        if let Some(timeout) = request.timeout() {
            req_builder = req_builder.timeout(timeout);
        }
        
        // 添加请求体
        let body_bytes = request.body().clone().into_bytes()?;
        if !body_bytes.is_empty() {
            req_builder = req_builder.body(body_bytes);
        }
        
        // 发送请求
        let response = req_builder.send().await?;
        
        // 转换为我们的响应类型
        let status = Status::new(response.status().as_u16());
        
        // 转换请求头
        let mut headers = HeaderMap::new();
        for (name, value) in response.headers() {
            headers.insert(name.as_str(), value.to_str().unwrap_or(""))?;
        }
        
        // 获取响应体
        let url = response.url().to_string();
        let body = response.bytes().await?.to_vec();
        
        let mut our_response = Response::new(status, headers, body, url);
        
        // 执行响应后拦截器
        if !self.interceptors.is_empty() {
            self.interceptors.execute_after_response(&mut our_response).await?;
        }
        
        Ok(our_response)
    }
    
    // 便捷方法
    
    /// 执行 GET 请求并返回文本
    pub async fn get_text<U: TryInto<Url, Error = Error>>(&self, url: U) -> Result<String> {
        let request = self.get(url)?.build()?;
        let response = self.execute(request).await?.error_for_status()?;
        response.into_text()
    }
    
    /// 执行 GET 请求并返回 JSON
    pub async fn get_json<U: TryInto<Url, Error = Error>, T: serde::de::DeserializeOwned>(
        &self,
        url: U,
    ) -> Result<T> {
        let request = self.get(url)?.header("Accept", "application/json")?.build()?;
        let response = self.execute(request).await?.error_for_status()?;
        response.json()
    }
    
    /// 执行 POST 请求并发送 JSON
    pub async fn post_json<U: TryInto<Url, Error = Error>, T: serde::Serialize>(
        &self,
        url: U,
        body: &T,
    ) -> Result<Response> {
        let request = self.post(url)?.json(body)?.build()?;
        self.execute(request).await
    }
}

impl Default for HttpClient {
    fn default() -> Self {
        Self::new().expect("Failed to create default HTTP client")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_client_config_default() {
        let config = ClientConfig::default();
        assert!(config.pool_enabled);
        assert!(config.follow_redirects);
        assert!(config.user_agent.is_some());
    }
    
    #[test]
    fn test_client_config_builder() {
        let config = ClientConfig::new()
            .connect_timeout(Duration::from_secs(10))
            .timeout(Duration::from_secs(30))
            .max_connections(50)
            .https_only(true);
        
        assert_eq!(config.connect_timeout, Some(Duration::from_secs(10)));
        assert_eq!(config.timeout, Some(Duration::from_secs(30)));
        assert_eq!(config.max_connections, Some(50));
        assert!(config.https_only);
    }
    
    #[test]
    fn test_client_creation() {
        let client = HttpClient::new();
        assert!(client.is_ok());
        
        let client = client.unwrap();
        assert!(client.config().pool_enabled);
    }
    
    #[tokio::test]
    async fn test_interceptor_chain() {
        let mut client = HttpClient::new().unwrap();
        
        // 验证拦截器链初始为空
        assert!(client.interceptors().is_empty());
        
        // 添加拦截器
        client.add_interceptor(crate::interceptor::LoggingInterceptor::new());
        
        // 验证拦截器已添加
        assert_eq!(client.interceptors().len(), 1);
    }
}
