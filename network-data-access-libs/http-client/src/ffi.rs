//! C FFI 接口模块
//! 
//! 提供 C 语言可调用的接口，允许上层语言使用 Rust 实现的 HTTP 客户端。

use crate::client::{ClientConfig, HttpClient};
use crate::error::{Error, Result};
use crate::request::Method;
use crate::response::Status;
use libc::{c_char, c_int, c_void};
use std::ffi::{CStr, CString};
use std::sync::Mutex;
use std::time::Duration;

// 错误码
pub const ERROR_SUCCESS: c_int = 0;
pub const ERROR_INVALID_ARGUMENT: c_int = 1;
pub const ERROR_HTTP_CLIENT: c_int = 2;
pub const ERROR_REQUEST: c_int = 3;
pub const ERROR_RESPONSE: c_int = 4;
pub const ERROR_JSON: c_int = 5;
pub const ERROR_MEMORY: c_int = 6;
pub const ERROR_TIMEOUT: c_int = 7;

// 全局错误信息
static LAST_ERROR: Mutex<Option<String>> = Mutex::new(None);

fn set_last_error(msg: &str) {
    if let Ok(mut guard) = LAST_ERROR.lock() {
        *guard = Some(msg.to_string());
    }
}

fn clear_last_error() {
    if let Ok(mut guard) = LAST_ERROR.lock() {
        *guard = None;
    }
}

// 字符串转换辅助函数
unsafe fn c_str_to_string(ptr: *const c_char) -> Option<String> {
    if ptr.is_null() {
        return None;
    }
    CStr::from_ptr(ptr).to_str().ok().map(|s| s.to_string())
}

fn string_to_c_string(s: &str) -> Result<*mut c_char> {
    let c_str = CString::new(s)
        .map_err(|_| Error::TypeConversionError("Failed to convert string to CString".to_string()))?;
    Ok(c_str.into_raw())
}

// 客户端句柄
pub struct HttpClientHandle {
    client: HttpClient,
    runtime: tokio::runtime::Runtime,
}

impl HttpClientHandle {
    fn new(config: Option<ClientConfig>) -> Result<Self> {
        let runtime = tokio::runtime::Builder::new_multi_thread()
            .enable_all()
            .build()
            .map_err(|e| Error::InternalError(format!("Failed to create Tokio runtime: {}", e)))?;
        
        let client = match config {
            Some(cfg) => HttpClient::with_config(cfg)?,
            None => HttpClient::new()?,
        };
        
        Ok(HttpClientHandle { client, runtime })
    }
    
    fn execute_sync(&self, request: crate::request::Request) -> Result<crate::response::Response> {
        self.runtime.block_on(self.client.execute(request))
    }
}

/// 创建 HTTP 客户端
/// 
/// # Safety
/// 
/// 调用者必须确保返回的句柄在使用后通过 `http_client_destroy` 释放。
#[no_mangle]
pub unsafe extern "C" fn http_client_create() -> *mut HttpClientHandle {
    clear_last_error();
    
    match HttpClientHandle::new(None) {
        Ok(handle) => Box::into_raw(Box::new(handle)),
        Err(e) => {
            set_last_error(&e.to_string());
            std::ptr::null_mut()
        }
    }
}

/// 销毁 HTTP 客户端
/// 
/// # Safety
/// 
/// 调用者必须确保传入的是有效的 `HttpClientHandle` 指针，且之后不再使用该指针。
#[no_mangle]
pub unsafe extern "C" fn http_client_destroy(handle: *mut HttpClientHandle) {
    if !handle.is_null() {
        drop(Box::from_raw(handle));
    }
}

/// 执行 GET 请求，返回字符串
/// 
/// # Safety
/// 
/// 调用者必须确保：
/// 1. `handle` 是有效的 `HttpClientHandle` 指针
/// 2. `url` 是有效的 C 字符串
/// 3. 返回的字符串在使用后通过 `http_client_string_free` 释放
#[no_mangle]
pub unsafe extern "C" fn http_client_get(
    handle: *mut HttpClientHandle,
    url: *const c_char,
) -> *mut c_char {
    clear_last_error();
    
    if handle.is_null() || url.is_null() {
        set_last_error("Invalid argument: null pointer");
        return std::ptr::null_mut();
    }
    
    let handle = &*handle;
    let url_str = match c_str_to_string(url) {
        Some(s) => s,
        None => {
            set_last_error("Invalid URL string");
            return std::ptr::null_mut();
        }
    };
    
    let result = handle.runtime.block_on(async {
        handle.client.get_text(&url_str).await
    });
    
    match result {
        Ok(text) => match string_to_c_string(&text) {
            Ok(ptr) => ptr,
            Err(e) => {
                set_last_error(&e.to_string());
                std::ptr::null_mut()
            }
        },
        Err(e) => {
            set_last_error(&e.to_string());
            std::ptr::null_mut()
        }
    }
}

