//! 视频解码器配置
//!
//! 该模块定义了视频解码器的配置选项，用于自定义解码行为。

use std::time::Duration;

use serde::{Deserialize, Serialize};

use crate::format::{PixelFormat, VideoCodec};

/// 硬件加速偏好
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum HardwareAccelerationPreference {
    /// 优先使用硬件加速，不可用时使用软件解码
    PreferHardware,
    /// 强制使用硬件加速，不可用时报错
    ForceHardware,
    /// 仅使用软件解码
    SoftwareOnly,
}

impl Default for HardwareAccelerationPreference {
    fn default() -> Self {
        HardwareAccelerationPreference::PreferHardware
    }
}

/// 零拷贝模式
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ZeroCopyMode {
    /// 启用零拷贝，解码后数据直接留在 GPU
    Enabled,
    /// 禁用零拷贝，解码后数据复制到 CPU 内存
    Disabled,
    /// 自动选择，根据输出格式决定
    Auto,
}

impl Default for ZeroCopyMode {
    fn default() -> Self {
        ZeroCopyMode::Auto
    }
}

/// 视频解码器配置
///
/// 用于配置视频解码器的各种行为。
///
/// # 示例
/// ```
/// use media_decoder::{DecoderConfig, VideoCodec, PixelFormat};
///
/// let config = DecoderConfig::builder()
///     .codec(VideoCodec::H264)
///     .output_format(PixelFormat::NV12)
///     .hardware_acceleration(true)
///     .build();
/// ```
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DecoderConfig {
    /// 视频编解码器
    codec: VideoCodec,
    
    /// 输出像素格式
    output_format: PixelFormat,
    
    /// 硬件加速偏好
    hardware_acceleration: HardwareAccelerationPreference,
    
    /// 零拷贝模式
    zero_copy_mode: ZeroCopyMode,
    
    /// 输入队列容量
    input_queue_capacity: usize,
    
    /// 输出队列容量
    output_queue_capacity: usize,
    
    /// 解码超时
    decode_timeout: Duration,
    
    /// 帧缓冲区数量
    frame_buffer_count: usize,
    
    /// 线程数量（用于软件解码）
    thread_count: usize,
    
    /// 低延迟模式
    low_latency: bool,
    
    /// 启用错误隐藏
    error_concealment: bool,
    
    /// 目标帧率（可选）
    target_fps: Option<f64>,
    
    /// 目标分辨率（可选）
    target_resolution: Option<(u32, u32)>,
}

impl DecoderConfig {
    /// 创建一个新的配置构建器
    ///
    /// # 示例
    /// ```
    /// use media_decoder::DecoderConfig;
    ///
    /// let config = DecoderConfig::builder().build();
    /// ```
    pub fn builder() -> DecoderConfigBuilder {
        DecoderConfigBuilder::new()
    }

    /// 获取编解码器
    pub fn codec(&self) -> VideoCodec {
        self.codec
    }

    /// 获取输出格式
    pub fn output_format(&self) -> PixelFormat {
        self.output_format
    }

    /// 获取硬件加速偏好
    pub fn hardware_acceleration(&self) -> HardwareAccelerationPreference {
        self.hardware_acceleration
    }

    /// 获取零拷贝模式
    pub fn zero_copy_mode(&self) -> ZeroCopyMode {
        self.zero_copy_mode
    }

    /// 获取输入队列容量
    pub fn input_queue_capacity(&self) -> usize {
        self.input_queue_capacity
    }

    /// 获取输出队列容量
    pub fn output_queue_capacity(&self) -> usize {
        self.output_queue_capacity
    }

    /// 获取解码超时
    pub fn decode_timeout(&self) -> Duration {
        self.decode_timeout
    }

    /// 获取帧缓冲区数量
    pub fn frame_buffer_count(&self) -> usize {
        self.frame_buffer_count
    }

    /// 获取线程数量
    pub fn thread_count(&self) -> usize {
        self.thread_count
    }

