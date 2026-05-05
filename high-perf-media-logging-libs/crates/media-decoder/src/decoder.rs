//! 视频解码器核心实现
//!
//! 该模块提供了高性能异步视频解码器的核心实现，
//! 支持硬件加速和零拷贝。

use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;
use std::time::Duration;

use lockfree::queue::AsyncBoundedQueue;
use serde::{Deserialize, Serialize};
use tokio::task::JoinHandle;

use crate::config::DecoderConfig;
use crate::error::DecoderError;
use crate::format::{PixelFormat, VideoCodec};
use crate::frame::{EncodedPacket, VideoFrame};
use crate::platform::{PlatformDecoder, PlatformManager};
use crate::texture::{Texture, TextureDescriptor};

/// 解码器状态
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum DecoderState {
    /// 未初始化
    Uninitialized,
    /// 已初始化
    Initialized,
    /// 正在解码
    Decoding,
    /// 已暂停
    Paused,
    /// 正在关闭
    Closing,
    /// 已关闭
    Closed,
    /// 发生错误
    Error,
}

/// 解码器统计信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DecoderStatistics {
    /// 已解码帧数
    pub frames_decoded: u64,
    /// 已接收数据包数
    pub packets_received: u64,
    /// 已输出帧数
    pub frames_output: u64,
    /// 平均解码时间（毫秒）
    pub avg_decode_time_ms: f64,
    /// 当前队列中的数据包数
    pub input_queue_depth: usize,
    /// 当前队列中的帧数
    pub output_queue_depth: usize,
    /// 解码帧率
    pub current_fps: f64,
}

impl DecoderStatistics {
    /// 创建一个新的统计信息
    pub fn new() -> Self {
        Self {
            frames_decoded: 0,
            packets_received: 0,
            frames_output: 0,
            avg_decode_time_ms: 0.0,
            input_queue_depth: 0,
            output_queue_depth: 0,
            current_fps: 0.0,
        }
    }
}

impl Default for DecoderStatistics {
    fn default() -> Self {
        Self::new()
    }
}

/// 异步视频解码器
///
/// 高性能异步视频解码器，支持硬件加速和零拷贝。
pub struct AsyncVideoDecoder {
    /// 解码器配置
    config: DecoderConfig,
    /// 平台解码器
    platform_decoder: Option<Box<dyn PlatformDecoder>>,
    /// 输入队列
    input_queue: Arc<AsyncBoundedQueue<EncodedPacket>>,
    /// 输出队列
    output_queue: Arc<AsyncBoundedQueue<VideoFrame>>,
    /// 后台解码任务句柄
    decode_task: Option<JoinHandle<()>>,
    /// 解码器状态
    state: Arc<std::sync::RwLock<DecoderState>>,
    /// 是否正在运行
    is_running: Arc<AtomicBool>,
    /// 统计信息
    statistics: DecoderStatisticsInner,
    /// 平台管理器
    platform_manager: PlatformManager,
}

/// 统计信息内部结构（线程安全）
struct DecoderStatisticsInner {
    frames_decoded: AtomicU64,
    packets_received: AtomicU64,
    frames_output: AtomicU64,
    total_decode_time_ns: AtomicU64,
}

impl DecoderStatisticsInner {
    fn new() -> Self {
        Self {
            frames_decoded: AtomicU64::new(0),
            packets_received: AtomicU64::new(0),
            frames_output: AtomicU64::new(0),
            total_decode_time_ns: AtomicU64::new(0),
        }
    }

    fn increment_frames_decoded(&self) {
        self.frames_decoded.fetch_add(1, Ordering::Relaxed);
    }

    fn increment_packets_received(&self) {
        self.packets_received.fetch_add(1, Ordering::Relaxed);
    }

    fn increment_frames_output(&self) {
        self.frames_output.fetch_add(1, Ordering::Relaxed);
    }

    fn add_decode_time(&self, duration: Duration) {
        let ns = duration.as_nanos() as u64;
        self.total_decode_time_ns.fetch_add(ns, Ordering::Relaxed);
    }

