//! 日志级别定义
//!
//! 该模块定义了日志级别，用于控制日志的详细程度。

use std::fmt;
use std::str::FromStr;

use serde::{Deserialize, Serialize};
use thiserror::Error;

/// 日志级别解析错误
#[derive(Error, Debug, PartialEq, Eq)]
pub enum LevelParseError {
    #[error("Unknown log level: {0}")]
    UnknownLevel(String),
}

/// 日志级别
///
/// 日志级别从低到高依次为：
/// - Trace: 最详细的日志级别，用于追踪程序执行流程
/// - Debug: 调试信息，用于开发阶段
/// - Info: 一般信息，用于记录程序运行状态
/// - Warn: 警告信息，用于记录潜在问题
/// - Error: 错误信息，用于记录错误事件
///
/// # 编译期过滤
/// 可以通过 cargo features 来编译期过滤日志级别：
/// - `max_level_trace`: 启用所有级别
/// - `max_level_debug`: 启用 Debug 及以上级别
/// - `max_level_info`: 启用 Info 及以上级别
/// - `max_level_warn`: 启用 Warn 及以上级别
/// - `max_level_error`: 仅启用 Error 级别
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[repr(u8)]
pub enum Level {
    /// 最详细的日志级别
    Trace = 0,
    /// 调试信息
    Debug = 1,
    /// 一般信息
    Info = 2,
    /// 警告信息
    Warn = 3,
    /// 错误信息
    Error = 4,
}

impl Level {
    /// 获取最低的日志级别（Trace）
    ///
    /// # 示例
    /// ```
    /// use async_logger::Level;
    ///
    /// assert_eq!(Level::min(), Level::Trace);
    /// ```
    pub fn min() -> Self {
        Level::Trace
    }

    /// 获取最高的日志级别（Error）
    ///
    /// # 示例
    /// ```
    /// use async_logger::Level;
    ///
    /// assert_eq!(Level::max(), Level::Error);
    /// ```
    pub fn max() -> Self {
        Level::Error
    }

    /// 将日志级别转换为字符串
    ///
    /// # 示例
    /// ```
    /// use async_logger::Level;
    ///
    /// assert_eq!(Level::Info.as_str(), "INFO");
    /// ```
    pub fn as_str(&self) -> &'static str {
        match self {
            Level::Trace => "TRACE",
            Level::Debug => "DEBUG",
            Level::Info => "INFO",
            Level::Warn => "WARN",
            Level::Error => "ERROR",
        }
    }

    /// 检查当前日志级别是否小于等于给定级别
    ///
    /// # 示例
    /// ```
    /// use async_logger::Level;
    ///
    /// assert!(Level::Debug.is_less_or_equal(Level::Info));
    /// assert!(!Level::Error.is_less_or_equal(Level::Warn));
    /// ```
    pub fn is_less_or_equal(&self, other: Level) -> bool {
        *self <= other
    }

    /// 检查当前日志级别是否大于等于给定级别
    ///
    /// # 示例
    /// ```
    /// use async_logger::Level;
    ///
    /// assert!(Level::Info.is_greater_or_equal(Level::Debug));
    /// assert!(!Level::Warn.is_greater_or_equal(Level::Error));
    /// ```
    pub fn is_greater_or_equal(&self, other: Level) -> bool {
        *self >= other
    }
}

impl fmt::Display for Level {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

impl FromStr for Level {
    type Err = LevelParseError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_uppercase().as_str() {
            "TRACE" | "trace" => Ok(Level::Trace),
            "DEBUG" | "debug" => Ok(Level::Debug),
            "INFO" | "info" => Ok(Level::Info),
            "WARN" | "warn" | "WARNING" | "warning" => Ok(Level::Warn),
            "ERROR" | "error" => Ok(Level::Error),
            _ => Err(LevelParseError::UnknownLevel(s.to_string())),
        }
    }
}

impl Default for Level {
    fn default() -> Self {
        Level::Info
    }
}

