//! 同步原语
//!
//! 该模块提供了一些高性能的同步原语，适用于高并发场景。

use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::Arc;
use tokio::sync::Notify;

/// 高性能自旋锁
///
/// 基于 CAS 操作的自旋锁，适用于锁持有时间短的场景。
pub struct SpinLock {
    locked: AtomicBool,
}

impl SpinLock {
    /// 创建一个新的自旋锁
    ///
    /// # 示例
    /// ```
    /// use lockfree::SpinLock;
    ///
    /// let lock = SpinLock::new();
    /// ```
    pub fn new() -> Self {
        Self {
            locked: AtomicBool::new(false),
        }
    }

    /// 获取锁
    ///
    /// 如果锁已被持有，将自旋等待直到获取锁。
    ///
    /// # 示例
    /// ```
    /// use lockfree::SpinLock;
    ///
    /// let lock = SpinLock::new();
    /// lock.lock();
    /// // 临界区
    /// lock.unlock();
    /// ```
    pub fn lock(&self) {
        loop {
            if self.try_lock() {
                return;
            }
            while self.locked.load(Ordering::Relaxed) {
                std::hint::spin_loop();
            }
        }
    }

    /// 尝试获取锁
    ///
    /// 如果锁可用，立即获取并返回 true；否则返回 false。
    ///
    /// # 示例
    /// ```
    /// use lockfree::SpinLock;
    ///
    /// let lock = SpinLock::new();
    /// assert!(lock.try_lock());
    /// lock.unlock();
    /// ```
    pub fn try_lock(&self) -> bool {
        !self.locked.swap(true, Ordering::Acquire)
    }

    /// 释放锁
    ///
    /// # 示例
    /// ```
    /// use lockfree::SpinLock;
    ///
    /// let lock = SpinLock::new();
    /// lock.lock();
    /// // 临界区
    /// lock.unlock();
    /// ```
    pub fn unlock(&self) {
        self.locked.store(false, Ordering::Release);
    }
}

impl Default for SpinLock {
    fn default() -> Self {
        Self::new()
    }
}

/// 高性能读写锁
///
/// 基于原子操作的读写锁，允许多个读者或单个写者。
pub struct RwLock {
    state: AtomicUsize,
}

impl RwLock {
    /// 创建一个新的读写锁
    ///
    /// # 示例
    /// ```
    /// use lockfree::RwLock;
    ///
    /// let rwlock = RwLock::new();
    /// ```
    pub fn new() -> Self {
        Self {
            state: AtomicUsize::new(0),
        }
    }

    /// 获取读锁
    ///
    /// 如果有写者持有锁，将等待直到写锁释放。
    ///
    /// # 示例
    /// ```
    /// use lockfree::RwLock;
    ///
    /// let rwlock = RwLock::new();
    /// rwlock.read();
    /// // 读临界区
    /// rwlock.read_unlock();
    /// ```
    pub fn read(&self) {
        loop {
            let state = self.state.load(Ordering::Relaxed);
            if state & (1 << (usize::BITS - 1)) == 0 {
                if self
                    .state
                    .compare_exchange_weak(state, state + 1, Ordering::Acquire, Ordering::Relaxed)
                    .is_ok()
                {
                    return;
                }
            }
            std::hint::spin_loop();
        }
    }

    /// 尝试获取读锁
    ///
    /// 如果读锁可用，立即获取并返回 true；否则返回 false。
    ///
    /// # 示例
    /// ```
    /// use lockfree::RwLock;
    ///
    /// let rwlock = RwLock::new();
    /// assert!(rwlock.try_read());
    /// rwlock.read_unlock();
    /// ```
    pub fn try_read(&self) -> bool {
        let state = self.state.load(Ordering::Relaxed);
        if state & (1 << (usize::BITS - 1)) == 0 {
            self.state
                .compare_exchange_weak(state, state + 1, Ordering::Acquire, Ordering::Relaxed)
                .is_ok()
        } else {
            false
        }
    }