    /// 检查是否为低延迟模式
    pub fn low_latency(&self) -> bool {
        self.low_latency
    }

    /// 检查是否启用错误隐藏
    pub fn error_concealment(&self) -> bool {
        self.error_concealment
    }

    /// 获取目标帧率
    pub fn target_fps(&self) -> Option<f64> {
        self.target_fps
    }

    /// 获取目标分辨率
    pub fn target_resolution(&self) -> Option<(u32, u32)> {
        self.target_resolution
    }

    /// 检查是否启用硬件加速
    pub fn is_hardware_accelerated(&self) -> bool {
        matches!(
            self.hardware_acceleration,
            HardwareAccelerationPreference::PreferHardware | HardwareAccelerationPreference::ForceHardware
        )
    }

    /// 检查是否启用零拷贝
    pub fn is_zero_copy_enabled(&self) -> bool {
        match self.zero_copy_mode {
            ZeroCopyMode::Enabled => true,
            ZeroCopyMode::Disabled => false,
            ZeroCopyMode::Auto => {
                // 自动模式下，RGB 格式通常需要 CPU 访问，不使用零拷贝
                // NV12 等 YUV 格式可以留在 GPU
                self.output_format.is_yuv()
            }
        }
    }
}

impl Default for DecoderConfig {
    fn default() -> Self {
        Self {
            codec: VideoCodec::H264,
            output_format: PixelFormat::NV12,
            hardware_acceleration: HardwareAccelerationPreference::default(),
            zero_copy_mode: ZeroCopyMode::default(),
            input_queue_capacity: 32,
            output_queue_capacity: 16,
            decode_timeout: Duration::from_secs(5),
            frame_buffer_count: 4,
            thread_count: 0, // 0 表示自动选择
            low_latency: false,
            error_concealment: true,
            target_fps: None,
            target_resolution: None,
        }
    }
}

/// 视频解码器配置构建器
///
/// 用于构建 DecoderConfig 实例。
///
/// # 示例
/// ```
/// use media_decoder::{DecoderConfigBuilder, VideoCodec, PixelFormat, HardwareAccelerationPreference};
///
/// let config = DecoderConfigBuilder::new()
///     .codec(VideoCodec::H265)
///     .output_format(PixelFormat::NV12)
///     .hardware_acceleration_preference(HardwareAccelerationPreference::ForceHardware)
///     .build();
/// ```
pub struct DecoderConfigBuilder {
    config: DecoderConfig,
}

impl DecoderConfigBuilder {
    /// 创建一个新的配置构建器
    pub fn new() -> Self {
        Self {
            config: DecoderConfig::default(),
        }
    }

    /// 设置编解码器
    ///
    /// # 参数
    /// * `codec` - 视频编解码器
    pub fn codec(mut self, codec: VideoCodec) -> Self {
        self.config.codec = codec;
        self
    }

    /// 设置输出格式
    ///
    /// # 参数
    /// * `format` - 输出像素格式
    pub fn output_format(mut self, format: PixelFormat) -> Self {
        self.config.output_format = format;
        self
    }

    /// 设置硬件加速偏好
    ///
    /// # 参数
    /// * `preference` - 硬件加速偏好
    pub fn hardware_acceleration_preference(mut self, preference: HardwareAccelerationPreference) -> Self {
        self.config.hardware_acceleration = preference;
        self
    }

    /// 启用或禁用硬件加速
    ///
    /// # 参数
    /// * `enabled` - 是否启用硬件加速
    pub fn hardware_acceleration(mut self, enabled: bool) -> Self {
        self.config.hardware_acceleration = if enabled {
            HardwareAccelerationPreference::PreferHardware
        } else {
            HardwareAccelerationPreference::SoftwareOnly
        };
        self
    }

