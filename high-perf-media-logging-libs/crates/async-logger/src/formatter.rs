//! 日志格式化器
//!
//! 该模块提供了日志格式化功能，支持多种输出格式。

use std::fmt;

use chrono::{DateTime, Utc};
use serde_json::{json, Value};

use crate::config::OutputFormat;
use crate::record::LogRecord;

/// 日志格式化器
///
/// 用于将日志记录格式化为指定的输出格式。
pub trait LogFormatter: Send + Sync + 'static {
    /// 格式化日志记录
    ///
    /// # 参数
    /// * `record` - 日志记录
    ///
    /// # 返回值
    /// 返回格式化后的字节数组。
    fn format(&self, record: &LogRecord) -> Vec<u8>;
    
    /// 批量格式化日志记录
    ///
    /// # 参数
    /// * `records` - 日志记录列表
    ///
    /// # 返回值
    /// 返回格式化后的字节数组列表。
    fn format_batch(&self, records: &[LogRecord]) -> Vec<Vec<u8>> {
        records.iter().map(|r| self.format(r)).collect()
    }
}

/// JSON 格式化器
///
/// 将日志记录格式化为 JSON 格式。
pub struct JsonFormatter {
    /// 是否格式化输出（带缩进）
    pretty: bool,
}

impl JsonFormatter {
    /// 创建一个新的 JSON 格式化器
    ///
    /// # 参数
    /// * `pretty` - 是否使用格式化输出（带缩进）
    ///
    /// # 示例
    /// ```
    /// use async_logger::JsonFormatter;
    ///
    /// let formatter = JsonFormatter::new(false);
    /// ```
    pub fn new(pretty: bool) -> Self {
        Self { pretty }
    }

    /// 将日志记录转换为 JSON 值
    ///
    /// # 参数
    /// * `record` - 日志记录
    fn to_json_value(&self, record: &LogRecord) -> Value {
        let mut json = json!({
            "level": record.level().as_str(),
            "message": record.message(),
        });
        
        // 添加时间戳
        if let Ok(datetime) = DateTime::<Utc>::try_from(record.metadata().timestamp()) {
            json["timestamp"] = json!(datetime.to_rfc3339());
        }
        
        // 添加目标模块
        if let Some(target) = record.metadata().target() {
            json["target"] = json!(target);
        }
        
        // 添加文件和行号
        if let Some(file) = record.metadata().file() {
            json["file"] = json!(file);
        }
        if let Some(line) = record.metadata().line() {
            json["line"] = json!(line);
        }
        
        // 添加模块路径
        if let Some(module_path) = record.metadata().module_path() {
            json["module_path"] = json!(module_path);
        }
        
        // 添加线程 ID
        if let Some(thread_id) = record.metadata().thread_id() {
            json["thread_id"] = json!(format!("{:?}", thread_id));
        }
        
        // 添加额外字段
        if let Some(extra_fields) = record.extra_fields() {
            for (key, value) in extra_fields {
                json[key] = value.clone();
            }
        }
        
        json
    }
}

impl Default for JsonFormatter {
    fn default() -> Self {
        Self::new(false)
    }
}

impl LogFormatter for JsonFormatter {
    fn format(&self, record: &LogRecord) -> Vec<u8> {
        let json_value = self.to_json_value(record);
        
        let result = if self.pretty {
            serde_json::to_vec_pretty(&json_value)
        } else {
            serde_json::to_vec(&json_value)
        };
        
        match result {
            Ok(mut bytes) => {
                bytes.push(b'\n');
                bytes
            }
            Err(_) => {
                // 如果序列化失败，返回一个简单的错误消息
                b"{\"level\":\"ERROR\",\"message\":\"Failed to serialize log record\"}\n".to_vec()
            }
        }
    }

    fn format_batch(&self, records: &[LogRecord]) -> Vec<Vec<u8>> {
        records.iter().map(|r| self.format(r)).collect()
    }
}

/// 文本格式化器
///
/// 将日志记录格式化为人类可读的文本格式。
pub struct TextFormatter {
    /// 时间格式
    time_format: String,
    /// 是否包含颜色
    colored: bool,
}