    fn get_statistics(&self, input_depth: usize, output_depth: usize) -> DecoderStatistics {
        let frames_decoded = self.frames_decoded.load(Ordering::Relaxed);
        let total_time_ns = self.total_decode_time_ns.load(Ordering::Relaxed);

        let avg_decode_time_ms = if frames_decoded > 0 {
            total_time_ns as f64 / frames_decoded as f64 / 1_000_000.0
        } else {
            0.0
        };

        DecoderStatistics {
            frames_decoded,
            packets_received: self.packets_received.load(Ordering::Relaxed),
            frames_output: self.frames_output.load(Ordering::Relaxed),
            avg_decode_time_ms,
            input_queue_depth: input_depth,
            output_queue_depth: output_depth,
            current_fps: 0.0,
        }
    }
}

impl AsyncVideoDecoder {
    /// 创建一个新的异步视频解码器
    ///
    /// # 参数
    /// * `config` - 解码器配置
    pub fn new(config: DecoderConfig) -> Result<Self, DecoderError> {
        let platform_manager = PlatformManager::new();

        let input_queue = Arc::new(AsyncBoundedQueue::new(config.input_queue_capacity()));
        let output_queue = Arc::new(AsyncBoundedQueue::new(config.output_queue_capacity()));

        Ok(Self {
            config,
            platform_decoder: None,
            input_queue,
            output_queue,
            decode_task: None,
            state: Arc::new(std::sync::RwLock::new(DecoderState::Uninitialized)),
            is_running: Arc::new(AtomicBool::new(false)),
            statistics: DecoderStatisticsInner::new(),
            platform_manager,
        })
    }

    /// 使用默认配置创建解码器
    pub fn with_defaults() -> Result<Self, DecoderError> {
        Self::new(DecoderConfig::default())
    }

    /// 初始化解码器
    pub async fn initialize(&mut self) -> Result<(), DecoderError> {
        {
            let state = self.state.read().unwrap();
            if *state != DecoderState::Uninitialized {
                return Err(DecoderError::InitializationError(
                    "Decoder already initialized".to_string(),
                ));
            }
        }

        // 创建平台解码器
        let platform_decoder = self.platform_manager.create_decoder(&self.config)?;
        self.platform_decoder = Some(platform_decoder);

        // 初始化平台解码器
        if let Some(decoder) = &mut self.platform_decoder {
            decoder.initialize(&self.config)?;
        }

        // 更新状态
        {
            let mut state = self.state.write().unwrap();
            *state = DecoderState::Initialized;
        }

        Ok(())
    }

    /// 启动后台解码任务
    pub async fn start(&mut self) -> Result<(), DecoderError> {
        {
            let state = self.state.read().unwrap();
            if *state != DecoderState::Initialized {
                return Err(DecoderError::ConfigurationError(
                    "Decoder not initialized".to_string(),
                ));
            }
        }

        self.is_running.store(true, Ordering::Relaxed);

        let input_queue = Arc::clone(&self.input_queue);
        let output_queue = Arc::clone(&self.output_queue);
        let is_running = Arc::clone(&self.is_running);
        let state = Arc::clone(&self.state);
        let config = self.config.clone();
        let platform_manager = PlatformManager::new();

        // 启动后台解码任务
        let handle = tokio::spawn(async move {
            let mut decoder = match platform_manager.create_decoder(&config) {
                Ok(d) => d,
                Err(e) => {
                    eprintln!("Failed to create decoder: {}", e);
                    return;
                }
            };

            if let Err(e) = decoder.initialize(&config) {
                eprintln!("Failed to initialize decoder: {}", e);
                return;
            }

            {
                let mut s = state.write().unwrap();
                *s = DecoderState::Decoding;
            }

            while is_running.load(Ordering::Relaxed) {
                match input_queue.pop_timeout(Duration::from_millis(100)).await {
                    Ok(packet) => {
                        let start = std::time::Instant::now();
                        match decoder.decode(&packet) {
                            Ok(Some(frame)) => {
                                let _ = output_queue.push(frame).await;
                            }
                            Ok(None) => {
                                // 没有可用帧，继续
                            }
                            Err(e) => {
                                eprintln!("Decode error: {}", e);
                            }
                        }
                    }
                    Err(_) => {
                        // 超时，继续循环
                    }
                }
            }

            // 刷新解码器
            if let Ok(frames) = decoder.flush() {
                for frame in frames {
                    let _ = output_queue.push(frame).await;
                }
            }

            decoder.destroy();

            {
                let mut s = state.write().unwrap();
                *s = DecoderState::Closed;
            }
        });

        self.decode_task = Some(handle);

        Ok(())
    }