    /// 释放读锁
    ///
    /// # 示例
    /// ```
    /// use lockfree::RwLock;
    ///
    /// let rwlock = RwLock::new();
    /// rwlock.read();
    /// // 读临界区
    /// rwlock.read_unlock();
    /// ```
    pub fn read_unlock(&self) {
        self.state.fetch_sub(1, Ordering::Release);
    }

    /// 获取写锁
    ///
    /// 如果有读者或写者持有锁，将等待直到所有锁释放。
    ///
    /// # 示例
    /// ```
    /// use lockfree::RwLock;
    ///
    /// let rwlock = RwLock::new();
    /// rwlock.write();
    /// // 写临界区
    /// rwlock.write_unlock();
    /// ```
    pub fn write(&self) {
        let writer_flag = 1 << (usize::BITS - 1);
        loop {
            let state = self.state.load(Ordering::Relaxed);
            if state == 0 {
                if self
                    .state
                    .compare_exchange_weak(0, writer_flag, Ordering::Acquire, Ordering::Relaxed)
                    .is_ok()
                {
                    return;
                }
            }
            std::hint::spin_loop();
        }
    }

    /// 尝试获取写锁
    ///
    /// 如果写锁可用，立即获取并返回 true；否则返回 false。
    ///
    /// # 示例
    /// ```
    /// use lockfree::RwLock;
    ///
    /// let rwlock = RwLock::new();
    /// assert!(rwlock.try_write());
    /// rwlock.write_unlock();
    /// ```
    pub fn try_write(&self) -> bool {
        let writer_flag = 1 << (usize::BITS - 1);
        self.state
            .compare_exchange(0, writer_flag, Ordering::Acquire, Ordering::Relaxed)
            .is_ok()
    }

    /// 释放写锁
    ///
    /// # 示例
    /// ```
    /// use lockfree::RwLock;
    ///
    /// let rwlock = RwLock::new();
    /// rwlock.write();
    /// // 写临界区
    /// rwlock.write_unlock();
    /// ```
    pub fn write_unlock(&self) {
        self.state.store(0, Ordering::Release);
    }
}

impl Default for RwLock {
    fn default() -> Self {
        Self::new()
    }
}

/// 异步一次性初始化器
///
/// 用于确保某个操作只执行一次，适用于异步场景。
pub struct AsyncOnce {
    initialized: AtomicBool,
    notify: Notify,
}

impl AsyncOnce {
    /// 创建一个新的异步一次性初始化器
    ///
    /// # 示例
    /// ```
    /// use lockfree::AsyncOnce;
    ///
    /// let once = AsyncOnce::new();
    /// ```
    pub fn new() -> Self {
        Self {
            initialized: AtomicBool::new(false),
            notify: Notify::new(),
        }
    }

    /// 执行初始化操作
    ///
    /// 如果初始化已经完成，立即返回；否则执行初始化函数并等待完成。
    ///
    /// # 参数
    /// * `f` - 初始化函数
    ///
    /// # 示例
    /// ```
    /// use lockfree::AsyncOnce;
    /// use tokio;
    ///
    /// #[tokio::main]
    /// async fn main() {
    ///     let once = AsyncOnce::new();
    ///     let mut count = 0;
    ///     
    ///     once.call_once(|| async {
    ///         count += 1;
    ///     }).await;
    ///     
    ///     // count 只会增加一次
    /// }
    /// ```
    pub async fn call_once<F, Fut>(&self, f: F)
    where
        F: FnOnce() -> Fut,
        Fut: std::future::Future<Output = ()>,
    {
        if self.initialized.load(Ordering::Acquire) {
            return;
        }

        if self
            .initialized
            .compare_exchange(false, true, Ordering::AcqRel, Ordering::Relaxed)
            .is_ok()
        {
            f().await;
            self.notify.notify_waiters();
        } else {
            while !self.initialized.load(Ordering::Acquire) {
                self.notify.notified().await;
            }
        }
    }