    /// 设置零拷贝模式
    ///
    /// # 参数
    /// * `mode` - 零拷贝模式
    pub fn zero_copy_mode(mut self, mode: ZeroCopyMode) -> Self {
        self.config.zero_copy_mode = mode;
        self
    }

    /// 启用或禁用零拷贝
    ///
    /// # 参数
    /// * `enabled` - 是否启用零拷贝
    pub fn zero_copy(mut self, enabled: bool) -> Self {
        self.config.zero_copy_mode = if enabled {
            ZeroCopyMode::Enabled
        } else {
            ZeroCopyMode::Disabled
        };
        self
    }

    /// 设置输入队列容量
    ///
    /// # 参数
    /// * `capacity` - 队列容量
    pub fn input_queue_capacity(mut self, capacity: usize) -> Self {
        self.config.input_queue_capacity = capacity;
        self
    }

    /// 设置输出队列容量
    ///
    /// # 参数
    /// * `capacity` - 队列容量
    pub fn output_queue_capacity(mut self, capacity: usize) -> Self {
        self.config.output_queue_capacity = capacity;
        self
    }

    /// 设置解码超时
    ///
    /// # 参数
    /// * `timeout` - 超时时间
    pub fn decode_timeout(mut self, timeout: Duration) -> Self {
        self.config.decode_timeout = timeout;
        self
    }

    /// 设置帧缓冲区数量
    ///
    /// # 参数
    /// * `count` - 缓冲区数量
    pub fn frame_buffer_count(mut self, count: usize) -> Self {
        self.config.frame_buffer_count = count;
        self
    }

    /// 设置线程数量
    ///
    /// # 参数
    /// * `count` - 线程数量（0 表示自动选择）
    pub fn thread_count(mut self, count: usize) -> Self {
        self.config.thread_count = count;
        self
    }

    /// 设置低延迟模式
    ///
    /// # 参数
    /// * `enabled` - 是否启用低延迟模式
    pub fn low_latency(mut self, enabled: bool) -> Self {
        self.config.low_latency = enabled;
        self
    }

    /// 设置错误隐藏
    ///
    /// # 参数
    /// * `enabled` - 是否启用错误隐藏
    pub fn error_concealment(mut self, enabled: bool) -> Self {
        self.config.error_concealment = enabled;
        self
    }

    /// 设置目标帧率
    ///
    /// # 参数
    /// * `fps` - 目标帧率
    pub fn target_fps(mut self, fps: f64) -> Self {
        self.config.target_fps = Some(fps);
        self
    }

    /// 设置目标分辨率
    ///
    /// # 参数
    /// * `width` - 目标宽度
    /// * `height` - 目标高度
    pub fn target_resolution(mut self, width: u32, height: u32) -> Self {
        self.config.target_resolution = Some((width, height));
        self
    }

    /// 构建配置
    ///
    /// 返回构建好的 DecoderConfig 实例。
    pub fn build(self) -> DecoderConfig {
        self.config
    }
}

impl Default for DecoderConfigBuilder {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = DecoderConfig::default();
        
