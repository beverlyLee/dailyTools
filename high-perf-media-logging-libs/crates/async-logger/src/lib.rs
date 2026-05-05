//! 高性能异步日志库
//!
//! 该库提供了高性能的日志记录功能，特别适用于高并发场景。
//! 主要特性：
//! - 异步写入：日志先写入内存缓冲区，后台线程刷盘
//! - 多格式支持：JSON 格式输出
//! - 多级过滤：支持编译期和运行期日志级别过滤
//! - 高性能：每秒百万级日志条目

pub mod config;
pub mod error;
pub mod filter;
pub mod formatter;
pub mod level;
pub mod logger;
pub mod record;
pub mod writer;

pub use config::*;
pub use error::*;
pub use filter::*;
pub use formatter::*;
pub use level::*;
pub use logger::*;
pub use record::*;
pub use writer::*;

/// 全局日志实例
static GLOBAL_LOGGER: once_cell::sync::OnceCell<ArcLogger> = once_cell::sync::OnceCell::new();

/// 初始化全局日志系统
///
/// # 参数
/// * `config` - 日志配置
///
/// # 示例
/// ```
/// use async_logger::{init_global_logger, LoggerConfig};
///
/// let config = LoggerConfig::default();
/// init_global_logger(config).unwrap();
/// ```
pub fn init_global_logger(config: LoggerConfig) -> Result<(), LoggerError> {
    let logger = ArcLogger::new(config)?;
    GLOBAL_LOGGER
        .set(logger)
        .map_err(|_| LoggerError::InitializationError("Global logger already initialized".to_string()))
}

/// 获取全局日志实例
///
/// # 示例
/// ```
/// use async_logger::get_global_logger;
///
/// if let Some(logger) = get_global_logger() {
///     // 使用 logger
/// }
/// ```
pub fn get_global_logger() -> Option<&'static ArcLogger> {
    GLOBAL_LOGGER.get()
}

/// 记录日志（使用全局日志实例）
///
/// # 参数
/// * `level` - 日志级别
/// * `message` - 日志消息
///
/// # 示例
/// ```
/// use async_logger::{log, Level};
///
/// log(Level::Info, "This is an info message");
/// ```
pub fn log(level: Level, message: impl Into<String>) {
    if let Some(logger) = GLOBAL_LOGGER.get() {
        logger.log(level, message);
    }
}

/// 记录 DEBUG 级别日志
///
/// # 示例
/// ```
/// use async_logger::debug;
///
/// debug!("This is a debug message");
/// ```
#[macro_export]
macro_rules! debug {
    ($($arg:tt)*) => {
        $crate::log($crate::Level::Debug, format!($($arg)*))
    };
}

/// 记录 INFO 级别日志
///
/// # 示例
/// ```
/// use async_logger::info;
///
/// info!("This is an info message");
/// ```
#[macro_export]
macro_rules! info {
    ($($arg:tt)*) => {
        $crate::log($crate::Level::Info, format!($($arg)*))
    };
}

/// 记录 WARN 级别日志
///
/// # 示例
/// ```
/// use async_logger::warn;
///
/// warn!("This is a warn message");
/// ```
#[macro_export]
macro_rules! warn {
    ($($arg:tt)*) => {
        $crate::log($crate::Level::Warn, format!($($arg)*))
    };
}

/// 记录 ERROR 级别日志
///
/// # 示例
/// ```
/// use async_logger::error;
///
/// error!("This is an error message");
/// ```
#[macro_export]
macro_rules! error {
    ($($arg:tt)*) => {
        $crate::log($crate::Level::Error, format!($($arg)*))
    };
}

/// 记录 TRACE 级别日志
///
/// # 示例
/// ```
/// use async_logger::trace;
///
/// trace!("This is a trace message");
/// ```
#[macro_export]
macro_rules! trace {
    ($($arg:tt)*) => {
        $crate::log($crate::Level::Trace, format!($($arg)*))
    };
}

/// 关闭全局日志系统
///
/// 等待所有待处理的日志条目被写入磁盘。
///
/// # 示例
/// ```
/// use async_logger::shutdown_global_logger;
///
/// shutdown_global_logger();
/// ```
pub fn shutdown_global_logger() {
    if let Some(logger) = GLOBAL_LOGGER.get() {
        logger.shutdown();
    }
}
