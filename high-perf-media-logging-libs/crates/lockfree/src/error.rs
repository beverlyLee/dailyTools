//! 无锁数据结构的错误类型

use thiserror::Error;

/// 无锁队列操作错误
#[derive(Error, Debug, PartialEq, Eq)]
pub enum QueueError {
    /// 队列已满
    #[error("Queue is full")]
    Full,
    
    /// 队列为空
    #[error("Queue is empty")]
    Empty,
    
    /// 操作超时
    #[error("Operation timed out")]
    Timeout,
    
    /// 内部错误
    #[error("Internal error: {0}")]
    Internal(String),
}