    /// 异步发送数据包到解码器
    ///
    /// # 参数
    /// * `packet` - 编码数据包
    pub async fn send_packet(&self, packet: EncodedPacket) -> Result<(), DecoderError> {
        {
            let state = self.state.read().unwrap();
            if *state == DecoderState::Closed || *state == DecoderState::Error {
                return Err(DecoderError::DecoderClosed);
            }
        }

        self.statistics.increment_packets_received();

        match self
            .input_queue
            .push_timeout(packet, self.config.decode_timeout())
            .await
        {
            Ok(_) => Ok(()),
            Err(_) => Err(DecoderError::QueueFull),
        }
    }

    /// 尝试非阻塞发送数据包
    pub fn try_send_packet(&self, packet: EncodedPacket) -> Result<(), DecoderError> {
        {
            let state = self.state.read().unwrap();
            if *state == DecoderState::Closed || *state == DecoderState::Error {
                return Err(DecoderError::DecoderClosed);
            }
        }

        self.statistics.increment_packets_received();

        match self.input_queue.try_push(packet) {
            Ok(_) => Ok(()),
            Err(_) => Err(DecoderError::QueueFull),
        }
    }

    /// 异步接收解码后的帧
    ///
    /// # 返回值
    /// 解码后的视频帧
    pub async fn receive_frame(&self) -> Result<VideoFrame, DecoderError> {
        {
            let state = self.state.read().unwrap();
            if *state == DecoderState::Closed && self.output_queue.is_empty() {
                return Err(DecoderError::DecoderClosed);
            }
        }

        match self
            .output_queue
            .pop_timeout(self.config.decode_timeout())
            .await
        {
            Ok(frame) => {
                self.statistics.increment_frames_output();
                Ok(frame)
            }
            Err(_) => Err(DecoderError::Timeout),
        }
    }

    /// 尝试非阻塞接收帧
    pub fn try_receive_frame(&self) -> Result<Option<VideoFrame>, DecoderError> {
        {
            let state = self.state.read().unwrap();
            if *state == DecoderState::Closed && self.output_queue.is_empty() {
                return Err(DecoderError::DecoderClosed);
            }
        }

        match self.output_queue.try_pop() {
            Ok(Some(frame)) => {
                self.statistics.increment_frames_output();
                Ok(Some(frame))
            }
            Ok(None) => Ok(None),
            Err(_) => Err(DecoderError::QueueEmpty),
        }
    }

    /// 暂停解码
    pub fn pause(&self) -> Result<(), DecoderError> {
        {
            let mut state = self.state.write().unwrap();
            if *state != DecoderState::Decoding {
                return Err(DecoderError::ConfigurationError(format!(
                    "Cannot pause from state: {:?}",
                    *state
                )));
            }
            *state = DecoderState::Paused;
        }
        Ok(())
    }

    /// 恢复解码
    pub fn resume(&self) -> Result<(), DecoderError> {
        {
            let mut state = self.state.write().unwrap();
            if *state != DecoderState::Paused {
                return Err(DecoderError::ConfigurationError(format!(
                    "Cannot resume from state: {:?}",
                    *state
                )));
            }
            *state = DecoderState::Decoding;
        }
        Ok(())
    }

    /// 刷新解码器
    ///
    /// 输出所有缓冲的帧。
    pub async fn flush(&mut self) -> Result<Vec<VideoFrame>, DecoderError> {
        if let Some(decoder) = &mut self.platform_decoder {
            let frames = decoder.flush()?;
            Ok(frames)
        } else {
            Ok(vec![])
        }
    }

    /// 重置解码器
    pub async fn reset(&mut self) -> Result<(), DecoderError> {
        // 清空队列
        while let Ok(_) = self.input_queue.try_pop() {}
        while let Ok(_) = self.output_queue.try_pop() {}

        // 重置平台解码器
        if let Some(decoder) = &mut self.platform_decoder {
            decoder.reset()?;
        }

        {
            let mut state = self.state.write().unwrap();
            *state = DecoderState::Initialized;
        }

        Ok(())
    }

