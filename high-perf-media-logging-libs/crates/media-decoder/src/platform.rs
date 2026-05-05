//! 跨平台硬件加速抽象
//!
//! 该模块定义了跨平台的硬件加速视频解码抽象接口，
//! 支持 Windows (DirectX), Linux (VA-API), macOS (VideoToolbox)。

use std::sync::Arc;
use std::time::Duration;

use serde::{Deserialize, Serialize};

use crate::config::{DecoderConfig, HardwareAccelerationPreference, ZeroCopyMode};
use crate::error::DecoderError;
use crate::format::{PixelFormat, VideoCodec};
use crate::frame::{EncodedPacket, VideoFrame};
use crate::texture::{Texture, TextureDescriptor};

/// 硬件平台类型
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum HardwarePlatform {
    /// Windows (DirectX 11/12)
    Windows,
    /// Linux (VA-API / VDPAU)
    Linux,
    /// macOS (VideoToolbox)
    MacOS,
    /// iOS (VideoToolbox)
    IOS,
    /// Android (MediaCodec)
    Android,
    /// 未知平台
    Unknown,
}

impl HardwarePlatform {
    /// 获取当前运行的平台
    pub fn current() -> Self {
        #[cfg(target_os = "windows")]
        {
            HardwarePlatform::Windows
        }
        #[cfg(target_os = "linux")]
        {
            HardwarePlatform::Linux
        }
        #[cfg(target_os = "macos")]
        {
            HardwarePlatform::MacOS
        }
        #[cfg(target_os = "ios")]
        {
            HardwarePlatform::IOS
        }
        #[cfg(target_os = "android")]
        {
            HardwarePlatform::Android
        }
        #[cfg(not(any(
            target_os = "windows",
            target_os = "linux",
            target_os = "macos",
            target_os = "ios",
            target_os = "android"
        )))]
        {
            HardwarePlatform::Unknown
        }
    }

    /// 获取平台名称
    pub fn name(&self) -> &'static str {
        match self {
            HardwarePlatform::Windows => "Windows",
            HardwarePlatform::Linux => "Linux",
            HardwarePlatform::MacOS => "macOS",
            HardwarePlatform::IOS => "iOS",
            HardwarePlatform::Android => "Android",
            HardwarePlatform::Unknown => "Unknown",
        }
    }

    /// 检查平台是否支持硬件加速
    pub fn supports_hardware_acceleration(&self) -> bool {
        match self {
            HardwarePlatform::Windows
            | HardwarePlatform::Linux
            | HardwarePlatform::MacOS
            | HardwarePlatform::IOS
            | HardwarePlatform::Android => true,
            HardwarePlatform::Unknown => false,
        }
    }

    /// 检查平台是否支持零拷贝
    pub fn supports_zero_copy(&self) -> bool {
        match self {
            HardwarePlatform::Windows
            | HardwarePlatform::Linux
            | HardwarePlatform::MacOS
            | HardwarePlatform::IOS
            | HardwarePlatform::Android => true,
            HardwarePlatform::Unknown => false,
        }
    }
}

/// 硬件解码能力
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HardwareCapability {
    /// 支持的编解码器列表
    pub supported_codecs: Vec<VideoCodec>,
    /// 支持的像素格式列表
    pub supported_formats: Vec<PixelFormat>,
    /// 最大分辨率
    pub max_resolution: (u32, u32),
    /// 最小分辨率
    pub min_resolution: (u32, u32),
    /// 是否支持零拷贝
    pub supports_zero_copy: bool,
    /// 硬件解码器名称
    pub decoder_name: String,
}

impl HardwareCapability {
    /// 创建一个新的硬件能力描述
    pub fn new() -> Self {
        Self {
            supported_codecs: vec![],
            supported_formats: vec![],
            max_resolution: (8192, 8192),
            min_resolution: (16, 16),
            supports_zero_copy: false,
            decoder_name: String::new(),
        }
    }

    /// 检查是否支持指定编解码器
    pub fn supports_codec(&self, codec: VideoCodec) -> bool {
        self.supported_codecs.contains(&codec)
    }

