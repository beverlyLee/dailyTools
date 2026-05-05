//! 日志配置
//!
//! 该模块定义了日志系统的配置选项，用于自定义日志行为。

use std::path::PathBuf;
use std::time::Duration;

use serde::{Deserialize, Serialize};

use crate::level::Level;

/// 日志输出格式
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum OutputFormat {
    /// JSON 格式
    Json,
    /// 纯文本格式（暂未实现）
    Text,
    /// Protobuf 格式（暂未实现）
    Protobuf,
}

impl Default for OutputFormat {
    fn default() -> Self {
        OutputFormat::Json
    }
}

/// 日志输出目标
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum OutputTarget {
    /// 标准输出
    Stdout,
    /// 标准错误
    Stderr,
    /// 文件输出
    File(PathBuf),
    /// 滚动文件输出
    RollingFile {
        /// 基础文件路径
        base_path: PathBuf,
        /// 单个文件最大大小（字节）
        max_size: u64,
        /// 保留的文件数量
        max_files: usize,
    },
}

impl Default for OutputTarget {
    fn default() -> Self {
        OutputTarget::Stdout
    }
}

/// 日志配置
///
/// 用于配置日志系统的各种行为。
///
/// # 示例
/// ```
/// use async_logger::{LoggerConfig, Level, OutputFormat, OutputTarget};
///
/// let config = LoggerConfig::builder()
///     .level(Level::Info)
///     .format(OutputFormat::Json)
///     .target(OutputTarget::Stdout)
///     .queue_capacity(10000)
///     .build();
/// ```
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoggerConfig {
    /// 日志级别
    level: Level,
    
    /// 输出格式
    format: OutputFormat,
    
    /// 输出目标
    target: OutputTarget,
    
    /// 日志队列容量
    queue_capacity: usize,
    
    /// 批量写入大小
    batch_size: usize,
    
    /// 刷新间隔
    flush_interval: Duration,
    
    /// 是否包含时间戳
    include_timestamp: bool,
    
    /// 是否包含线程 ID
    include_thread_id: bool,
    
    /// 是否包含模块路径
    include_module_path: bool,
    
    /// 是否包含文件和行号
    include_file_line: bool,
}

impl LoggerConfig {
    /// 创建一个新的配置构建器
    ///
    /// # 示例
    /// ```
    /// use async_logger::LoggerConfig;
    ///
    /// let config = LoggerConfig::builder().build();
    /// ```
    pub fn builder() -> LoggerConfigBuilder {
        LoggerConfigBuilder::new()
    }

    /// 获取日志级别
    pub fn level(&self) -> Level {
        self.level
    }

    /// 获取输出格式
    pub fn format(&self) -> OutputFormat {
        self.format
    }

    /// 获取输出目标
    pub fn target(&self) -> &OutputTarget {
        &self.target
    }

    /// 获取队列容量
    pub fn queue_capacity(&self) -> usize {
        self.queue_capacity
    }

    /// 获取批量写入大小
    pub fn batch_size(&self) -> usize {
        self.batch_size
    }

    /// 获取刷新间隔
    pub fn flush_interval(&self) -> Duration {
        self.flush_interval
    }

    /// 检查是否包含时间戳
    pub fn include_timestamp(&self) -> bool {
        self.include_timestamp
    }

    /// 检查是否包含线程 ID
    pub fn include_thread_id(&self) -> bool {
        self.include_thread_id
    }

    /// 检查是否包含模块路径
    pub fn include_module_path(&self) -> bool {
        self.include_module_path
    }

    /// 检查是否包含文件和行号
    pub fn include_file_line(&self) -> bool {
        self.include_file_line
    }
}

impl Default for LoggerConfig {
    fn default() -> Self {
        Self {
            level: Level::default(),
            format: OutputFormat::default(),
            target: OutputTarget::default(),
            queue_capacity: 10000,
            batch_size: 100,
            flush_interval: Duration::from_millis(100),
            include_timestamp: true,
            include_thread_id: false,
            include_module_path: false,
            include_file_line: false,
        }
    }
}

/// 日志配置构建器
///
/// 用于构建 LoggerConfig 实例。
///
/// # 示例
/// ```
/// use async_logger::{LoggerConfigBuilder, Level, OutputFormat, OutputTarget};
///
/// let config = LoggerConfigBuilder::new()
///     .level(Level::Debug)
///     .format(OutputFormat::Json)
///     .target(OutputTarget::Stdout)
///     .build();
/// ```
pub struct LoggerConfigBuilder {
    config: LoggerConfig,
}

impl LoggerConfigBuilder {
    /// 创建一个新的配置构建器
    pub fn new() -> Self {
        Self {
            config: LoggerConfig::default(),
        }
    }