impl TextFormatter {
    /// 创建一个新的文本格式化器
    ///
    /// # 示例
    /// ```
    /// use async_logger::TextFormatter;
    ///
    /// let formatter = TextFormatter::new();
    /// ```
    pub fn new() -> Self {
        Self {
            time_format: "%Y-%m-%d %H:%M:%S%.3f".to_string(),
            colored: false,
        }
    }

    /// 设置时间格式
    ///
    /// # 参数
    /// * `format` - 时间格式字符串
    pub fn with_time_format(mut self, format: impl Into<String>) -> Self {
        self.time_format = format.into();
        self
    }

    /// 设置是否使用颜色
    ///
    /// # 参数
    /// * `colored` - 是否使用颜色
    pub fn with_colored(mut self, colored: bool) -> Self {
        self.colored = colored;
        self
    }

    /// 获取级别颜色代码
    fn level_color(&self, level: crate::level::Level) -> &'static str {
        if !self.colored {
            return "";
        }
        
        match level {
            crate::level::Level::Trace => "\x1b[90m", // 灰色
            crate::level::Level::Debug => "\x1b[36m", // 青色
            crate::level::Level::Info => "\x1b[32m",  // 绿色
            crate::level::Level::Warn => "\x1b[33m",  // 黄色
            crate::level::Level::Error => "\x1b[31m", // 红色
        }
    }

    /// 获取重置颜色代码
    fn reset_color(&self) -> &'static str {
        if self.colored {
            "\x1b[0m"
        } else {
            ""
        }
    }
}

impl Default for TextFormatter {
    fn default() -> Self {
        Self::new()
    }
}

impl LogFormatter for TextFormatter {
    fn format(&self, record: &LogRecord) -> Vec<u8> {
        let mut result = String::new();
        
        // 添加时间戳
        if let Ok(datetime) = DateTime::<Utc>::try_from(record.metadata().timestamp()) {
            result.push_str(&datetime.format(&self.time_format).to_string());
            result.push_str(" ");
        }
        
        // 添加级别（带颜色）
        result.push_str(self.level_color(record.level()));
        result.push_str(&format!("[{:5}]", record.level().as_str()));
        result.push_str(self.reset_color());
        result.push_str(" ");
        
        // 添加目标模块
        if let Some(target) = record.metadata().target() {
            result.push_str(&format!("({}) ", target));
        }
        
        // 添加消息
        result.push_str(record.message());
        
        // 添加文件和行号
        if let (Some(file), Some(line)) = (record.metadata().file(), record.metadata().line()) {
            result.push_str(&format!(" ({}:{})", file, line));
        }
        
        // 添加换行
        result.push('\n');
        
        result.into_bytes()
    }
}

/// 格式化器工厂
///
/// 根据配置创建相应的格式化器。
pub struct FormatterFactory;