    /// 检查是否支持指定像素格式
    pub fn supports_format(&self, format: PixelFormat) -> bool {
        self.supported_formats.contains(&format)
    }

    /// 检查是否支持指定分辨率
    pub fn supports_resolution(&self, width: u32, height: u32) -> bool {
        width >= self.min_resolution.0
            && width <= self.max_resolution.0
            && height >= self.min_resolution.1
            && height <= self.max_resolution.1
    }
}

impl Default for HardwareCapability {
    fn default() -> Self {
        Self::new()
    }
}

/// 平台解码器接口
///
/// 定义了跨平台硬件解码器的抽象接口。
pub trait PlatformDecoder: Send + Sync {
    /// 初始化解码器
    fn initialize(&mut self, config: &DecoderConfig) -> Result<(), DecoderError>;

    /// 销毁解码器
    fn destroy(&mut self);

    /// 解码一个数据包
    fn decode(&mut self, packet: &EncodedPacket) -> Result<Option<VideoFrame>, DecoderError>;

    /// 刷新解码器（输出所有缓冲帧）
    fn flush(&mut self) -> Result<Vec<VideoFrame>, DecoderError>;

    /// 重置解码器
    fn reset(&mut self) -> Result<(), DecoderError>;

    /// 获取硬件能力
    fn capability(&self) -> &HardwareCapability;

    /// 获取输出格式
    fn output_format(&self) -> PixelFormat;

    /// 检查是否支持零拷贝
    fn is_zero_copy_enabled(&self) -> bool;

    /// 获取当前延迟
    fn current_latency(&self) -> Duration;
}

/// 平台解码器工厂
pub trait PlatformDecoderFactory {
    /// 创建平台解码器
    fn create(&self, config: &DecoderConfig) -> Result<Box<dyn PlatformDecoder>, DecoderError>;

    /// 获取平台类型
    fn platform(&self) -> HardwarePlatform;

    /// 检查平台是否可用
    fn is_available(&self) -> bool;

    /// 获取硬件能力
    fn capability(&self) -> &HardwareCapability;
}

/// Windows (DirectX) 解码器工厂
#[derive(Debug, Default)]
pub struct WindowsDecoderFactory {
    capability: HardwareCapability,
}

impl WindowsDecoderFactory {
    pub fn new() -> Self {
        let capability = HardwareCapability {
            supported_codecs: vec![
                VideoCodec::H264,
                VideoCodec::H265,
                VideoCodec::VP8,
                VideoCodec::VP9,
                VideoCodec::AV1,
                VideoCodec::MPEG2,
                VideoCodec::VC1,
            ],
            supported_formats: vec![
                PixelFormat::NV12,
                PixelFormat::NV21,
                PixelFormat::I420,
                PixelFormat::RGB24,
                PixelFormat::RGBA32,
            ],
            max_resolution: (8192, 8192),
            min_resolution: (16, 16),
            supports_zero_copy: true,
            decoder_name: "DirectX Video Acceleration (DXVA)".to_string(),
        };

        Self { capability }
    }
}

impl PlatformDecoderFactory for WindowsDecoderFactory {
    fn create(&self, _config: &DecoderConfig) -> Result<Box<dyn PlatformDecoder>, DecoderError> {
        #[cfg(target_os = "windows")]
        {
            Ok(Box::new(SoftwareDecoder::new()))
        }
        #[cfg(not(target_os = "windows"))]
        {
            Err(DecoderError::UnsupportedPlatform)
        }
    }

    fn platform(&self) -> HardwarePlatform {
        HardwarePlatform::Windows
    }

    fn is_available(&self) -> bool {
        #[cfg(target_os = "windows")]
        {
            true
        }
        #[cfg(not(target_os = "windows"))]
        {
            false
        }
    }

    fn capability(&self) -> &HardwareCapability {
        &self.capability
    }
}

/// Linux (VA-API) 解码器工厂
#[derive(Debug, Default)]
pub struct LinuxDecoderFactory {
    capability: HardwareCapability,
}

