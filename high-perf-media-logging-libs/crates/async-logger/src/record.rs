//! 日志记录
//!
//! 该模块定义了日志记录的结构，包含了日志的所有元数据和内容。

use std::thread::ThreadId;
use std::time::SystemTime;

use serde::{Deserialize, Serialize};

use crate::level::Level;

/// 日志记录元数据
///
/// 包含日志记录的位置信息和其他元数据。
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecordMetadata {
    /// 日志级别
    level: Level,
    
    /// 目标模块
    target: Option<String>,
    
    /// 文件名
    file: Option<String>,
    
    /// 行号
    line: Option<u32>,
    
    /// 模块路径
    module_path: Option<String>,
    
    /// 线程 ID
    thread_id: Option<ThreadId>,
    
    /// 时间戳
    timestamp: SystemTime,
}

impl RecordMetadata {
    /// 创建一个新的日志记录元数据
    ///
    /// # 参数
    /// * `level` - 日志级别
    ///
    /// # 示例
    /// ```
    /// use async_logger::{RecordMetadata, Level};
    ///
    /// let metadata = RecordMetadata::new(Level::Info);
    /// ```
    pub fn new(level: Level) -> Self {
        Self {
            level,
            target: None,
            file: None,
            line: None,
            module_path: None,
            thread_id: None,
            timestamp: SystemTime::now(),
        }
    }

    /// 设置目标模块
    ///
    /// # 参数
    /// * `target` - 目标模块名称
    pub fn with_target(mut self, target: impl Into<String>) -> Self {
        self.target = Some(target.into());
        self
    }

    /// 设置文件名和行号
    ///
    /// # 参数
    /// * `file` - 文件名
    /// * `line` - 行号
    pub fn with_file_line(mut self, file: impl Into<String>, line: u32) -> Self {
        self.file = Some(file.into());
        self.line = Some(line);
        self
    }

    /// 设置模块路径
    ///
    /// # 参数
    /// * `module_path` - 模块路径
    pub fn with_module_path(mut self, module_path: impl Into<String>) -> Self {
        self.module_path = Some(module_path.into());
        self
    }

    /// 设置线程 ID
    ///
    /// # 参数
    /// * `thread_id` - 线程 ID
    pub fn with_thread_id(mut self, thread_id: ThreadId) -> Self {
        self.thread_id = Some(thread_id);
        self
    }

    /// 获取日志级别
    pub fn level(&self) -> Level {
        self.level
    }

    /// 获取目标模块
    pub fn target(&self) -> Option<&str> {
        self.target.as_deref()
    }

    /// 获取文件名
    pub fn file(&self) -> Option<&str> {
        self.file.as_deref()
    }

    /// 获取行号
    pub fn line(&self) -> Option<u32> {
        self.line
    }

    /// 获取模块路径
    pub fn module_path(&self) -> Option<&str> {
        self.module_path.as_deref()
    }

    /// 获取线程 ID
    pub fn thread_id(&self) -> Option<ThreadId> {
        self.thread_id
    }

    /// 获取时间戳
    pub fn timestamp(&self) -> SystemTime {
        self.timestamp
    }
}

/// 日志记录
///
/// 包含完整的日志信息，包括元数据和消息内容。
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogRecord {
    /// 元数据
    metadata: RecordMetadata,
    
    /// 日志消息
    message: String,
    
    /// 额外字段（用于结构化日志）
    #[serde(flatten)]
    extra_fields: Option<serde_json::Map<String, serde_json::Value>>,
}

impl LogRecord {
    /// 创建一个新的日志记录
    ///
    /// # 参数
    /// * `level` - 日志级别
    /// * `message` - 日志消息
    ///
    /// # 示例
    /// ```
    /// use async_logger::{LogRecord, Level};
    ///
    /// let record = LogRecord::new(Level::Info, "This is a log message");
    /// ```
    pub fn new(level: Level, message: impl Into<String>) -> Self {
        Self {
            metadata: RecordMetadata::new(level),
            message: message.into(),
            extra_fields: None,
        }
    }

    /// 创建一个带元数据的日志记录
    ///
    /// # 参数
    /// * `metadata` - 日志元数据
    /// * `message` - 日志消息
    pub fn with_metadata(metadata: RecordMetadata, message: impl Into<String>) -> Self {
        Self {
            metadata,
            message: message.into(),
            extra_fields: None,
        }
    }

    /// 设置目标模块
    ///
    /// # 参数
    /// * `target` - 目标模块名称
    pub fn with_target(mut self, target: impl Into<String>) -> Self {
        self.metadata = self.metadata.with_target(target);
        self
    }

    /// 设置文件名和行号
    ///
    /// # 参数
    /// * `file` - 文件名
    /// * `line` - 行号
    pub fn with_file_line(mut self, file: impl Into<String>, line: u32) -> Self {
        self.metadata = self.metadata.with_file_line(file, line);
        self
    }

