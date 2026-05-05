//! 日志过滤器
//!
//! 该模块提供了日志过滤功能，支持运行时和编译期过滤。

use std::sync::atomic::{AtomicU8, Ordering};

use crate::level::Level;
use crate::record::LogRecord;

/// 日志过滤器
///
/// 用于决定是否记录某个日志条目。
pub trait LogFilter: Send + Sync + 'static {
    /// 检查是否应该记录该日志
    ///
    /// # 参数
    /// * `record` - 日志记录
    ///
    /// # 返回值
    /// 返回 `true` 表示应该记录，`false` 表示应该过滤掉。
    fn should_log(&self, record: &LogRecord) -> bool;
}

/// 基于日志级别的过滤器
///
/// 只记录级别大于等于指定级别的日志。
pub struct LevelFilter {
    /// 最低日志级别（原子操作，支持运行时修改）
    min_level: AtomicU8,
}

impl LevelFilter {
    /// 创建一个新的级别过滤器
    ///
    /// # 参数
    /// * `min_level` - 最低日志级别
    ///
    /// # 示例
    /// ```
    /// use async_logger::{LevelFilter, Level};
    ///
    /// let filter = LevelFilter::new(Level::Info);
    /// ```
    pub fn new(min_level: Level) -> Self {
        Self {
            min_level: AtomicU8::new(min_level as u8),
        }
    }

    /// 获取当前最低日志级别
    ///
    /// # 示例
    /// ```
    /// use async_logger::{LevelFilter, Level};
    ///
    /// let filter = LevelFilter::new(Level::Info);
    /// assert_eq!(filter.min_level(), Level::Info);
    /// ```
    pub fn min_level(&self) -> Level {
        let level = self.min_level.load(Ordering::Relaxed);
        match level {
            0 => Level::Trace,
            1 => Level::Debug,
            2 => Level::Info,
            3 => Level::Warn,
            4 => Level::Error,
            _ => Level::Info, // 默认值
        }
    }

    /// 设置最低日志级别（运行时修改）
    ///
    /// # 参数
    /// * `level` - 新的最低日志级别
    ///
    /// # 示例
    /// ```
    /// use async_logger::{LevelFilter, Level};
    ///
    /// let filter = LevelFilter::new(Level::Info);
    /// filter.set_min_level(Level::Debug);
    /// assert_eq!(filter.min_level(), Level::Debug);
    /// ```
    pub fn set_min_level(&self, level: Level) {
        self.min_level.store(level as u8, Ordering::Relaxed);
    }
}

impl LogFilter for LevelFilter {
    fn should_log(&self, record: &LogRecord) -> bool {
        let record_level = record.level() as u8;
        let min_level = self.min_level.load(Ordering::Relaxed);
        record_level >= min_level
    }
}

/// 组合过滤器
///
/// 可以组合多个过滤器，只有所有过滤器都通过时才记录日志。
pub struct CompositeFilter {
    filters: Vec<Box<dyn LogFilter>>,
}

impl CompositeFilter {
    /// 创建一个新的组合过滤器
    ///
    /// # 示例
    /// ```
    /// use async_logger::{CompositeFilter, LevelFilter, Level};
    ///
    /// let filter = CompositeFilter::new()
    ///     .add_filter(LevelFilter::new(Level::Info));
    /// ```
    pub fn new() -> Self {
        Self {
            filters: Vec::new(),
        }
    }

    /// 添加一个过滤器
    ///
    /// # 参数
    /// * `filter` - 要添加的过滤器
    pub fn add_filter<F: LogFilter>(mut self, filter: F) -> Self {
        self.filters.push(Box::new(filter));
        self
    }
}

impl LogFilter for CompositeFilter {
    fn should_log(&self, record: &LogRecord) -> bool {
        self.filters.iter().all(|filter| filter.should_log(record))
    }
}

impl Default for CompositeFilter {
    fn default() -> Self {
        Self::new()
    }
}

/// 目标模块过滤器
///
/// 根据目标模块名称过滤日志。
pub struct TargetFilter {
    /// 允许的目标模块列表
    allowed_targets: Vec<String>,
}

impl TargetFilter {
    /// 创建一个新的目标模块过滤器
    ///
    /// # 参数
    /// * `allowed_targets` - 允许的目标模块列表
    ///
    /// # 示例
    /// ```
    /// use async_logger::TargetFilter;
    ///
    /// let filter = TargetFilter::new(vec!["my_app".to_string(), "my_lib".to_string()]);
    /// ```
    pub fn new(allowed_targets: Vec<String>) -> Self {
        Self {
            allowed_targets,
        }
    }
}