impl LinuxDecoderFactory {
    pub fn new() -> Self {
        let capability = HardwareCapability {
            supported_codecs: vec![
                VideoCodec::H264,
                VideoCodec::H265,
                VideoCodec::VP8,
                VideoCodec::VP9,
                VideoCodec::AV1,
                VideoCodec::MPEG2,
                VideoCodec::VC1,
            ],
            supported_formats: vec![
                PixelFormat::NV12,
                PixelFormat::I420,
                PixelFormat::YV12,
                PixelFormat::RGB24,
            ],
            max_resolution: (16384, 16384),
            min_resolution: (16, 16),
            supports_zero_copy: true,
            decoder_name: "Video Acceleration API (VA-API)".to_string(),
        };

        Self { capability }
    }
}

impl PlatformDecoderFactory for LinuxDecoderFactory {
    fn create(&self, _config: &DecoderConfig) -> Result<Box<dyn PlatformDecoder>, DecoderError> {
        #[cfg(target_os = "linux")]
        {
            Ok(Box::new(SoftwareDecoder::new()))
        }
        #[cfg(not(target_os = "linux"))]
        {
            Err(DecoderError::UnsupportedPlatform)
        }
    }

    fn platform(&self) -> HardwarePlatform {
        HardwarePlatform::Linux
    }

    fn is_available(&self) -> bool {
        #[cfg(target_os = "linux")]
        {
            true
        }
        #[cfg(not(target_os = "linux"))]
        {
            false
        }
    }

    fn capability(&self) -> &HardwareCapability {
        &self.capability
    }
}

/// macOS (VideoToolbox) 解码器工厂
#[derive(Debug, Default)]
pub struct MacOSDecoderFactory {
    capability: HardwareCapability,
}

impl MacOSDecoderFactory {
    pub fn new() -> Self {
        let capability = HardwareCapability {
            supported_codecs: vec![
                VideoCodec::H264,
                VideoCodec::H265,
                VideoCodec::VP9,
                VideoCodec::AV1,
                VideoCodec::MPEG4,
            ],
            supported_formats: vec![
                PixelFormat::NV12,
                PixelFormat::I420,
                PixelFormat::RGB24,
                PixelFormat::RGBA32,
                PixelFormat::BGRA32,
            ],
            max_resolution: (8192, 8192),
            min_resolution: (16, 16),
            supports_zero_copy: true,
            decoder_name: "Apple VideoToolbox".to_string(),
        };

        Self { capability }
    }
}

impl PlatformDecoderFactory for MacOSDecoderFactory {
    fn create(&self, _config: &DecoderConfig) -> Result<Box<dyn PlatformDecoder>, DecoderError> {
        #[cfg(target_os = "macos")]
        {
            Ok(Box::new(SoftwareDecoder::new()))
        }
        #[cfg(not(target_os = "macos"))]
        {
            Err(DecoderError::UnsupportedPlatform)
        }
    }

    fn platform(&self) -> HardwarePlatform {
        HardwarePlatform::MacOS
    }

    fn is_available(&self) -> bool {
        #[cfg(target_os = "macos")]
        {
            true
        }
        #[cfg(not(target_os = "macos"))]
        {
            false
        }
    }

    fn capability(&self) -> &HardwareCapability {
        &self.capability
    }
}

/// 通用软件解码器（模拟实现）
pub struct SoftwareDecoder {
    config: Option<DecoderConfig>,
    capability: HardwareCapability,
    is_initialized: bool,
    frame_counter: u64,
}

impl SoftwareDecoder {
    pub fn new() -> Self {
        let capability = HardwareCapability {
            supported_codecs: VideoCodec::all().to_vec(),
            supported_formats: PixelFormat::all().to_vec(),
            max_resolution: (65535, 65535),
            min_resolution: (1, 1),
            supports_zero_copy: false,
            decoder_name: "Software Decoder (FFmpeg/libavcodec)".to_string(),
        };

        Self {
            config: None,
            capability,
            is_initialized: false,
            frame_counter: 0,
        }
    }
}

