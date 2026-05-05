//! HTTP 请求/响应拦截器机制

use crate::error::{Error, Result};
use crate::request::Request;
use crate::response::Response;
use async_trait::async_trait;
use std::sync::Arc;

/// 拦截器 trait
/// 
/// 拦截器允许在请求发送前和响应接收后进行自定义处理。
#[async_trait]
pub trait Interceptor: Send + Sync {
    /// 在请求发送前调用
    /// 
    /// 可以修改请求或返回错误来中断请求。
    async fn before_request(&self, request: &mut Request) -> Result<()> {
        // 默认实现：不做任何处理
        Ok(())
    }
    
    /// 在响应接收后调用
    /// 
    /// 可以修改响应或返回错误。
    async fn after_response(&self, response: &mut Response) -> Result<()> {
        // 默认实现：不做任何处理
        Ok(())
    }
}

/// 拦截器链
/// 
/// 管理多个拦截器，按顺序执行。
pub struct InterceptorChain {
    interceptors: Vec<Arc<dyn Interceptor>>,
}

impl InterceptorChain {
    /// 创建新的拦截器链
    pub fn new() -> Self {
        InterceptorChain {
            interceptors: Vec::new(),
        }
    }
    
    /// 添加拦截器
    pub fn add<T: Interceptor + 'static>(&mut self, interceptor: T) {
        self.interceptors.push(Arc::new(interceptor));
    }
    
    /// 添加 Arc 包装的拦截器
    pub fn add_arc(&mut self, interceptor: Arc<dyn Interceptor>) {
        self.interceptors.push(interceptor);
    }
    
    /// 执行所有拦截器的 before_request 方法
    pub async fn execute_before_request(&self, request: &mut Request) -> Result<()> {
        for interceptor in &self.interceptors {
            interceptor.before_request(request).await?;
        }
        Ok(())
    }
    
    /// 执行所有拦截器的 after_response 方法
    pub async fn execute_after_response(&self, response: &mut Response) -> Result<()> {
        // 注意：响应拦截器按相反顺序执行
        for interceptor in self.interceptors.iter().rev() {
            interceptor.after_response(response).await?;
        }
        Ok(())
    }
    
    /// 检查是否有拦截器
    pub fn is_empty(&self) -> bool {
        self.interceptors.is_empty()
    }
    
    /// 获取拦截器数量
    pub fn len(&self) -> usize {
        self.interceptors.len()
    }
}

impl Default for InterceptorChain {
    fn default() -> Self {
        InterceptorChain::new()
    }
}

// 预定义的拦截器实现

/// 日志拦截器
/// 
/// 记录请求和响应的详细信息。
pub struct LoggingInterceptor {
    log_headers: bool,
    log_body: bool,
}

impl LoggingInterceptor {
    /// 创建新的日志拦截器
    pub fn new() -> Self {
        LoggingInterceptor {
            log_headers: true,
            log_body: false,
        }
    }
    
    /// 设置是否记录请求头
    pub fn with_headers(mut self, log_headers: bool) -> Self {
        self.log_headers = log_headers;
        self
    }
    
    /// 设置是否记录请求体
    pub fn with_body(mut self, log_body: bool) -> Self {
        self.log_body = log_body;
        self
    }
}

impl Default for LoggingInterceptor {
    fn default() -> Self {
        LoggingInterceptor::new()
    }
}

#[async_trait]
impl Interceptor for LoggingInterceptor {
    async fn before_request(&self, request: &mut Request) -> Result<()> {
        tracing::info!(
            "Sending request: {} {}",
            request.method(),
            request.url()
        );
        
        if self.log_headers && !request.headers().is_empty() {
            tracing::debug!("Request headers: {:?}", request.headers());
        }
        
        if self.log_body && !request.body().is_empty() {
            // 注意：这里只记录文本类型的请求体
            match request.body() {
                crate::request::Body::Text(text) => {
                    tracing::debug!("Request body: {}", text);
                }
                crate::request::Body::Json(json) => {
                    tracing::debug!("Request body: {}", json);
                }
                _ => {}
            }
        }
        
        Ok(())
    }
    
