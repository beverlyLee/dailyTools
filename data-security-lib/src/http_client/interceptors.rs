//! 请求/响应拦截器机制
//! 
//! 允许在请求发送前和响应接收后进行自定义处理

use crate::http_client::types::{HttpResponse, SafeHeaders, SafeUrl, HttpMethod, RequestBody};
use std::sync::Arc;

/// 拦截器上下文
#[derive(Debug, Clone)]
pub struct InterceptorContext {
    /// 请求方法
    pub method: HttpMethod,
    /// 请求 URL
    pub url: SafeUrl,
    /// 请求头
    pub headers: SafeHeaders,
    /// 请求体
    pub body: Option<RequestBody>,
    /// 自定义数据存储
    pub extensions: std::collections::HashMap<String, serde_json::Value>,
}

impl InterceptorContext {
    /// 创建新的拦截器上下文
    pub fn new(
        method: HttpMethod,
        url: SafeUrl,
        headers: SafeHeaders,
        body: Option<RequestBody>,
    ) -> Self {
        Self {
            method,
            url,
            headers,
            body,
            extensions: std::collections::HashMap::new(),
        }
    }

    /// 设置自定义数据
    pub fn insert_extension<T: serde::Serialize>(&mut self, key: &str, value: T) {
        if let Ok(json) = serde_json::to_value(value) {
            self.extensions.insert(key.to_string(), json);
        }
    }

    /// 获取自定义数据
    pub fn get_extension<T: serde::de::DeserializeOwned>(&self, key: &str) -> Option<T> {
        self.extensions
            .get(key)
            .and_then(|v| serde_json::from_value(v.clone()).ok())
    }
}

/// 请求拦截器 trait
/// 
/// 在请求发送前执行，可以修改请求或提前返回响应
pub trait RequestInterceptor: Send + Sync + 'static {
    /// 执行拦截逻辑
    /// 
    /// 返回 `Ok(None)` 表示继续执行下一个拦截器
    /// 返回 `Ok(Some(response))` 表示提前返回响应，跳过后续拦截器和实际请求
    /// 返回 `Err(error)` 表示拦截失败，终止请求
    fn intercept(
        &self,
        context: &mut InterceptorContext,
    ) -> Result<Option<HttpResponse>, Box<dyn std::error::Error + Send + Sync>>;
}

/// 响应拦截器 trait
/// 
/// 在响应接收后执行，可以修改响应
pub trait ResponseInterceptor: Send + Sync + 'static {
    /// 执行拦截逻辑
    /// 
    /// 可以修改响应并返回
    fn intercept(
        &self,
        context: &InterceptorContext,
        response: HttpResponse,
    ) -> Result<HttpResponse, Box<dyn std::error::Error + Send + Sync>>;
}

/// 日志请求拦截器
/// 
/// 记录请求信息
pub struct LoggingRequestInterceptor;

impl RequestInterceptor for LoggingRequestInterceptor {
    fn intercept(
        &self,
        context: &mut InterceptorContext,
    ) -> Result<Option<HttpResponse>, Box<dyn std::error::Error + Send + Sync>> {
        tracing::info!(
            "发送请求: {} {}",
            context.method,
            context.url.as_str()
        );
        tracing::debug!("请求头: {:?}", context.headers);
        Ok(None)
    }
}

/// 日志响应拦截器
/// 
/// 记录响应信息
pub struct LoggingResponseInterceptor;

impl ResponseInterceptor for LoggingResponseInterceptor {
    fn intercept(
        &self,
        context: &InterceptorContext,
        response: HttpResponse,
    ) -> Result<HttpResponse, Box<dyn std::error::Error + Send + Sync>> {
        tracing::info!(
            "收到响应: {} {} - 状态码: {}",
            context.method,
            context.url.as_str(),
            response.status
        );
        tracing::debug!("响应头: {:?}", response.headers);
        Ok(response)
    }
}

/// 超时控制拦截器
/// 
/// 设置请求超时时间
pub struct TimeoutInterceptor {
    timeout_ms: u64,
}

impl TimeoutInterceptor {
    /// 创建新的超时拦截器
    pub fn new(timeout_ms: u64) -> Self {
        Self { timeout_ms }
    }
}

impl RequestInterceptor for TimeoutInterceptor {
    fn intercept(
        &self,
        context: &mut InterceptorContext,
    ) -> Result<Option<HttpResponse>, Box<dyn std::error::Error + Send + Sync>> {
        context.insert_extension("timeout_ms", self.timeout_ms);
        Ok(None)
    }
}

/// 认证拦截器
/// 
/// 自动添加认证 header
pub struct AuthInterceptor {
    token: String,
}

impl AuthInterceptor {
    /// 创建新的 Bearer token 认证拦截器
    pub fn bearer(token: &str) -> Self {
        Self {
            token: token.to_string(),
        }
    }
}

impl RequestInterceptor for AuthInterceptor {
    fn intercept(
        &self,
        context: &mut InterceptorContext,
    ) -> Result<Option<HttpResponse>, Box<dyn std::error::Error + Send + Sync>> {
        context.headers = context
            .headers
            .clone()
            .bearer_token(&self.token);
        Ok(None)
    }
}

/// 拦截器链
/// 
/// 管理和执行多个拦截器
pub struct InterceptorChain {
    request_interceptors: Vec<Arc<dyn RequestInterceptor>>,
    response_interceptors: Vec<Arc<dyn ResponseInterceptor>>,
}

impl InterceptorChain {
    /// 创建新的拦截器链
    pub fn new() -> Self {
        Self {
            request_interceptors: Vec::new(),
            response_interceptors: Vec::new(),
        }
    }

    /// 添加请求拦截器
    pub fn add_request_interceptor(&mut self, interceptor: Arc<dyn RequestInterceptor>) {
        self.request_interceptors.push(interceptor);
    }

    /// 添加响应拦截器
    pub fn add_response_interceptor(&mut self, interceptor: Arc<dyn ResponseInterceptor>) {
        self.response_interceptors.push(interceptor);
    }

    /// 执行所有请求拦截器
    pub async fn execute_request_interceptors(
        &self,
        context: &mut InterceptorContext,
    ) -> Result<Option<HttpResponse>, Box<dyn std::error::Error + Send + Sync>> {
        for interceptor in &self.request_interceptors {
            if let Some(response) = interceptor.intercept(context)? {
                return Ok(Some(response));
            }
        }
        Ok(None)
    }

    /// 执行所有响应拦截器
    pub async fn execute_response_interceptors(
        &self,
        context: &InterceptorContext,
        mut response: HttpResponse,
    ) -> Result<HttpResponse, Box<dyn std::error::Error + Send + Sync>> {
        for interceptor in &self.response_interceptors {
            response = interceptor.intercept(context, response)?;
        }
        Ok(response)
    }
}

impl Default for InterceptorChain {
    fn default() -> Self {
        Self::new()
    }
}