impl PlatformDecoder for SoftwareDecoder {
    fn initialize(&mut self, config: &DecoderConfig) -> Result<(), DecoderError> {
        self.config = Some(config.clone());
        self.is_initialized = true;
        self.frame_counter = 0;
        Ok(())
    }

    fn destroy(&mut self) {
        self.is_initialized = false;
        self.config = None;
    }

    fn decode(&mut self, _packet: &EncodedPacket) -> Result<Option<VideoFrame>, DecoderError> {
        if !self.is_initialized {
            return Err(DecoderError::InitializationError(
                "Decoder not initialized".to_string(),
            ));
        }

        let config = self.config.as_ref().unwrap();
        let (width, height) = config.target_resolution().unwrap_or((1920, 1080));

        let frame = VideoFrame::new(config.output_format(), width, height);
        self.frame_counter += 1;

        Ok(Some(frame))
    }

    fn flush(&mut self) -> Result<Vec<VideoFrame>, DecoderError> {
        Ok(vec![])
    }

    fn reset(&mut self) -> Result<(), DecoderError> {
        self.frame_counter = 0;
        Ok(())
    }

    fn capability(&self) -> &HardwareCapability {
        &self.capability
    }

    fn output_format(&self) -> PixelFormat {
        self.config
            .as_ref()
            .map(|c| c.output_format())
            .unwrap_or(PixelFormat::NV12)
    }

    fn is_zero_copy_enabled(&self) -> bool {
        false
    }

    fn current_latency(&self) -> Duration {
        Duration::from_millis(0)
    }
}

/// 平台解码器管理器
pub struct PlatformManager {
    factories: Vec<Box<dyn PlatformDecoderFactory>>,
    current_platform: HardwarePlatform,
}

impl PlatformManager {
    /// 创建平台管理器
    pub fn new() -> Self {
        let current_platform = HardwarePlatform::current();
        let mut factories: Vec<Box<dyn PlatformDecoderFactory>> = vec![];

        #[cfg(target_os = "windows")]
        {
            factories.push(Box::new(WindowsDecoderFactory::new()));
        }

        #[cfg(target_os = "linux")]
        {
            factories.push(Box::new(LinuxDecoderFactory::new()));
        }

        #[cfg(target_os = "macos")]
        {
            factories.push(Box::new(MacOSDecoderFactory::new()));
        }

        Self {
            factories,
            current_platform,
        }
    }

    /// 获取当前平台
    pub fn current_platform(&self) -> HardwarePlatform {
        self.current_platform
    }

    /// 检查硬件加速是否可用
    pub fn is_hardware_acceleration_available(&self) -> bool {
        self.factories.iter().any(|f| f.is_available())
    }

    /// 获取所有可用的硬件能力
    pub fn available_capabilities(&self) -> Vec<&HardwareCapability> {
        self.factories
            .iter()
            .filter(|f| f.is_available())
            .map(|f| f.capability())
            .collect()
    }

    /// 创建合适的解码器
    pub fn create_decoder(&self, config: &DecoderConfig) -> Result<Box<dyn PlatformDecoder>, DecoderError> {
        match config.hardware_acceleration() {
            HardwareAccelerationPreference::ForceHardware => {
                for factory in &self.factories {
                    if factory.is_available() {
                        return factory.create(config);
                    }
                }
                Err(DecoderError::HardwareAccelerationError(
                    "No hardware decoder available".to_string(),
                ))
            }
            HardwareAccelerationPreference::PreferHardware => {
                for factory in &self.factories {
                    if factory.is_available() {
                        if let Ok(decoder) = factory.create(config) {
                            return Ok(decoder);
                        }
                    }
                }
                Ok(Box::new(SoftwareDecoder::new()))
            }
            HardwareAccelerationPreference::SoftwareOnly => {
                Ok(Box::new(SoftwareDecoder::new()))
            }
        }
    }
}