    /// 停止解码器
    pub async fn stop(&mut self) -> Result<(), DecoderError> {
        self.is_running.store(false, Ordering::Relaxed);

        // 等待后台任务完成
        if let Some(handle) = self.decode_task.take() {
            let _ = handle.await;
        }

        // 销毁平台解码器
        if let Some(decoder) = &mut self.platform_decoder {
            decoder.destroy();
        }

        {
            let mut state = self.state.write().unwrap();
            *state = DecoderState::Closed;
        }

        Ok(())
    }

    /// 获取当前状态
    pub fn state(&self) -> DecoderState {
        let state = self.state.read().unwrap();
        *state
    }

    /// 获取统计信息
    pub fn statistics(&self) -> DecoderStatistics {
        self.statistics.get_statistics(
            self.input_queue.len(),
            self.output_queue.len(),
        )
    }

    /// 获取配置
    pub fn config(&self) -> &DecoderConfig {
        &self.config
    }

    /// 检查是否支持硬件加速
    pub fn is_hardware_accelerated(&self) -> bool {
        self.platform_decoder
            .as_ref()
            .map(|d| d.capability().supports_zero_copy)
            .unwrap_or(false)
    }

    /// 检查是否启用零拷贝
    pub fn is_zero_copy_enabled(&self) -> bool {
        self.platform_decoder
            .as_ref()
            .map(|d| d.is_zero_copy_enabled())
            .unwrap_or(false)
    }

    /// 获取输出格式
    pub fn output_format(&self) -> PixelFormat {
        self.platform_decoder
            .as_ref()
            .map(|d| d.output_format())
            .unwrap_or(self.config.output_format())
    }

    /// 获取编解码器
    pub fn codec(&self) -> VideoCodec {
        self.config.codec()
    }

    /// 获取输入队列深度
    pub fn input_queue_depth(&self) -> usize {
        self.input_queue.len()
    }

    /// 获取输出队列深度
    pub fn output_queue_depth(&self) -> usize {
        self.output_queue.len()
    }

    /// 检查解码器是否为空
    pub fn is_empty(&self) -> bool {
        self.input_queue.is_empty() && self.output_queue.is_empty()
    }

    /// 检查解码器是否已满
    pub fn is_full(&self) -> bool {
        self.input_queue.is_full()
    }
}

impl Drop for AsyncVideoDecoder {
    fn drop(&mut self) {
        self.is_running.store(false, Ordering::Relaxed);
        if let Some(decoder) = &mut self.platform_decoder {
            decoder.destroy();
        }
    }
}

/// 同步视频解码器包装器
///
/// 为同步使用场景提供的包装器。
pub struct VideoDecoder {
    inner: AsyncVideoDecoder,
    runtime: tokio::runtime::Runtime,
}

impl VideoDecoder {
    /// 创建一个新的同步视频解码器
    pub fn new(config: DecoderConfig) -> Result<Self, DecoderError> {
        let runtime = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .map_err(|e| DecoderError::InitializationError(format!("Failed to create runtime: {}", e)))?;

        let inner = AsyncVideoDecoder::new(config)?;

        Ok(Self { inner, runtime })
    }

    /// 初始化解码器
    pub fn initialize(&mut self) -> Result<(), DecoderError> {
        self.runtime.block_on(self.inner.initialize())
    }

    /// 启动解码器
    pub fn start(&mut self) -> Result<(), DecoderError> {
        self.runtime.block_on(self.inner.start())
    }

    /// 发送数据包
    pub fn send_packet(&self, packet: EncodedPacket) -> Result<(), DecoderError> {
        self.runtime.block_on(self.inner.send_packet(packet))
    }

    /// 接收帧
    pub fn receive_frame(&self) -> Result<VideoFrame, DecoderError> {
        self.runtime.block_on(self.inner.receive_frame())
    }

    /// 刷新解码器
    pub fn flush(&mut self) -> Result<Vec<VideoFrame>, DecoderError> {
        self.runtime.block_on(self.inner.flush())
    }

