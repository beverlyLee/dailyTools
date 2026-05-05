//! 异步写入器
//!
//! 该模块负责将格式化后的日志数据异步写入到输出目标。

use std::fs::File;
use std::io::{self, Write};
use std::path::Path;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;

use tokio::sync::Notify;
use tokio::task::JoinHandle;

use crate::config::OutputTarget;
use crate::error::LoggerError;

/// 日志写入器
///
/// 负责将日志数据写入到输出目标。
pub trait LogWriter: Send + Sync + 'static {
    /// 写入日志数据
    ///
    /// # 参数
    /// * `data` - 要写入的字节数据
    fn write(&self, data: &[u8]) -> Result<(), LoggerError>;
    
    /// 批量写入日志数据
    ///
    /// # 参数
    /// * `data_list` - 要写入的字节数据列表
    fn write_batch(&self, data_list: &[Vec<u8>]) -> Result<(), LoggerError> {
        for data in data_list {
            self.write(data)?;
        }
        Ok(())
    }
    
    /// 刷新缓冲区
    fn flush(&self) -> Result<(), LoggerError>;
    
    /// 关闭写入器
    fn shutdown(&self) -> Result<(), LoggerError>;
}

/// 标准输出写入器
///
/// 将日志写入到标准输出。
pub struct StdoutWriter;

impl LogWriter for StdoutWriter {
    fn write(&self, data: &[u8]) -> Result<(), LoggerError> {
        io::stdout().write_all(data)?;
        Ok(())
    }
    
    fn write_batch(&self, data_list: &[Vec<u8>]) -> Result<(), LoggerError> {
        let mut stdout = io::stdout();
        for data in data_list {
            stdout.write_all(data)?;
        }
        Ok(())
    }
    
    fn flush(&self) -> Result<(), LoggerError> {
        io::stdout().flush()?;
        Ok(())
    }
    
    fn shutdown(&self) -> Result<(), LoggerError> {
        self.flush()
    }
}

/// 标准错误写入器
///
/// 将日志写入到标准错误。
pub struct StderrWriter;

impl LogWriter for StderrWriter {
    fn write(&self, data: &[u8]) -> Result<(), LoggerError> {
        io::stderr().write_all(data)?;
        Ok(())
    }
    
    fn write_batch(&self, data_list: &[Vec<u8>]) -> Result<(), LoggerError> {
        let mut stderr = io::stderr();
        for data in data_list {
            stderr.write_all(data)?;
        }
        Ok(())
    }
    
    fn flush(&self) -> Result<(), LoggerError> {
        io::stderr().flush()?;
        Ok(())
    }
    
    fn shutdown(&self) -> Result<(), LoggerError> {
        self.flush()
    }
}

/// 文件写入器
///
/// 将日志写入到文件。
pub struct FileWriter {
    file: std::sync::Mutex<File>,
    path: std::path::PathBuf,
}

impl FileWriter {
    /// 创建一个新的文件写入器
    ///
    /// # 参数
    /// * `path` - 文件路径
    ///
    /// # 示例
    /// ```
    /// use async_logger::FileWriter;
    ///
    /// let writer = FileWriter::new("/var/log/app.log").unwrap();
    /// ```
    pub fn new<P: AsRef<Path>>(path: P) -> Result<Self, LoggerError> {
        let path = path.as_ref().to_path_buf();
        
        // 确保目录存在
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        
        let file = File::options()
            .create(true)
            .append(true)
            .open(&path)?;
        
        Ok(Self {
            file: std::sync::Mutex::new(file),
            path,
        })
    }
}

impl LogWriter for FileWriter {
    fn write(&self, data: &[u8]) -> Result<(), LoggerError> {
        let mut file = self.file.lock().map_err(|_| {
            LoggerError::InternalError("Failed to lock file mutex".to_string())
        })?;
        
        file.write_all(data)?;
        Ok(())
    }
    
    fn write_batch(&self, data_list: &[Vec<u8>]) -> Result<(), LoggerError> {
        let mut file = self.file.lock().map_err(|_| {
            LoggerError::InternalError("Failed to lock file mutex".to_string())
        })?;
        
        for data in data_list {
            file.write_all(data)?;
        }
        Ok(())
    }
    