impl FormatterFactory {
    /// 根据输出格式创建格式化器
    ///
    /// # 参数
    /// * `format` - 输出格式
    ///
    /// # 示例
    /// ```
    /// use async_logger::{FormatterFactory, OutputFormat};
    ///
    /// let formatter = FormatterFactory::create(OutputFormat::Json);
    /// ```
    pub fn create(format: OutputFormat) -> Box<dyn LogFormatter> {
        match format {
            OutputFormat::Json => Box::new(JsonFormatter::default()),
            OutputFormat::Text => Box::new(TextFormatter::default()),
            OutputFormat::Protobuf => {
                // TODO: 实现 Protobuf 格式化器
                // 目前暂时使用 JSON 格式化器
                Box::new(JsonFormatter::default())
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::level::Level;
    use crate::record::LogRecord;
    use serde_json::json;

    #[test]
    fn test_json_formatter_basic() {
        let formatter = JsonFormatter::new(false);
        let record = LogRecord::new(Level::Info, "Test message");
        
        let bytes = formatter.format(&record);
        let json: Value = serde_json::from_slice(&bytes[..bytes.len() - 1]).unwrap();
        
        assert_eq!(json["level"], "INFO");
        assert_eq!(json["message"], "Test message");
        assert!(json.get("timestamp").is_some());
    }

    #[test]
    fn test_json_formatter_with_extra_fields() {
        let formatter = JsonFormatter::new(false);
        let record = LogRecord::new(Level::Info, "Test message")
            .with_extra_field("user_id", json!(123))
            .with_extra_field("action", json!("login"));
        
        let bytes = formatter.format(&record);
        let json: Value = serde_json::from_slice(&bytes[..bytes.len() - 1]).unwrap();
        
        assert_eq!(json["level"], "INFO");
        assert_eq!(json["message"], "Test message");
        assert_eq!(json["user_id"], 123);
        assert_eq!(json["action"], "login");
    }

    #[test]
    fn test_json_formatter_with_metadata() {
        let formatter = JsonFormatter::new(false);
        let thread_id = std::thread::current().id();
        
        let record = LogRecord::new(Level::Warn, "Warning message")
            .with_target("my_app")
            .with_file_line("src/main.rs", 42)
            .with_module_path("my_app::main")
            .with_thread_id(thread_id);
        
        let bytes = formatter.format(&record);
        let json: Value = serde_json::from_slice(&bytes[..bytes.len() - 1]).unwrap();
        
        assert_eq!(json["level"], "WARN");
        assert_eq!(json["message"], "Warning message");
        assert_eq!(json["target"], "my_app");
        assert_eq!(json["file"], "src/main.rs");
        assert_eq!(json["line"], 42);
        assert_eq!(json["module_path"], "my_app::main");
        assert!(json.get("thread_id").is_some());
    }

    #[test]
    fn test_json_formatter_pretty() {
        let formatter = JsonFormatter::new(true);
        let record = LogRecord::new(Level::Info, "Test message");
        
        let bytes = formatter.format(&record);
        let output = String::from_utf8(bytes).unwrap();
        
        // 检查是否包含换行符（格式化输出）
        assert!(output.contains('\n'));
        assert!(output.contains("  ")); // 检查是否有缩进
    }

    #[test]
    fn test_text_formatter_basic() {
        let formatter = TextFormatter::new();
        let record = LogRecord::new(Level::Info, "Test message");
        
        let bytes = formatter.format(&record);
        let output = String::from_utf8(bytes).unwrap();
        
        assert!(output.contains("[INFO]"));
        assert!(output.contains("Test message"));
    }

    #[test]
    fn test_text_formatter_with_metadata() {
        let formatter = TextFormatter::new();
        let record = LogRecord::new(Level::Error, "Error occurred")
            .with_target("my_app")
            .with_file_line("src/main.rs", 100);
        
        let bytes = formatter.format(&record);
        let output = String::from_utf8(bytes).unwrap();
        
        assert!(output.contains("[ERROR]"));
        assert!(output.contains("(my_app)"));
        assert!(output.contains("Error occurred"));
        assert!(output.contains("(src/main.rs:100)"));
    }

    #[test]
    fn test_formatter_factory() {
        let json_formatter = FormatterFactory::create(OutputFormat::Json);
        let text_formatter = FormatterFactory::create(OutputFormat::Text);
        
        let record = LogRecord::new(Level::Info, "Test");
        
        // 验证两种格式化器都能工作
        let json_output = json_formatter.format(&record);
        let text_output = text_formatter.format(&record);
        
        assert!(!json_output.is_empty());
        assert!(!text_output.is_empty());
    }

    #[test]
    fn test_json_formatter_batch() {
        let formatter = JsonFormatter::new(false);
        let records = vec![
            LogRecord::new(Level::Info, "Message 1"),
            LogRecord::new(Level::Warn, "Message 2"),
            LogRecord::new(Level::Error, "Message 3"),
        ];
        
        let outputs = formatter.format_batch(&records);
        
        assert_eq!(outputs.len(), 3);
        
        for (i, output) in outputs.iter().enumerate() {
            let json: Value = serde_json::from_slice(&output[..output.len() - 1]).unwrap();
            let expected_level = match i {
                0 => "INFO",
                1 => "WARN",
                2 => "ERROR",
                _ => unreachable!(),
            };
            assert_eq!(json["level"], expected_level);
        }
    }
}