    /// 重置解码器
    pub fn reset(&mut self) -> Result<(), DecoderError> {
        self.runtime.block_on(self.inner.reset())
    }

    /// 停止解码器
    pub fn stop(&mut self) -> Result<(), DecoderError> {
        self.runtime.block_on(self.inner.stop())
    }

    /// 获取状态
    pub fn state(&self) -> DecoderState {
        self.inner.state()
    }

    /// 获取统计信息
    pub fn statistics(&self) -> DecoderStatistics {
        self.inner.statistics()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_decoder_creation() {
        let config = DecoderConfig::builder()
            .codec(VideoCodec::H264)
            .output_format(PixelFormat::NV12)
            .build();

        let decoder = AsyncVideoDecoder::new(config);
        assert!(decoder.is_ok());

        let mut decoder = decoder.unwrap();
        assert_eq!(decoder.state(), DecoderState::Uninitialized);
    }

    #[tokio::test]
    async fn test_decoder_initialization() {
        let config = DecoderConfig::builder()
            .codec(VideoCodec::H264)
            .output_format(PixelFormat::NV12)
            .hardware_acceleration_preference(HardwareAccelerationPreference::SoftwareOnly)
            .build();

        let mut decoder = AsyncVideoDecoder::new(config).unwrap();

        let result = decoder.initialize().await;
        assert!(result.is_ok());
        assert_eq!(decoder.state(), DecoderState::Initialized);
    }

    #[tokio::test]
    async fn test_decoder_packet_send_receive() {
        let config = DecoderConfig::builder()
            .codec(VideoCodec::H264)
            .output_format(PixelFormat::NV12)
            .target_resolution(1920, 1080)
            .hardware_acceleration_preference(HardwareAccelerationPreference::SoftwareOnly)
            .build();

        let mut decoder = AsyncVideoDecoder::new(config).unwrap();
        decoder.initialize().await.unwrap();
        decoder.start().await.unwrap();

        // 发送数据包
        let packet = EncodedPacket::new(vec![0x00, 0x00, 0x00, 0x01, 0x67, 0x42, 0x00, 0x1f]);
        let result = decoder.send_packet(packet).await;
        assert!(result.is_ok());

        // 等待解码
        tokio::time::sleep(Duration::from_millis(100)).await;

        // 尝试接收帧（可能没有实际解码数据）
        let _ = decoder.try_receive_frame();

        // 停止解码器
        decoder.stop().await.unwrap();
        assert_eq!(decoder.state(), DecoderState::Closed);
    }

    #[tokio::test]
    async fn test_decoder_statistics() {
        let config = DecoderConfig::builder()
            .codec(VideoCodec::H264)
            .output_format(PixelFormat::NV12)
            .hardware_acceleration_preference(HardwareAccelerationPreference::SoftwareOnly)
            .build();

        let decoder = AsyncVideoDecoder::new(config).unwrap();

        let stats = decoder.statistics();
        assert_eq!(stats.frames_decoded, 0);
        assert_eq!(stats.packets_received, 0);
        assert_eq!(stats.frames_output, 0);
        assert_eq!(stats.input_queue_depth, 0);
        assert_eq!(stats.output_queue_depth, 0);
    }

    #[test]
    fn test_decoder_state() {
        assert_eq!(DecoderState::Uninitialized as u8, 0);
        assert_eq!(DecoderState::Initialized as u8, 1);
        assert_eq!(DecoderState::Decoding as u8, 2);
        assert_eq!(DecoderState::Paused as u8, 3);
        assert_eq!(DecoderState::Closing as u8, 4);
        assert_eq!(DecoderState::Closed as u8, 5);
        assert_eq!(DecoderState::Error as u8, 6);
    }

    #[test]
    fn test_statistics_creation() {
        let stats = DecoderStatistics::new();
        assert_eq!(stats.frames_decoded, 0);
        assert_eq!(stats.packets_received, 0);
        assert_eq!(stats.frames_output, 0);
        assert_eq!(stats.avg_decode_time_ms, 0.0);
        assert_eq!(stats.input_queue_depth, 0);
        assert_eq!(stats.output_queue_depth, 0);
        assert_eq!(stats.current_fps, 0.0);
    }
}