/// 执行 POST 请求，发送 JSON 数据
/// 
/// # Safety
/// 
/// 调用者必须确保：
/// 1. `handle` 是有效的 `HttpClientHandle` 指针
/// 2. `url` 和 `json_body` 是有效的 C 字符串
/// 3. 返回的字符串在使用后通过 `http_client_string_free` 释放
#[no_mangle]
pub unsafe extern "C" fn http_client_post_json(
    handle: *mut HttpClientHandle,
    url: *const c_char,
    json_body: *const c_char,
) -> *mut c_char {
    clear_last_error();
    
    if handle.is_null() || url.is_null() || json_body.is_null() {
        set_last_error("Invalid argument: null pointer");
        return std::ptr::null_mut();
    }
    
    let handle = &*handle;
    let url_str = match c_str_to_string(url) {
        Some(s) => s,
        None => {
            set_last_error("Invalid URL string");
            return std::ptr::null_mut();
        }
    };
    
    let body_str = match c_str_to_string(json_body) {
        Some(s) => s,
        None => {
            set_last_error("Invalid JSON body string");
            return std::ptr::null_mut();
        }
    };
    
    let json_value: serde_json::Value = match serde_json::from_str(&body_str) {
        Ok(v) => v,
        Err(e) => {
            set_last_error(&format!("Invalid JSON: {}", e));
            return std::ptr::null_mut();
        }
    };
    
    let result = handle.runtime.block_on(async {
        handle.client.post_json(&url_str, &json_value).await
    });
    
    match result {
        Ok(response) => match response.text() {
            Ok(text) => match string_to_c_string(text) {
                Ok(ptr) => ptr,
                Err(e) => {
                    set_last_error(&e.to_string());
                    std::ptr::null_mut()
                }
            },
            Err(e) => {
                set_last_error(&e.to_string());
                std::ptr::null_mut()
            }
        },
        Err(e) => {
            set_last_error(&e.to_string());
            std::ptr::null_mut()
        }
    }
}

/// 释放字符串
/// 
/// # Safety
/// 
/// 调用者必须确保传入的是通过本库分配的字符串指针。
#[no_mangle]
pub unsafe extern "C" fn http_client_string_free(s: *mut c_char) {
    if !s.is_null() {
        drop(CString::from_raw(s));
    }
}

/// 获取最后一个错误信息
/// 
/// # Safety
/// 
/// 返回的字符串指针在下次调用本库函数前有效，不需要释放。
#[no_mangle]
pub unsafe extern "C" fn http_client_last_error() -> *const c_char {
    match LAST_ERROR.lock() {
        Ok(guard) => match &*guard {
            Some(msg) => match CString::new(msg.as_str()) {
                Ok(c_str) => {
                    // 注意：这里我们泄漏了内存，因为错误信息需要在调用者那边保持有效
                    // 实际使用中应该使用更复杂的错误管理机制
                    let ptr = c_str.into_raw();
                    ptr
                }
                Err(_) => std::ptr::null(),
            },
            None => std::ptr::null(),
        },
        Err(_) => std::ptr::null(),
    }
}

// 简单的请求构建器（用于复杂请求）

/// 请求句柄
pub struct RequestHandle {
    method: Method,
    url: String,
    headers: Vec<(String, String)>,
    body: Option<Vec<u8>>,
    timeout_ms: Option<u64>,
}

/// 创建请求
/// 
/// # Safety
/// 
/// method 必须是有效的 HTTP 方法字符串（GET, POST, PUT, DELETE 等）
#[no_mangle]
pub unsafe extern "C" fn http_request_create(
    method: *const c_char,
    url: *const c_char,
) -> *mut RequestHandle {
    clear_last_error();
    
    if method.is_null() || url.is_null() {
        set_last_error("Invalid argument: null pointer");
        return std::ptr::null_mut();
    }
    
    let method_str = match c_str_to_string(method) {
        Some(s) => s,
        None => {
            set_last_error("Invalid method string");
            return std::ptr::null_mut();
        }
    };
    
    let url_str = match c_str_to_string(url) {
        Some(s) => s,
        None => {
            set_last_error("Invalid URL string");
            return std::ptr::null_mut();
        }
    };
    
    let method = match Method::from_str(&method_str) {
        Ok(m) => m,
        Err(e) => {
            set_last_error(&e.to_string());
            return std::ptr::null_mut();
        }
    };
    
    Box::into_raw(Box::new(RequestHandle {
        method,
        url: url_str,
        headers: Vec::new(),
        body: None,
        timeout_ms: None,
    }))
}