/// 编译期日志级别过滤
///
/// 根据 cargo features 设置，返回编译期允许的最大日志级别。
/// 这可以用于在编译时排除不需要的日志级别，从而提高性能。
///
/// # 示例
/// ```
/// use async_logger::{Level, compile_time_max_level};
///
/// let max_level = compile_time_max_level();
/// // 如果启用了 max_level_info feature，max_level 将是 Level::Info
/// ```
#[inline(always)]
pub const fn compile_time_max_level() -> Level {
    #[cfg(feature = "max_level_trace")]
    {
        Level::Trace
    }
    #[cfg(all(feature = "max_level_debug", not(feature = "max_level_trace")))]
    {
        Level::Debug
    }
    #[cfg(all(
        feature = "max_level_info",
        not(feature = "max_level_debug"),
        not(feature = "max_level_trace")
    ))]
    {
        Level::Info
    }
    #[cfg(all(
        feature = "max_level_warn",
        not(feature = "max_level_info"),
        not(feature = "max_level_debug"),
        not(feature = "max_level_trace")
    ))]
    {
        Level::Warn
    }
    #[cfg(all(
        feature = "max_level_error",
        not(feature = "max_level_warn"),
        not(feature = "max_level_info"),
        not(feature = "max_level_debug"),
        not(feature = "max_level_trace")
    ))]
    {
        Level::Error
    }
    #[cfg(not(any(
        feature = "max_level_trace",
        feature = "max_level_debug",
        feature = "max_level_info",
        feature = "max_level_warn",
        feature = "max_level_error"
    )))]
    {
        // 默认情况下，启用所有级别
        Level::Trace
    }
}

/// 检查是否应该记录指定级别的日志（考虑编译期过滤）
///
/// # 参数
/// * `level` - 要检查的日志级别
///
/// # 示例
/// ```
/// use async_logger::{Level, should_log_compile_time};
///
/// if should_log_compile_time(Level::Debug) {
///     // 记录调试日志
/// }
/// ```
#[inline(always)]
pub const fn should_log_compile_time(level: Level) -> bool {
    level as u8 >= compile_time_max_level() as u8
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_level_ordering() {
        assert!(Level::Trace < Level::Debug);
        assert!(Level::Debug < Level::Info);
        assert!(Level::Info < Level::Warn);
        assert!(Level::Warn < Level::Error);
    }

    #[test]
    fn test_level_from_str() {
        assert_eq!("TRACE".parse::<Level>().unwrap(), Level::Trace);
        assert_eq!("debug".parse::<Level>().unwrap(), Level::Debug);
        assert_eq!("Info".parse::<Level>().unwrap(), Level::Info);
        assert_eq!("WARN".parse::<Level>().unwrap(), Level::Warn);
        assert_eq!("warning".parse::<Level>().unwrap(), Level::Warn);
        assert_eq!("ERROR".parse::<Level>().unwrap(), Level::Error);
        
        assert!("invalid".parse::<Level>().is_err());
    }

    #[test]
    fn test_level_display() {
        assert_eq!(format!("{}", Level::Trace), "TRACE");
        assert_eq!(format!("{}", Level::Debug), "DEBUG");
        assert_eq!(format!("{}", Level::Info), "INFO");
        assert_eq!(format!("{}", Level::Warn), "WARN");
        assert_eq!(format!("{}", Level::Error), "ERROR");
    }

    #[test]
    fn test_level_comparison() {
        assert!(Level::Debug.is_less_or_equal(Level::Info));
        assert!(Level::Info.is_less_or_equal(Level::Info));
        assert!(!Level::Error.is_less_or_equal(Level::Warn));
        
        assert!(Level::Info.is_greater_or_equal(Level::Debug));
        assert!(Level::Info.is_greater_or_equal(Level::Info));
        assert!(!Level::Warn.is_greater_or_equal(Level::Error));
    }

    #[test]
    fn test_level_min_max() {
        assert_eq!(Level::min(), Level::Trace);
        assert_eq!(Level::max(), Level::Error);
    }

    #[test]
    fn test_level_default() {
        assert_eq!(Level::default(), Level::Info);
    }
}