    /// 设置模块路径
    ///
    /// # 参数
    /// * `module_path` - 模块路径
    pub fn with_module_path(mut self, module_path: impl Into<String>) -> Self {
        self.metadata = self.metadata.with_module_path(module_path);
        self
    }

    /// 设置线程 ID
    ///
    /// # 参数
    /// * `thread_id` - 线程 ID
    pub fn with_thread_id(mut self, thread_id: ThreadId) -> Self {
        self.metadata = self.metadata.with_thread_id(thread_id);
        self
    }

    /// 添加额外字段（用于结构化日志）
    ///
    /// # 参数
    /// * `key` - 字段名
    /// * `value` - 字段值
    ///
    /// # 示例
    /// ```
    /// use async_logger::{LogRecord, Level};
    /// use serde_json::json;
    ///
    /// let record = LogRecord::new(Level::Info, "User logged in")
    ///     .with_extra_field("user_id", json!(123))
    ///     .with_extra_field("ip", json!("192.168.1.1"));
    /// ```
    pub fn with_extra_field(mut self, key: impl Into<String>, value: serde_json::Value) -> Self {
        let fields = self.extra_fields.get_or_insert_with(serde_json::Map::new);
        fields.insert(key.into(), value);
        self
    }

    /// 获取日志级别
    pub fn level(&self) -> Level {
        self.metadata.level()
    }

    /// 获取日志消息
    pub fn message(&self) -> &str {
        &self.message
    }

    /// 获取元数据
    pub fn metadata(&self) -> &RecordMetadata {
        &self.metadata
    }

    /// 获取额外字段
    pub fn extra_fields(&self) -> Option<&serde_json::Map<String, serde_json::Value>> {
        self.extra_fields.as_ref()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_record_metadata_basic() {
        let metadata = RecordMetadata::new(Level::Info);
        
        assert_eq!(metadata.level(), Level::Info);
        assert!(metadata.target().is_none());
        assert!(metadata.file().is_none());
        assert!(metadata.line().is_none());
        assert!(metadata.module_path().is_none());
        assert!(metadata.thread_id().is_none());
    }

    #[test]
    fn test_record_metadata_with_fields() {
        let thread_id = std::thread::current().id();
        
        let metadata = RecordMetadata::new(Level::Debug)
            .with_target("my_app")
            .with_file_line("src/main.rs", 42)
            .with_module_path("my_app::main")
            .with_thread_id(thread_id);
        
        assert_eq!(metadata.level(), Level::Debug);
        assert_eq!(metadata.target(), Some("my_app"));
        assert_eq!(metadata.file(), Some("src/main.rs"));
        assert_eq!(metadata.line(), Some(42));
        assert_eq!(metadata.module_path(), Some("my_app::main"));
        assert_eq!(metadata.thread_id(), Some(thread_id));
    }

    #[test]
    fn test_log_record_basic() {
        let record = LogRecord::new(Level::Info, "Test message");
        
        assert_eq!(record.level(), Level::Info);
        assert_eq!(record.message(), "Test message");
        assert!(record.extra_fields().is_none());
    }

    #[test]
    fn test_log_record_with_metadata() {
        let thread_id = std::thread::current().id();
        
        let metadata = RecordMetadata::new(Level::Warn)
            .with_target("test")
            .with_file_line("test.rs", 10)
            .with_thread_id(thread_id);
        
        let record = LogRecord::with_metadata(metadata, "Warning message");
        
        assert_eq!(record.level(), Level::Warn);
        assert_eq!(record.message(), "Warning message");
        assert_eq!(record.metadata().target(), Some("test"));
        assert_eq!(record.metadata().file(), Some("test.rs"));
        assert_eq!(record.metadata().line(), Some(10));
        assert_eq!(record.metadata().thread_id(), Some(thread_id));
    }

    #[test]
    fn test_log_record_with_extra_fields() {
        let record = LogRecord::new(Level::Info, "User action")
            .with_extra_field("user_id", json!(123))
            .with_extra_field("action", json!("login"))
            .with_extra_field("success", json!(true));
        
        let extra_fields = record.extra_fields().unwrap();
        
        assert_eq!(extra_fields.get("user_id"), Some(&json!(123)));
        assert_eq!(extra_fields.get("action"), Some(&json!("login")));
        assert_eq!(extra_fields.get("success"), Some(&json!(true)));
    }

    #[test]
    fn test_log_record_serde() {
        let record = LogRecord::new(Level::Info, "Test message")
            .with_extra_field("key", json!("value"));
        
        // 序列化
        let json = serde_json::to_string(&record).unwrap();
        
        // 反序列化
        let deserialized: LogRecord = serde_json::from_str(&json).unwrap();
        
        assert_eq!(deserialized.level(), Level::Info);
        assert_eq!(deserialized.message(), "Test message");
        assert_eq!(
            deserialized.extra_fields().unwrap().get("key"),
            Some(&json!("value"))
        );
    }
}