/// 添加请求头
#[no_mangle]
pub unsafe extern "C" fn http_request_add_header(
    request: *mut RequestHandle,
    name: *const c_char,
    value: *const c_char,
) -> c_int {
    clear_last_error();
    
    if request.is_null() || name.is_null() || value.is_null() {
        set_last_error("Invalid argument: null pointer");
        return ERROR_INVALID_ARGUMENT;
    }
    
    let request = &mut *request;
    let name_str = match c_str_to_string(name) {
        Some(s) => s,
        None => {
            set_last_error("Invalid header name");
            return ERROR_INVALID_ARGUMENT;
        }
    };
    let value_str = match c_str_to_string(value) {
        Some(s) => s,
        None => {
            set_last_error("Invalid header value");
            return ERROR_INVALID_ARGUMENT;
        }
    };
    
    request.headers.push((name_str, value_str));
    ERROR_SUCCESS
}

/// 设置请求体（字节）
#[no_mangle]
pub unsafe extern "C" fn http_request_set_body(
    request: *mut RequestHandle,
    data: *const u8,
    len: usize,
) -> c_int {
    clear_last_error();
    
    if request.is_null() || data.is_null() {
        set_last_error("Invalid argument: null pointer");
        return ERROR_INVALID_ARGUMENT;
    }
    
    let request = &mut *request;
    let body = std::slice::from_raw_parts(data, len).to_vec();
    request.body = Some(body);
    ERROR_SUCCESS
}

/// 设置超时时间（毫秒）
#[no_mangle]
pub unsafe extern "C" fn http_request_set_timeout(
    request: *mut RequestHandle,
    timeout_ms: u64,
) -> c_int {
    clear_last_error();
    
    if request.is_null() {
        set_last_error("Invalid argument: null pointer");
        return ERROR_INVALID_ARGUMENT;
    }
    
    let request = &mut *request;
    request.timeout_ms = Some(timeout_ms);
    ERROR_SUCCESS
}

/// 执行请求
#[no_mangle]
pub unsafe extern "C" fn http_request_execute(
    client: *mut HttpClientHandle,
    request: *mut RequestHandle,
) -> *mut c_char {
    clear_last_error();
    
    if client.is_null() || request.is_null() {
        set_last_error("Invalid argument: null pointer");
        return std::ptr::null_mut();
    }
    
    let client = &*client;
    let request = &*request;
    
    // 构建请求
    let url = match crate::url::Url::parse(&request.url) {
        Ok(u) => u,
        Err(e) => {
            set_last_error(&e.to_string());
            return std::ptr::null_mut();
        }
    };
    
    let mut req_builder = match request.method {
        Method::Get => crate::request::Request::get(),
        Method::Post => crate::request::Request::post(),
        Method::Put => crate::request::Request::put(),
        Method::Delete => crate::request::Request::delete(),
        Method::Patch => crate::request::Request::patch(),
        _ => {
            set_last_error("Unsupported HTTP method for FFI");
            return std::ptr::null_mut();
        }
    };
    
    let mut req_builder = match req_builder.url(url) {
        Ok(r) => r,
        Err(e) => {
            set_last_error(&e.to_string());
            return std::ptr::null_mut();
        }
    };
    
    // 添加头
    for (name, value) in &request.headers {
        req_builder = match req_builder.header(name.as_str(), value.as_str()) {
            Ok(r) => r,
            Err(e) => {
                set_last_error(&e.to_string());
                return std::ptr::null_mut();
            }
        };
    }
    
    // 设置超时
    if let Some(ms) = request.timeout_ms {
        req_builder = req_builder.timeout(Duration::from_millis(ms));
    }
    
    // 设置请求体
    if let Some(body) = &request.body {
        req_builder = req_builder.body(crate::request::Body::bytes(body.clone()));
    }
    
    let req = match req_builder.build() {
        Ok(r) => r,
        Err(e) => {
            set_last_error(&e.to_string());
            return std::ptr::null_mut();
        }
    };
    
    // 执行请求
    let response = match client.execute_sync(req) {
        Ok(r) => r,
        Err(e) => {
            set_last_error(&e.to_string());
            return std::ptr::null_mut();
        }
    };
    
    // 返回响应文本
    match response.text() {
        Ok(text) => match string_to_c_string(text) {
            Ok(ptr) => ptr,
            Err(e) => {
                set_last_error(&e.to_string());
                std::ptr::null_mut()
            }
        },
        Err(e) => {
            set_last_error(&e.to_string());
            std::ptr::null_mut()
        }
    }
}

/// 销毁请求
#[no_mangle]
pub unsafe extern "C" fn http_request_destroy(request: *mut RequestHandle) {
    if !request.is_null() {
        drop(Box::from_raw(request));
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_error_codes() {
        assert_eq!(ERROR_SUCCESS, 0);
        assert_eq!(ERROR_INVALID_ARGUMENT, 1);
    }
}
