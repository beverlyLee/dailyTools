//! 异步 HTTP 客户端实现
//! 
//! 基于 reqwest 库，提供：
//! - async/await 异步支持
//! - 连接池复用 TCP 连接
//! - 拦截器机制
//! - 类型安全的 API

use crate::http_client::interceptors::{InterceptorChain, InterceptorContext};
use crate::http_client::types::{
    HttpMethod, HttpResponse, RequestBody, SafeHeaders, SafeUrl,
};
use std::sync::Arc;
use std::time::Duration;

/// HTTP 客户端配置
#[derive(Debug, Clone)]
pub struct ClientConfig {
    /// 连接超时时间（毫秒）
    pub connect_timeout_ms: u64,
    /// 请求超时时间（毫秒）
    pub request_timeout_ms: u64,
    /// 最大连接数
    pub max_connections: usize,
    /// 是否启用 gzip 压缩
    pub enable_gzip: bool,
    /// 用户代理
    pub user_agent: Option<String>,
    /// 默认 headers
    pub default_headers: SafeHeaders,
}

impl Default for ClientConfig {
    fn default() -> Self {
        Self {
            connect_timeout_ms: 10_000,
            request_timeout_ms: 30_000,
            max_connections: 100,
            enable_gzip: true,
            user_agent: Some("data-security-lib/0.1.0".to_string()),
            default_headers: SafeHeaders::new(),
        }
    }
}

/// HTTP 客户端
/// 
/// 内存安全的异步 HTTP 客户端，支持：
/// - 连接池复用
/// - 请求/响应拦截器
/// - 类型安全的 API
pub struct HttpClient {
    inner: reqwest::Client,
    interceptor_chain: Arc<InterceptorChain>,
    config: ClientConfig,
}

impl HttpClient {
    /// 创建新的 HTTP 客户端
    pub fn new(config: ClientConfig) -> Result<Self, Box<dyn std::error::Error + Send + Sync>> {
        let mut builder = reqwest::Client::builder()
            .connect_timeout(Duration::from_millis(config.connect_timeout_ms))
            .timeout(Duration::from_millis(config.request_timeout_ms))
            .pool_max_idle_per_host(config.max_connections)
            .danger_accept_invalid_certs(false);

        if config.enable_gzip {
            builder = builder.gzip(true);
        }

        if let Some(user_agent) = &config.user_agent {
            builder = builder.user_agent(user_agent);
        }

        // 添加默认 headers
        for (key, value) in config.default_headers.iter() {
            builder = builder.default_headers({
                let mut headers = reqwest::header::HeaderMap::new();
                if let (Ok(key), Ok(value)) = (
                    reqwest::header::HeaderName::from_bytes(key.as_bytes()),
                    reqwest::header::HeaderValue::from_str(value),
                ) {
                    headers.insert(key, value);
                }
                headers
            });
        }

        let inner = builder.build()?;

        Ok(Self {
            inner,
            interceptor_chain: Arc::new(InterceptorChain::new()),
            config,
        })
    }

    /// 创建带有默认配置的 HTTP 客户端
    pub fn default() -> Result<Self, Box<dyn std::error::Error + Send + Sync>> {
        Self::new(ClientConfig::default())
    }

    /// 添加请求拦截器
    pub fn add_request_interceptor(
        &mut self,
        interceptor: Arc<dyn crate::http_client::interceptors::RequestInterceptor>,
    ) {
        Arc::get_mut(&mut self.interceptor_chain)
            .expect("Interceptor chain is not uniquely owned")
            .add_request_interceptor(interceptor);
    }

    /// 添加响应拦截器
    pub fn add_response_interceptor(
        &mut self,
        interceptor: Arc<dyn crate::http_client::interceptors::ResponseInterceptor>,
    ) {
        Arc::get_mut(&mut self.interceptor_chain)
            .expect("Interceptor chain is not uniquely owned")
            .add_response_interceptor(interceptor);
    }