    fn flush(&self) -> Result<(), LoggerError> {
        let mut file = self.file.lock().map_err(|_| {
            LoggerError::InternalError("Failed to lock file mutex".to_string())
        })?;
        
        file.flush()?;
        Ok(())
    }
    
    fn shutdown(&self) -> Result<(), LoggerError> {
        self.flush()
    }
}

/// 滚动文件写入器
///
/// 支持文件大小限制和滚动的文件写入器。
pub struct RollingFileWriter {
    inner: std::sync::Mutex<RollingFileWriterInner>,
}

struct RollingFileWriterInner {
    file: File,
    base_path: std::path::PathBuf,
    max_size: u64,
    max_files: usize,
    current_size: u64,
}

impl RollingFileWriter {
    /// 创建一个新的滚动文件写入器
    ///
    /// # 参数
    /// * `base_path` - 基础文件路径
    /// * `max_size` - 单个文件最大大小（字节）
    /// * `max_files` - 保留的文件数量
    ///
    /// # 示例
    /// ```
    /// use async_logger::RollingFileWriter;
    ///
    /// // 每个文件最大 10MB，保留 5 个文件
    /// let writer = RollingFileWriter::new("/var/log/app.log", 10 * 1024 * 1024, 5).unwrap();
    /// ```
    pub fn new<P: AsRef<Path>>(
        base_path: P,
        max_size: u64,
        max_files: usize,
    ) -> Result<Self, LoggerError> {
        let base_path = base_path.as_ref().to_path_buf();
        
        // 确保目录存在
        if let Some(parent) = base_path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        
        // 检查现有文件大小
        let (file, current_size) = if base_path.exists() {
            let metadata = std::fs::metadata(&base_path)?;
            let file = File::options().append(true).open(&base_path)?;
            (file, metadata.len())
        } else {
            let file = File::options()
                .create(true)
                .append(true)
                .open(&base_path)?;
            (file, 0)
        };
        
        let inner = RollingFileWriterInner {
            file,
            base_path,
            max_size,
            max_files,
            current_size,
        };
        
        Ok(Self {
            inner: std::sync::Mutex::new(inner),
        })
    }

    /// 滚动文件
    fn roll_files(&self, inner: &mut RollingFileWriterInner) -> Result<(), LoggerError> {
        // 关闭当前文件
        drop(&inner.file);
        
        // 重命名现有文件
        for i in (1..inner.max_files).rev() {
            let old_path = Self::get_rotated_path(&inner.base_path, i - 1);
            let new_path = Self::get_rotated_path(&inner.base_path, i);
            
            if old_path.exists() {
                std::fs::rename(&old_path, &new_path)?;
            }
        }
        
        // 重命名当前文件
        let rotated_path = Self::get_rotated_path(&inner.base_path, 0);
        if inner.base_path.exists() {
            std::fs::rename(&inner.base_path, &rotated_path)?;
        }
        
        // 删除超过 max_files 的文件
        let excess_path = Self::get_rotated_path(&inner.base_path, inner.max_files);
        if excess_path.exists() {
            std::fs::remove_file(excess_path)?;
        }
        
        // 创建新文件
        inner.file = File::options()
            .create(true)
            .append(true)
            .open(&inner.base_path)?;
        inner.current_size = 0;
        
        Ok(())
    }

    /// 获取滚动文件路径
    fn get_rotated_path(base_path: &std::path::Path, index: usize) -> std::path::PathBuf {
        let file_name = base_path
            .file_name()
            .unwrap_or_else(|| std::ffi::OsStr::new("app.log"))
            .to_string_lossy();
        
        let new_file_name = format!("{}.{}", file_name, index);
        base_path.with_file_name(new_file_name)
    }
}

impl LogWriter for RollingFileWriter {
    fn write(&self, data: &[u8]) -> Result<(), LoggerError> {
        let mut inner = self.inner.lock().map_err(|_| {
            LoggerError::InternalError("Failed to lock rolling file writer mutex".to_string())
        })?;
        
        // 检查是否需要滚动文件
        if inner.current_size + data.len() as u64 > inner.max_size {
            self.roll_files(&mut inner)?;
        }
        
        inner.file.write_all(data)?;
        inner.current_size += data.len() as u64;
        
        Ok(())
    }
    