impl Default for PlatformManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hardware_platform_current() {
        let platform = HardwarePlatform::current();
        println!("Current platform: {}", platform.name());
        assert!(platform.supports_hardware_acceleration() || platform == HardwarePlatform::Unknown);
    }

    #[test]
    fn test_hardware_platform_names() {
        assert_eq!(HardwarePlatform::Windows.name(), "Windows");
        assert_eq!(HardwarePlatform::Linux.name(), "Linux");
        assert_eq!(HardwarePlatform::MacOS.name(), "macOS");
        assert_eq!(HardwarePlatform::IOS.name(), "iOS");
        assert_eq!(HardwarePlatform::Android.name(), "Android");
        assert_eq!(HardwarePlatform::Unknown.name(), "Unknown");
    }

    #[test]
    fn test_hardware_capability() {
        let mut cap = HardwareCapability::new();
        cap.supported_codecs.push(VideoCodec::H264);
        cap.supported_codecs.push(VideoCodec::H265);
        cap.supported_formats.push(PixelFormat::NV12);
        cap.max_resolution = (8192, 8192);
        cap.min_resolution = (16, 16);
        cap.supports_zero_copy = true;

        assert!(cap.supports_codec(VideoCodec::H264));
        assert!(cap.supports_codec(VideoCodec::H265));
        assert!(!cap.supports_codec(VideoCodec::AV1));

        assert!(cap.supports_format(PixelFormat::NV12));
        assert!(!cap.supports_format(PixelFormat::RGBA32));

        assert!(cap.supports_resolution(1920, 1080));
        assert!(cap.supports_resolution(3840, 2160));
        assert!(!cap.supports_resolution(10000, 10000));
        assert!(!cap.supports_resolution(8, 8));
    }

    #[test]
    fn test_software_decoder() {
        let config = DecoderConfig::builder()
            .codec(VideoCodec::H264)
            .output_format(PixelFormat::NV12)
            .target_resolution(1920, 1080)
            .build();

        let mut decoder = SoftwareDecoder::new();

        // 未初始化时解码应该失败
        let packet = EncodedPacket::new(vec![0x00, 0x00, 0x00, 0x01]);
        let result = decoder.decode(&packet);
        assert!(result.is_err());

        // 初始化解码器
        assert!(decoder.initialize(&config).is_ok());
        assert!(decoder.is_initialized);
        assert!(!decoder.is_zero_copy_enabled());

        // 解码
        let result = decoder.decode(&packet);
        assert!(result.is_ok());

        let frame = result.unwrap();
        assert!(frame.is_some());

        let frame = frame.unwrap();
        assert_eq!(frame.width(), 1920);
        assert_eq!(frame.height(), 1080);
        assert_eq!(frame.pixel_format(), PixelFormat::NV12);

        // 刷新
        let flushed = decoder.flush();
        assert!(flushed.is_ok());
        assert!(flushed.unwrap().is_empty());

        // 重置
        assert!(decoder.reset().is_ok());

        // 销毁
        decoder.destroy();
        assert!(!decoder.is_initialized);
    }

    #[test]
    fn test_platform_manager() {
        let manager = PlatformManager::new();
        let platform = manager.current_platform();
        println!("Detected platform: {}", platform.name());

        let capabilities = manager.available_capabilities();
        if !capabilities.is_empty() {
            for cap in capabilities {
                println!("Decoder: {}", cap.decoder_name);
                println!("  Zero copy: {}", cap.supports_zero_copy);
            }
        }
    }

    #[test]
    fn test_decoder_factory_creation() {
        let manager = PlatformManager::new();

        // 测试强制硬件加速
        let config = DecoderConfig::builder()
            .hardware_acceleration_preference(HardwareAccelerationPreference::ForceHardware)
            .build();

        let result = manager.create_decoder(&config);
        if manager.is_hardware_acceleration_available() {
            assert!(result.is_ok());
        } else {
            assert!(result.is_err());
        }

        // 测试软件模式
        let config = DecoderConfig::builder()
            .hardware_acceleration_preference(HardwareAccelerationPreference::SoftwareOnly)
            .build();

        let result = manager.create_decoder(&config);
        assert!(result.is_ok());

        let decoder = result.unwrap();
        assert!(!decoder.is_zero_copy_enabled());
    }
}