impl LogFilter for TargetFilter {
    fn should_log(&self, record: &LogRecord) -> bool {
        match record.metadata().target() {
            Some(target) => self.allowed_targets.iter().any(|t| t == target),
            None => false, // 如果没有目标模块，默认过滤掉
        }
    }
}

/// 正则表达式过滤器
///
/// 根据正则表达式匹配日志消息进行过滤。
#[cfg(feature = "regex")]
pub struct RegexFilter {
    /// 正则表达式
    regex: regex::Regex,
    /// 是否允许匹配的日志
    allow_matching: bool,
}

#[cfg(feature = "regex")]
impl RegexFilter {
    /// 创建一个新的正则表达式过滤器
    ///
    /// # 参数
    /// * `pattern` - 正则表达式模式
    /// * `allow_matching` - 如果为 `true`，则允许匹配的日志；如果为 `false`，则过滤掉匹配的日志
    ///
    /// # 示例
    /// ```
    /// use async_logger::RegexFilter;
    ///
    /// // 只允许包含 "error" 的日志
    /// let filter = RegexFilter::new("error", true).unwrap();
    /// ```
    pub fn new(pattern: &str, allow_matching: bool) -> Result<Self, regex::Error> {
        let regex = regex::Regex::new(pattern)?;
        Ok(Self {
            regex,
            allow_matching,
        })
    }
}

#[cfg(feature = "regex")]
impl LogFilter for RegexFilter {
    fn should_log(&self, record: &LogRecord) -> bool {
        let is_match = self.regex.is_match(record.message());
        if self.allow_matching {
            is_match
        } else {
            !is_match
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::record::LogRecord;

    #[test]
    fn test_level_filter() {
        let filter = LevelFilter::new(Level::Info);
        
        // 应该允许 Info 及以上级别的日志
        assert!(filter.should_log(&LogRecord::new(Level::Info, "test")));
        assert!(filter.should_log(&LogRecord::new(Level::Warn, "test")));
        assert!(filter.should_log(&LogRecord::new(Level::Error, "test")));
        
        // 应该过滤掉 Debug 和 Trace 级别的日志
        assert!(!filter.should_log(&LogRecord::new(Level::Debug, "test")));
        assert!(!filter.should_log(&LogRecord::new(Level::Trace, "test")));
    }

    #[test]
    fn test_level_filter_runtime_change() {
        let filter = LevelFilter::new(Level::Info);
        
        // 初始状态
        assert!(!filter.should_log(&LogRecord::new(Level::Debug, "test")));
        
        // 运行时修改级别
        filter.set_min_level(Level::Debug);
        assert_eq!(filter.min_level(), Level::Debug);
        
        // 现在应该允许 Debug 级别的日志
        assert!(filter.should_log(&LogRecord::new(Level::Debug, "test")));
    }

    #[test]
    fn test_composite_filter() {
        let filter = CompositeFilter::new()
            .add_filter(LevelFilter::new(Level::Info))
            .add_filter(TargetFilter::new(vec!["my_app".to_string()]));
        
        // 应该允许符合所有条件的日志
        let allowed_record = LogRecord::new(Level::Info, "test")
            .with_target("my_app");
        assert!(filter.should_log(&allowed_record));
        
        // 应该过滤掉级别不够的日志
        let low_level_record = LogRecord::new(Level::Debug, "test")
            .with_target("my_app");
        assert!(!filter.should_log(&low_level_record));
        
        // 应该过滤掉目标不匹配的日志
        let wrong_target_record = LogRecord::new(Level::Info, "test")
            .with_target("other_app");
        assert!(!filter.should_log(&wrong_target_record));
    }

    #[test]
    fn test_target_filter() {
        let filter = TargetFilter::new(vec!["app1".to_string(), "app2".to_string()]);
        
        // 应该允许匹配的目标
        assert!(filter.should_log(&LogRecord::new(Level::Info, "test").with_target("app1")));
        assert!(filter.should_log(&LogRecord::new(Level::Info, "test").with_target("app2")));
        
        // 应该过滤掉不匹配的目标
        assert!(!filter.should_log(&LogRecord::new(Level::Info, "test").with_target("app3")));
        
        // 应该过滤掉没有目标的日志
        assert!(!filter.should_log(&LogRecord::new(Level::Info, "test")));
    }

    #[test]
    fn test_empty_composite_filter() {
        // 空的组合过滤器应该允许所有日志
        let filter = CompositeFilter::new();
        
        assert!(filter.should_log(&LogRecord::new(Level::Trace, "test")));
        assert!(filter.should_log(&LogRecord::new(Level::Error, "test")));
    }
}