    /// 发送 HTTP 请求
    pub async fn request(
        &self,
        method: HttpMethod,
        url: SafeUrl,
        headers: Option<SafeHeaders>,
        body: Option<RequestBody>,
    ) -> Result<HttpResponse, Box<dyn std::error::Error + Send + Sync>> {
        let headers = headers.unwrap_or_default();

        // 创建拦截器上下文
        let mut context = InterceptorContext::new(
            method,
            url.clone(),
            headers.clone(),
            body.clone(),
        );

        // 执行请求拦截器
        if let Some(early_response) = self
            .interceptor_chain
            .execute_request_interceptors(&mut context)
            .await?
        {
            return Ok(early_response);
        }

        // 构建请求
        let mut request_builder = match method {
            HttpMethod::Get => self.inner.get(url.as_str()),
            HttpMethod::Post => self.inner.post(url.as_str()),
            HttpMethod::Put => self.inner.put(url.as_str()),
            HttpMethod::Delete => self.inner.delete(url.as_str()),
            HttpMethod::Patch => self.inner.patch(url.as_str()),
            HttpMethod::Head => self.inner.head(url.as_str()),
            HttpMethod::Options => {
                let req = self.inner.request(reqwest::Method::OPTIONS, url.as_str());
                req
            }
        };

        // 添加 headers
        for (key, value) in context.headers.iter() {
            if let (Ok(key), Ok(value)) = (
                reqwest::header::HeaderName::from_bytes(key.as_bytes()),
                reqwest::header::HeaderValue::from_str(value),
            ) {
                request_builder = request_builder.header(key, value);
            }
        }

        // 添加 body
        if let Some(body) = &context.body {
            request_builder = match body {
                RequestBody::Json(json) => request_builder.json(json),
                RequestBody::Form(form) => request_builder.form(form),
                RequestBody::Bytes(bytes) => request_builder.body(bytes.clone()),
                RequestBody::Text(text) => request_builder.body(text.clone()),
                RequestBody::Empty => request_builder,
            };
        }

        // 发送请求
        let response = request_builder.send().await?;

        // 转换响应
        let status = response.status().as_u16();

        // 转换响应头
        let mut response_headers = SafeHeaders::new();
        for (key, value) in response.headers() {
            if let Ok(value_str) = value.to_str() {
                response_headers = response_headers.add(key.as_str(), value_str);
            }
        }

        // 获取响应体
        let body_bytes = response.bytes().await?.to_vec();

        let http_response = HttpResponse {
            status,
            headers: response_headers,
            body: body_bytes,
        };

        // 执行响应拦截器
        let final_response = self
            .interceptor_chain
            .execute_response_interceptors(&context, http_response)
            .await?;

        Ok(final_response)
    }

    /// 发送 GET 请求
    pub async fn get(
        &self,
        url: SafeUrl,
        headers: Option<SafeHeaders>,
    ) -> Result<HttpResponse, Box<dyn std::error::Error + Send + Sync>> {
        self.request(HttpMethod::Get, url, headers, None).await
    }

    /// 发送 POST 请求
    pub async fn post(
        &self,
        url: SafeUrl,
        headers: Option<SafeHeaders>,
        body: Option<RequestBody>,
    ) -> Result<HttpResponse, Box<dyn std::error::Error + Send + Sync>> {
        self.request(HttpMethod::Post, url, headers, body).await
    }

    /// 发送 PUT 请求
    pub async fn put(
        &self,
        url: SafeUrl,
        headers: Option<SafeHeaders>,
        body: Option<RequestBody>,
    ) -> Result<HttpResponse, Box<dyn std::error::Error + Send + Sync>> {
        self.request(HttpMethod::Put, url, headers, body).await
    }

    /// 发送 DELETE 请求
    pub async fn delete(
        &self,
        url: SafeUrl,
        headers: Option<SafeHeaders>,
    ) -> Result<HttpResponse, Box<dyn std::error::Error + Send + Sync>> {
        self.request(HttpMethod::Delete, url, headers, None).await
    }

    /// 发送 PATCH 请求
    pub async fn patch(
        &self,
        url: SafeUrl,
        headers: Option<SafeHeaders>,
        body: Option<RequestBody>,
    ) -> Result<HttpResponse, Box<dyn std::error::Error + Send + Sync>> {
        self.request(HttpMethod::Patch, url, headers, body).await
    }
}

impl Clone for HttpClient {
    fn clone(&self) -> Self {
        Self {
            inner: self.inner.clone(),
            interceptor_chain: Arc::clone(&self.interceptor_chain),
            config: self.config.clone(),
        }
    }
}