    /// 设置日志级别
    ///
    /// # 参数
    /// * `level` - 日志级别
    pub fn level(mut self, level: Level) -> Self {
        self.config.level = level;
        self
    }

    /// 设置输出格式
    ///
    /// # 参数
    /// * `format` - 输出格式
    pub fn format(mut self, format: OutputFormat) -> Self {
        self.config.format = format;
        self
    }

    /// 设置输出目标
    ///
    /// # 参数
    /// * `target` - 输出目标
    pub fn target(mut self, target: OutputTarget) -> Self {
        self.config.target = target;
        self
    }

    /// 设置队列容量
    ///
    /// # 参数
    /// * `capacity` - 队列容量
    pub fn queue_capacity(mut self, capacity: usize) -> Self {
        self.config.queue_capacity = capacity;
        self
    }

    /// 设置批量写入大小
    ///
    /// # 参数
    /// * `size` - 批量大小
    pub fn batch_size(mut self, size: usize) -> Self {
        self.config.batch_size = size;
        self
    }

    /// 设置刷新间隔
    ///
    /// # 参数
    /// * `interval` - 刷新间隔
    pub fn flush_interval(mut self, interval: Duration) -> Self {
        self.config.flush_interval = interval;
        self
    }

    /// 设置是否包含时间戳
    ///
    /// # 参数
    /// * `include` - 是否包含
    pub fn include_timestamp(mut self, include: bool) -> Self {
        self.config.include_timestamp = include;
        self
    }

    /// 设置是否包含线程 ID
    ///
    /// # 参数
    /// * `include` - 是否包含
    pub fn include_thread_id(mut self, include: bool) -> Self {
        self.config.include_thread_id = include;
        self
    }

    /// 设置是否包含模块路径
    ///
    /// # 参数
    /// * `include` - 是否包含
    pub fn include_module_path(mut self, include: bool) -> Self {
        self.config.include_module_path = include;
        self
    }

    /// 设置是否包含文件和行号
    ///
    /// # 参数
    /// * `include` - 是否包含
    pub fn include_file_line(mut self, include: bool) -> Self {
        self.config.include_file_line = include;
        self
    }

    /// 构建配置
    ///
    /// 返回构建好的 LoggerConfig 实例。
    pub fn build(self) -> LoggerConfig {
        self.config
    }
}

impl Default for LoggerConfigBuilder {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = LoggerConfig::default();
        
        assert_eq!(config.level(), Level::Info);
        assert_eq!(config.format(), OutputFormat::Json);
        assert!(matches!(config.target(), OutputTarget::Stdout));
        assert_eq!(config.queue_capacity(), 10000);
        assert_eq!(config.batch_size(), 100);
        assert_eq!(config.flush_interval(), Duration::from_millis(100));
        assert!(config.include_timestamp());
        assert!(!config.include_thread_id());
        assert!(!config.include_module_path());
        assert!(!config.include_file_line());
    }

    #[test]
    fn test_config_builder() {
        let config = LoggerConfig::builder()
            .level(Level::Debug)
            .format(OutputFormat::Json)
            .target(OutputTarget::Stderr)
            .queue_capacity(50000)
            .batch_size(500)
            .flush_interval(Duration::from_millis(50))
            .include_timestamp(true)
            .include_thread_id(true)
            .include_module_path(true)
            .include_file_line(true)
            .build();
        
        assert_eq!(config.level(), Level::Debug);
        assert_eq!(config.format(), OutputFormat::Json);
        assert!(matches!(config.target(), OutputTarget::Stderr));
        assert_eq!(config.queue_capacity(), 50000);
        assert_eq!(config.batch_size(), 500);
        assert_eq!(config.flush_interval(), Duration::from_millis(50));
        assert!(config.include_timestamp());
        assert!(config.include_thread_id());
        assert!(config.include_module_path());
        assert!(config.include_file_line());
    }

    #[test]
    fn test_output_format_default() {
        assert_eq!(OutputFormat::default(), OutputFormat::Json);
    }

    #[test]
    fn test_output_target_default() {
        assert!(matches!(OutputTarget::default(), OutputTarget::Stdout));
    }

    #[test]
    fn test_rolling_file_target() {
        let target = OutputTarget::RollingFile {
            base_path: PathBuf::from("/var/log/app.log"),
            max_size: 10 * 1024 * 1024, // 10MB
            max_files: 5,
        };
        
        match target {
            OutputTarget::RollingFile { base_path, max_size, max_files } => {
                assert_eq!(base_path, PathBuf::from("/var/log/app.log"));
                assert_eq!(max_size, 10 * 1024 * 1024);
                assert_eq!(max_files, 5);
            }
            _ => panic!("Expected RollingFile target"),
        }
    }
}
