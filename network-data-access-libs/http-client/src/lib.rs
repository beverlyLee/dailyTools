//! 内存安全的 HTTP 客户端库
//! 
//! 该库提供了以下核心功能：
//! - 异步请求支持 (async/await)
//! - 连接池复用 TCP 连接
//! - 请求/响应拦截器机制
//! - 类型安全的 URL 和 Header 处理
//! - C FFI 接口供上层语言调用

pub mod client;
pub mod error;
pub mod header;
pub mod interceptor;
pub mod request;
pub mod response;
pub mod url;

// 重新导出核心类型
pub use client::HttpClient;
pub use error::{Error, Result};
pub use header::HeaderMap;
pub use interceptor::{Interceptor, InterceptorChain};
pub use request::Request;
pub use response::Response;
pub use url::Url;

// FFI 模块
pub mod ffi;