    /// 检查是否已经初始化
    ///
    /// # 示例
    /// ```
    /// use lockfree::AsyncOnce;
    ///
    /// let once = AsyncOnce::new();
    /// assert!(!once.is_initialized());
    /// ```
    pub fn is_initialized(&self) -> bool {
        self.initialized.load(Ordering::Acquire)
    }
}

impl Default for AsyncOnce {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicUsize, Ordering};
    use std::sync::Arc;

    #[test]
    fn test_spin_lock_basic() {
        let lock = SpinLock::new();
        
        lock.lock();
        assert!(!lock.try_lock());
        lock.unlock();
        
        assert!(lock.try_lock());
        lock.unlock();
    }

    #[test]
    fn test_spin_lock_concurrent() {
        let lock = Arc::new(SpinLock::new());
        let counter = Arc::new(AtomicUsize::new(0));
        
        let mut handles = vec![];
        
        for _ in 0..10 {
            let lock = lock.clone();
            let counter = counter.clone();
            handles.push(std::thread::spawn(move || {
                for _ in 0..1000 {
                    lock.lock();
                    counter.fetch_add(1, Ordering::Relaxed);
                    lock.unlock();
                }
            }));
        }
        
        for handle in handles {
            handle.join().unwrap();
        }
        
        assert_eq!(counter.load(Ordering::Relaxed), 10000);
    }

    #[test]
    fn test_rwlock_basic() {
        let rwlock = RwLock::new();
        
        // 多个读者可以同时持有锁
        rwlock.read();
        assert!(rwlock.try_read());
        rwlock.read_unlock();
        rwlock.read_unlock();
        
        // 写者独占锁
        rwlock.write();
        assert!(!rwlock.try_read());
        assert!(!rwlock.try_write());
        rwlock.write_unlock();
    }

    #[test]
    fn test_rwlock_concurrent_read() {
        let rwlock = Arc::new(RwLock::new());
        let counter = Arc::new(AtomicUsize::new(0));
        
        let mut handles = vec![];
        
        for _ in 0..10 {
            let rwlock = rwlock.clone();
            let counter = counter.clone();
            handles.push(std::thread::spawn(move || {
                for _ in 0..1000 {
                    rwlock.read();
                    let _ = counter.load(Ordering::Relaxed);
                    rwlock.read_unlock();
                }
            }));
        }
        
        for handle in handles {
            handle.join().unwrap();
        }
    }

    #[test]
    fn test_rwlock_concurrent_write() {
        let rwlock = Arc::new(RwLock::new());
        let counter = Arc::new(AtomicUsize::new(0));
        
        let mut handles = vec![];
        
        for _ in 0..10 {
            let rwlock = rwlock.clone();
            let counter = counter.clone();
            handles.push(std::thread::spawn(move || {
                for _ in 0..1000 {
                    rwlock.write();
                    counter.fetch_add(1, Ordering::Relaxed);
                    rwlock.write_unlock();
                }
            }));
        }
        
        for handle in handles {
            handle.join().unwrap();
        }
        
        assert_eq!(counter.load(Ordering::Relaxed), 10000);
    }

    #[tokio::test]
    async fn test_async_once_basic() {
        let once = Arc::new(AsyncOnce::new());
        let counter = Arc::new(AtomicUsize::new(0));
        
        let mut handles = vec![];
        
        for _ in 0..10 {
            let once = once.clone();
            let counter = counter.clone();
            handles.push(tokio::spawn(async move {
                once.call_once(|| async {
                    counter.fetch_add(1, Ordering::Relaxed);
                })
                .await;
            }));
        }
        
        for handle in handles {
            handle.await.unwrap();
        }
        
        assert_eq!(counter.load(Ordering::Relaxed), 1);
        assert!(once.is_initialized());
    }
}