    fn flush(&self) -> Result<(), LoggerError> {
        let mut inner = self.inner.lock().map_err(|_| {
            LoggerError::InternalError("Failed to lock rolling file writer mutex".to_string())
        })?;
        
        inner.file.flush()?;
        Ok(())
    }
    
    fn shutdown(&self) -> Result<(), LoggerError> {
        self.flush()
    }
}

/// 写入器工厂
///
/// 根据配置创建相应的写入器。
pub struct WriterFactory;

impl WriterFactory {
    /// 根据输出目标创建写入器
    ///
    /// # 参数
    /// * `target` - 输出目标
    ///
    /// # 示例
    /// ```
    /// use async_logger::{WriterFactory, OutputTarget};
    ///
    /// let writer = WriterFactory::create(OutputTarget::Stdout);
    /// ```
    pub fn create(target: &OutputTarget) -> Result<Box<dyn LogWriter>, LoggerError> {
        match target {
            OutputTarget::Stdout => Ok(Box::new(StdoutWriter)),
            OutputTarget::Stderr => Ok(Box::new(StderrWriter)),
            OutputTarget::File(path) => Ok(Box::new(FileWriter::new(path)?)),
            OutputTarget::RollingFile {
                base_path,
                max_size,
                max_files,
            } => Ok(Box::new(RollingFileWriter::new(
                base_path,
                *max_size,
                *max_files,
            )?)),
        }
    }
}

/// 异步批量写入器
///
/// 使用后台任务批量写入日志，提高性能。
pub struct AsyncBatchWriter {
    inner: Arc<AsyncBatchWriterInner>,
    handle: Option<JoinHandle<()>>,
}

struct AsyncBatchWriterInner {
    writer: Box<dyn LogWriter>,
    batch_size: usize,
    is_running: AtomicBool,
    flush_notify: Notify,
    shutdown_notify: Notify,
    bytes_written: AtomicU64,
}

impl AsyncBatchWriter {
    /// 创建一个新的异步批量写入器
    ///
    /// # 参数
    /// * `writer` - 底层写入器
    /// * `batch_size` - 批量大小
    ///
    /// # 示例
    /// ```
    /// use async_logger::{AsyncBatchWriter, StdoutWriter};
    ///
    /// let writer = AsyncBatchWriter::new(Box::new(StdoutWriter), 100);
    /// ```
    pub fn new(writer: Box<dyn LogWriter>, batch_size: usize) -> Self {
        let inner = Arc::new(AsyncBatchWriterInner {
            writer,
            batch_size,
            is_running: AtomicBool::new(true),
            flush_notify: Notify::new(),
            shutdown_notify: Notify::new(),
            bytes_written: AtomicU64::new(0),
        });
        
        // 启动后台写入任务
        let inner_clone = inner.clone();
        let handle = tokio::spawn(async move {
            Self::background_writer(inner_clone).await;
        });
        
        Self {
            inner,
            handle: Some(handle),
        }
    }

    /// 后台写入任务
    async fn background_writer(inner: Arc<AsyncBatchWriterInner>) {
        while inner.is_running.load(Ordering::Relaxed) {
            tokio::select! {
                _ = inner.flush_notify.notified() => {
                    // 触发刷新
                    let _ = inner.writer.flush();
                }
                _ = inner.shutdown_notify.notified() => {
                    // 收到关闭信号
                    break;
                }
            }
        }
        
        // 最终刷新
        let _ = inner.writer.flush();
        inner.is_running.store(false, Ordering::Relaxed);
    }

    /// 获取已写入的字节数
    pub fn bytes_written(&self) -> u64 {
        self.inner.bytes_written.load(Ordering::Relaxed)
    }
}

impl LogWriter for AsyncBatchWriter {
    fn write(&self, data: &[u8]) -> Result<(), LoggerError> {
        self.inner.writer.write(data)?;
        self.inner.bytes_written.fetch_add(data.len() as u64, Ordering::Relaxed);
        Ok(())
    }
    