    async fn after_response(&self, response: &mut Response) -> Result<()> {
        tracing::info!(
            "Received response: {} - {}",
            response.status(),
            response.url()
        );
        
        if self.log_headers && !response.headers().is_empty() {
            tracing::debug!("Response headers: {:?}", response.headers());
        }
        
        if self.log_body && response.content_length() > 0 {
            // 尝试记录文本响应
            if let Ok(text) = response.text() {
                tracing::debug!("Response body: {}", text);
            }
        }
        
        Ok(())
    }
}

/// 重试拦截器
/// 
/// 对失败的请求进行自动重试。
pub struct RetryInterceptor {
    max_retries: u32,
    retry_on_status: Vec<u16>,
}

impl RetryInterceptor {
    /// 创建新的重试拦截器
    pub fn new(max_retries: u32) -> Self {
        RetryInterceptor {
            max_retries,
            retry_on_status: vec![408, 429, 500, 502, 503, 504],
        }
    }
    
    /// 设置重试的状态码
    pub fn with_retry_statuses(mut self, statuses: Vec<u16>) -> Self {
        self.retry_on_status = statuses;
        self
    }
}

impl Default for RetryInterceptor {
    fn default() -> Self {
        RetryInterceptor::new(3)
    }
}

#[async_trait]
impl Interceptor for RetryInterceptor {
    // 注意：重试逻辑通常在客户端层面实现，而不是拦截器
    // 这里仅作为示例
}

/// 认证拦截器
/// 
/// 自动添加认证头到请求中。
pub struct AuthInterceptor {
    auth_header: String,
}

impl AuthInterceptor {
    /// 创建新的 Bearer Token 认证拦截器
    pub fn bearer(token: &str) -> Self {
        AuthInterceptor {
            auth_header: format!("Bearer {}", token),
        }
    }
    
    /// 创建新的 Basic 认证拦截器
    pub fn basic(username: &str, password: &str) -> Self {
        let credentials = format!("{}:{}", username, password);
        let encoded = base64::encode(credentials);
        AuthInterceptor {
            auth_header: format!("Basic {}", encoded),
        }
    }
    
    /// 创建自定义认证头的拦截器
    pub fn custom(scheme: &str, credentials: &str) -> Self {
        AuthInterceptor {
            auth_header: format!("{} {}", scheme, credentials),
        }
    }
}

#[async_trait]
impl Interceptor for AuthInterceptor {
    async fn before_request(&self, request: &mut Request) -> Result<()> {
        // 只在没有 Authorization 头时添加
        if !request.headers().contains_key("authorization") {
            request
                .headers_mut()
                .insert("Authorization", &self.auth_header)?;
        }
        Ok(())
    }
}

/// 超时拦截器
/// 
/// 设置请求的默认超时时间。
pub struct TimeoutInterceptor {
    default_timeout: std::time::Duration,
}

impl TimeoutInterceptor {
    /// 创建新的超时拦截器
    pub fn new(timeout: std::time::Duration) -> Self {
        TimeoutInterceptor {
            default_timeout: timeout,
        }
    }
}

#[async_trait]
impl Interceptor for TimeoutInterceptor {
    async fn before_request(&self, request: &mut Request) -> Result<()> {
        // 只在请求没有设置超时时间时设置
        if request.timeout().is_none() {
            request.set_timeout(Some(self.default_timeout));
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_interceptor_chain() {
        let mut chain = InterceptorChain::new();
        assert!(chain.is_empty());
        assert_eq!(chain.len(), 0);
        
        chain.add(LoggingInterceptor::new());
        assert_eq!(chain.len(), 1);
        assert!(!chain.is_empty());
    }
    
    #[test]
    fn test_auth_interceptor_bearer() {
        let interceptor = AuthInterceptor::bearer("test_token");
        assert_eq!(interceptor.auth_header, "Bearer test_token");
    }
    
    #[test]
    fn test_timeout_interceptor() {
        let duration = std::time::Duration::from_secs(30);
        let interceptor = TimeoutInterceptor::new(duration);
        assert_eq!(interceptor.default_timeout, duration);
    }
}