        assert_eq!(config.codec(), VideoCodec::H264);
        assert_eq!(config.output_format(), PixelFormat::NV12);
        assert_eq!(config.hardware_acceleration(), HardwareAccelerationPreference::PreferHardware);
        assert_eq!(config.zero_copy_mode(), ZeroCopyMode::Auto);
        assert_eq!(config.input_queue_capacity(), 32);
        assert_eq!(config.output_queue_capacity(), 16);
        assert_eq!(config.decode_timeout(), Duration::from_secs(5));
        assert_eq!(config.frame_buffer_count(), 4);
        assert_eq!(config.thread_count(), 0);
        assert!(!config.low_latency());
        assert!(config.error_concealment());
        assert!(config.target_fps().is_none());
        assert!(config.target_resolution().is_none());
    }

    #[test]
    fn test_config_builder() {
        let config = DecoderConfig::builder()
            .codec(VideoCodec::H265)
            .output_format(PixelFormat::RGBA32)
            .hardware_acceleration_preference(HardwareAccelerationPreference::ForceHardware)
            .zero_copy_mode(ZeroCopyMode::Enabled)
            .input_queue_capacity(64)
            .output_queue_capacity(32)
            .decode_timeout(Duration::from_secs(10))
            .frame_buffer_count(8)
            .thread_count(4)
            .low_latency(true)
            .error_concealment(false)
            .target_fps(60.0)
            .target_resolution(1920, 1080)
            .build();
        
        assert_eq!(config.codec(), VideoCodec::H265);
        assert_eq!(config.output_format(), PixelFormat::RGBA32);
        assert_eq!(config.hardware_acceleration(), HardwareAccelerationPreference::ForceHardware);
        assert_eq!(config.zero_copy_mode(), ZeroCopyMode::Enabled);
        assert_eq!(config.input_queue_capacity(), 64);
        assert_eq!(config.output_queue_capacity(), 32);
        assert_eq!(config.decode_timeout(), Duration::from_secs(10));
        assert_eq!(config.frame_buffer_count(), 8);
        assert_eq!(config.thread_count(), 4);
        assert!(config.low_latency());
        assert!(!config.error_concealment());
        assert_eq!(config.target_fps(), Some(60.0));
        assert_eq!(config.target_resolution(), Some((1920, 1080)));
    }

    #[test]
    fn test_hardware_acceleration_check() {
        let config = DecoderConfig::builder()
            .hardware_acceleration_preference(HardwareAccelerationPreference::PreferHardware)
            .build();
        assert!(config.is_hardware_accelerated());
        
        let config = DecoderConfig::builder()
            .hardware_acceleration_preference(HardwareAccelerationPreference::ForceHardware)
            .build();
        assert!(config.is_hardware_accelerated());
        
        let config = DecoderConfig::builder()
            .hardware_acceleration_preference(HardwareAccelerationPreference::SoftwareOnly)
            .build();
        assert!(!config.is_hardware_accelerated());
    }

    #[test]
    fn test_zero_copy_check() {
        // 显式启用
        let config = DecoderConfig::builder()
            .zero_copy_mode(ZeroCopyMode::Enabled)
            .build();
        assert!(config.is_zero_copy_enabled());
        
        // 显式禁用
        let config = DecoderConfig::builder()
            .zero_copy_mode(ZeroCopyMode::Disabled)
            .build();
        assert!(!config.is_zero_copy_enabled());
        
        // 自动模式 - NV12 (YUV) 应该启用
        let config = DecoderConfig::builder()
            .output_format(PixelFormat::NV12)
            .zero_copy_mode(ZeroCopyMode::Auto)
            .build();
        assert!(config.is_zero_copy_enabled());
        
        // 自动模式 - RGBA (RGB) 应该禁用
        let config = DecoderConfig::builder()
            .output_format(PixelFormat::RGBA32)
            .zero_copy_mode(ZeroCopyMode::Auto)
            .build();
        assert!(!config.is_zero_copy_enabled());
    }

    #[test]
    fn test_hardware_acceleration_shortcut() {
        let config = DecoderConfig::builder()
            .hardware_acceleration(true)
            .build();
        assert_eq!(config.hardware_acceleration(), HardwareAccelerationPreference::PreferHardware);
        
        let config = DecoderConfig::builder()
            .hardware_acceleration(false)
            .build();
        assert_eq!(config.hardware_acceleration(), HardwareAccelerationPreference::SoftwareOnly);
    }

    #[test]
    fn test_zero_copy_shortcut() {
        let config = DecoderConfig::builder()
            .zero_copy(true)
            .build();
        assert_eq!(config.zero_copy_mode(), ZeroCopyMode::Enabled);
        
        let config = DecoderConfig::builder()
            .zero_copy(false)
            .build();
        assert_eq!(config.zero_copy_mode(), ZeroCopyMode::Disabled);
    }
}