    fn write_batch(&self, data_list: &[Vec<u8>]) -> Result<(), LoggerError> {
        self.inner.writer.write_batch(data_list)?;
        
        // 更新字节计数
        let total_bytes: u64 = data_list.iter().map(|d| d.len() as u64).sum();
        self.inner.bytes_written.fetch_add(total_bytes, Ordering::Relaxed);
        
        Ok(())
    }
    
    fn flush(&self) -> Result<(), LoggerError> {
        self.inner.flush_notify.notify_one();
        Ok(())
    }
    
    fn shutdown(&self) -> Result<(), LoggerError> {
        self.inner.is_running.store(false, Ordering::Relaxed);
        self.inner.shutdown_notify.notify_one();
        self.inner.writer.shutdown()
    }
}

impl Drop for AsyncBatchWriter {
    fn drop(&mut self) {
        let _ = self.shutdown();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_stdout_writer() {
        let writer = StdoutWriter;
        
        // 简单测试写入
        let result = writer.write(b"Test log message\n");
        assert!(result.is_ok());
        
        let result = writer.flush();
        assert!(result.is_ok());
    }

    #[test]
    fn test_stderr_writer() {
        let writer = StderrWriter;
        
        // 简单测试写入
        let result = writer.write(b"Test error message\n");
        assert!(result.is_ok());
        
        let result = writer.flush();
        assert!(result.is_ok());
    }

    #[test]
    fn test_file_writer() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("test.log");
        
        let writer = FileWriter::new(&file_path).unwrap();
        
        // 写入测试数据
        writer.write(b"Line 1\n").unwrap();
        writer.write(b"Line 2\n").unwrap();
        writer.flush().unwrap();
        
        // 验证文件内容
        let content = std::fs::read_to_string(&file_path).unwrap();
        assert_eq!(content, "Line 1\nLine 2\n");
    }

    #[test]
    fn test_file_writer_batch() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("test_batch.log");
        
        let writer = FileWriter::new(&file_path).unwrap();
        
        // 批量写入
        let data_list = vec![
            b"Batch line 1\n".to_vec(),
            b"Batch line 2\n".to_vec(),
            b"Batch line 3\n".to_vec(),
        ];
        
        writer.write_batch(&data_list).unwrap();
        writer.flush().unwrap();
        
        // 验证文件内容
        let content = std::fs::read_to_string(&file_path).unwrap();
        assert_eq!(content, "Batch line 1\nBatch line 2\nBatch line 3\n");
    }

    #[test]
    fn test_rolling_file_writer() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("rolling.log");
        
        // 创建滚动写入器，每个文件最大 20 字节，保留 3 个文件
        let writer = RollingFileWriter::new(&file_path, 20, 3).unwrap();
        
        // 写入数据
        writer.write(b"1234567890\n").unwrap(); // 11 字节
        writer.write(b"abcdefghij\n").unwrap(); // 11 字节，应该触发滚动
        writer.write(b"klmnopqrst\n").unwrap(); // 11 字节
        writer.flush().unwrap();
        
        // 验证文件存在
        assert!(file_path.exists()); // 当前文件
        assert!(file_path.with_file_name("rolling.log.0").exists()); // 第一个滚动文件
        
        // 验证内容
        let current_content = std::fs::read_to_string(&file_path).unwrap();
        assert!(current_content.contains("klmnopqrst"));
        
        let rotated_content = std::fs::read_to_string(file_path.with_file_name("rolling.log.0")).unwrap();
        assert!(rotated_content.contains("1234567890"));
        assert!(rotated_content.contains("abcdefghij"));
    }

    #[test]
    fn test_writer_factory() {
        // 测试标准输出
        let stdout_writer = WriterFactory::create(&OutputTarget::Stdout);
        assert!(stdout_writer.is_ok());
        
        // 测试标准错误
        let stderr_writer = WriterFactory::create(&OutputTarget::Stderr);
        assert!(stderr_writer.is_ok());
        
        // 测试文件
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("test.log");
        
        let file_writer = WriterFactory::create(&OutputTarget::File(file_path.clone()));
        assert!(file_writer.is_ok());
        
        // 测试滚动文件
        let rolling_writer = WriterFactory::create(&OutputTarget::RollingFile {
            base_path: file_path,
            max_size: 1024,
            max_files: 5,
        });
        assert!(rolling_writer.is_ok());
    }
}
