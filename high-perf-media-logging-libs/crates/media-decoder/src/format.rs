//! 视频格式定义
//!
//! 该模块定义了视频编解码器、像素格式和其他视频相关的格式定义。

use std::fmt;
use std::str::FromStr;

use serde::{Deserialize, Serialize};
use thiserror::Error;

/// 视频编解码器类型
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum VideoCodec {
    /// H.264 / AVC
    H264,
    /// H.265 / HEVC
    H265,
    /// VP8
    VP8,
    /// VP9
    VP9,
    /// AV1
    AV1,
    /// MPEG-2
    MPEG2,
    /// MPEG-4 Part 2
    MPEG4,
    /// VC-1
    VC1,
    /// MJPEG
    MJPEG,
}

impl VideoCodec {
    /// 获取编解码器的名称
    ///
    /// # 示例
    /// ```
    /// use media_decoder::VideoCodec;
    ///
    /// assert_eq!(VideoCodec::H264.name(), "H.264");
    /// ```
    pub fn name(&self) -> &'static str {
        match self {
            VideoCodec::H264 => "H.264",
            VideoCodec::H265 => "H.265",
            VideoCodec::VP8 => "VP8",
            VideoCodec::VP9 => "VP9",
            VideoCodec::AV1 => "AV1",
            VideoCodec::MPEG2 => "MPEG-2",
            VideoCodec::MPEG4 => "MPEG-4",
            VideoCodec::VC1 => "VC-1",
            VideoCodec::MJPEG => "MJPEG",
        }
    }

    /// 检查编解码器是否通常支持硬件加速
    ///
    /// # 示例
    /// ```
    /// use media_decoder::VideoCodec;
    ///
    /// assert!(VideoCodec::H264.is_hardware_accelerated());
    /// ```
    pub fn is_hardware_accelerated(&self) -> bool {
        match self {
            VideoCodec::H264 | VideoCodec::H265 | VideoCodec::VP8 | VideoCodec::VP9 | VideoCodec::AV1 => true,
            VideoCodec::MPEG2 | VideoCodec::MPEG4 | VideoCodec::VC1 | VideoCodec::MJPEG => false,
        }
    }

    /// 获取所有支持的编解码器
    pub fn all() -> &'static [VideoCodec] {
        &[
            VideoCodec::H264,
            VideoCodec::H265,
            VideoCodec::VP8,
            VideoCodec::VP9,
            VideoCodec::AV1,
            VideoCodec::MPEG2,
            VideoCodec::MPEG4,
            VideoCodec::VC1,
            VideoCodec::MJPEG,
        ]
    }
}

impl fmt::Display for VideoCodec {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.name())
    }
}

/// 编解码器解析错误
#[derive(Error, Debug, PartialEq, Eq)]
pub enum CodecParseError {
    #[error("Unknown codec: {0}")]
    UnknownCodec(String),
}

impl FromStr for VideoCodec {
    type Err = CodecParseError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_uppercase().as_str() {
            "H264" | "H.264" | "AVC" => Ok(VideoCodec::H264),
            "H265" | "H.265" | "HEVC" => Ok(VideoCodec::H265),
            "VP8" => Ok(VideoCodec::VP8),
            "VP9" => Ok(VideoCodec::VP9),
            "AV1" => Ok(VideoCodec::AV1),
            "MPEG2" | "MPEG-2" => Ok(VideoCodec::MPEG2),
            "MPEG4" | "MPEG-4" => Ok(VideoCodec::MPEG4),
            "VC1" | "VC-1" => Ok(VideoCodec::VC1),
            "MJPEG" | "JPEG" => Ok(VideoCodec::MJPEG),
            _ => Err(CodecParseError::UnknownCodec(s.to_string())),
        }
    }
}

/// 像素格式
///
/// 定义了视频帧的像素存储格式。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum PixelFormat {
    /// NV12 格式（YUV420 半平面格式）
    /// 
    /// Y 平面单独存储，UV 平面交错存储
    /// 适用于大多数 GPU 硬件解码
    NV12,
    
    /// NV21 格式（YUV420 半平面格式，UV 顺序相反）
    NV21,
    
    /// I420 格式（YUV420 平面格式）
    /// 
    /// Y、U、V 三个平面分别存储
    I420,
    
    /// YV12 格式（YUV420 平面格式，UV 顺序相反）
    YV12,
    
    /// RGB 24 位格式（无 Alpha 通道）
    RGB24,
    
    /// RGBA 32 位格式（带 Alpha 通道）
    RGBA32,
    
    /// BGRA 32 位格式（带 Alpha 通道，字节顺序相反）
    BGRA32,
    
    /// ARGB 32 位格式（带 Alpha 通道，Alpha 在前）
    ARGB32,
    
    /// BGR 24 位格式（无 Alpha 通道，字节顺序相反）
    BGR24,
}

impl PixelFormat {
    /// 获取像素格式的名称
    ///
    /// # 示例
    /// ```
    /// use media_decoder::PixelFormat;
    ///
    /// assert_eq!(PixelFormat::NV12.name(), "NV12");
    /// ```
    pub fn name(&self) -> &'static str {
        match self {
            PixelFormat::NV12 => "NV12",
            PixelFormat::NV21 => "NV21",
            PixelFormat::I420 => "I420",
            PixelFormat::YV12 => "YV12",
            PixelFormat::RGB24 => "RGB24",
            PixelFormat::RGBA32 => "RGBA32",
            PixelFormat::BGRA32 => "BGRA32",
            PixelFormat::ARGB32 => "ARGB32",
            PixelFormat::BGR24 => "BGR24",
        }
    }

    /// 检查是否为 YUV 格式
    ///
    /// # 示例
    /// ```
    /// use media_decoder::PixelFormat;
    ///
    /// assert!(PixelFormat::NV12.is_yuv());
    /// assert!(!PixelFormat::RGB24.is_yuv());
    /// ```
    pub fn is_yuv(&self) -> bool {
        matches!(
            self,
            PixelFormat::NV12 | PixelFormat::NV21 | PixelFormat::I420 | PixelFormat::YV12
        )
    }

    /// 检查是否为 RGB 格式
    ///
    /// # 示例
    /// ```
    /// use media_decoder::PixelFormat;
    ///
    /// assert!(PixelFormat::RGB24.is_rgb());
    /// assert!(!PixelFormat::NV12.is_rgb());
    /// ```
    pub fn is_rgb(&self) -> bool {
        matches!(
            self,
            PixelFormat::RGB24
                | PixelFormat::RGBA32
                | PixelFormat::BGRA32
                | PixelFormat::ARGB32
                | PixelFormat::BGR24
        )
    }

    /// 检查是否有 Alpha 通道
    ///
    /// # 示例
    /// ```
    /// use media_decoder::PixelFormat;
    ///
    /// assert!(PixelFormat::RGBA32.has_alpha());
    /// assert!(!PixelFormat::RGB24.has_alpha());
    /// ```
    pub fn has_alpha(&self) -> bool {
        matches!(
            self,
            PixelFormat::RGBA32 | PixelFormat::BGRA32 | PixelFormat::ARGB32
        )
    }

    /// 获取每个像素的字节数
    ///
    /// # 示例
    /// ```
    /// use media_decoder::PixelFormat;
    ///
    /// assert_eq!(PixelFormat::RGB24.bytes_per_pixel(), 3);
    /// assert_eq!(PixelFormat::RGBA32.bytes_per_pixel(), 4);
    /// ```
    pub fn bytes_per_pixel(&self) -> usize {
        match self {
            PixelFormat::RGB24 | PixelFormat::BGR24 => 3,
            PixelFormat::RGBA32 | PixelFormat::BGRA32 | PixelFormat::ARGB32 => 4,
            // YUV 格式的字节数取决于分辨率，这里返回每像素平均字节数
            PixelFormat::NV12 | PixelFormat::NV21 | PixelFormat::I420 | PixelFormat::YV12 => 2, // 12 bits per pixel = 1.5 bytes, rounded up
        }
    }

    /// 获取适用于 WebGL 渲染的格式
    ///
    /// # 示例
    /// ```
    /// use media_decoder::PixelFormat;
    ///
    /// assert!(PixelFormat::RGBA32.is_webgl_compatible());
    /// ```
    pub fn is_webgl_compatible(&self) -> bool {
        matches!(
            self,
            PixelFormat::RGBA32 | PixelFormat::BGRA32 | PixelFormat::RGB24
        )
    }

    /// 获取所有支持的像素格式
    pub fn all() -> &'static [PixelFormat] {
        &[
            PixelFormat::NV12,
            PixelFormat::NV21,
            PixelFormat::I420,
            PixelFormat::YV12,
            PixelFormat::RGB24,
            PixelFormat::RGBA32,
            PixelFormat::BGRA32,
            PixelFormat::ARGB32,
            PixelFormat::BGR24,
        ]
    }
}

impl fmt::Display for PixelFormat {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.name())
    }
}

/// 像素格式解析错误
#[derive(Error, Debug, PartialEq, Eq)]
pub enum PixelFormatParseError {
    #[error("Unknown pixel format: {0}")]
    UnknownFormat(String),
}

impl FromStr for PixelFormat {
    type Err = PixelFormatParseError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_uppercase().as_str() {
            "NV12" => Ok(PixelFormat::NV12),
            "NV21" => Ok(PixelFormat::NV21),
            "I420" | "YUV420" => Ok(PixelFormat::I420),
            "YV12" => Ok(PixelFormat::YV12),
            "RGB24" | "RGB" => Ok(PixelFormat::RGB24),
            "RGBA32" | "RGBA" => Ok(PixelFormat::RGBA32),
            "BGRA32" | "BGRA" => Ok(PixelFormat::BGRA32),
            "ARGB32" | "ARGB" => Ok(PixelFormat::ARGB32),
            "BGR24" | "BGR" => Ok(PixelFormat::BGR24),
            _ => Err(PixelFormatParseError::UnknownFormat(s.to_string())),
        }
    }
}

/// 视频颜色空间
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum ColorSpace {
    /// BT.601（标清电视）
    BT601,
    /// BT.709（高清电视）
    BT709,
    /// BT.2020（超高清电视）
    BT2020,
    /// sRGB（计算机显示器）
    SRGB,
}

impl ColorSpace {
    /// 获取颜色空间的名称
    pub fn name(&self) -> &'static str {
        match self {
            ColorSpace::BT601 => "BT.601",
            ColorSpace::BT709 => "BT.709",
            ColorSpace::BT2020 => "BT.2020",
            ColorSpace::SRGB => "sRGB",
        }
    }
}

impl fmt::Display for ColorSpace {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.name())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_video_codec() {
        assert_eq!(VideoCodec::H264.name(), "H.264");
        assert_eq!(VideoCodec::H265.name(), "H.265");
        assert_eq!(VideoCodec::VP9.name(), "VP9");
        assert_eq!(VideoCodec::AV1.name(), "AV1");
        
        assert!(VideoCodec::H264.is_hardware_accelerated());
        assert!(VideoCodec::H265.is_hardware_accelerated());
        assert!(VideoCodec::AV1.is_hardware_accelerated());
        assert!(!VideoCodec::MJPEG.is_hardware_accelerated());
    }

    #[test]
    fn test_video_codec_from_str() {
        assert_eq!("H264".parse::<VideoCodec>().unwrap(), VideoCodec::H264);
        assert_eq!("H.264".parse::<VideoCodec>().unwrap(), VideoCodec::H264);
        assert_eq!("AVC".parse::<VideoCodec>().unwrap(), VideoCodec::H264);
        
        assert_eq!("H265".parse::<VideoCodec>().unwrap(), VideoCodec::H265);
        assert_eq!("HEVC".parse::<VideoCodec>().unwrap(), VideoCodec::H265);
        
        assert_eq!("VP8".parse::<VideoCodec>().unwrap(), VideoCodec::VP8);
        assert_eq!("VP9".parse::<VideoCodec>().unwrap(), VideoCodec::VP9);
        assert_eq!("AV1".parse::<VideoCodec>().unwrap(), VideoCodec::AV1);
        
        assert!("invalid".parse::<VideoCodec>().is_err());
    }

    #[test]
    fn test_pixel_format() {
        assert_eq!(PixelFormat::NV12.name(), "NV12");
        assert_eq!(PixelFormat::RGB24.name(), "RGB24");
        assert_eq!(PixelFormat::RGBA32.name(), "RGBA32");
        
        assert!(PixelFormat::NV12.is_yuv());
        assert!(PixelFormat::I420.is_yuv());
        assert!(!PixelFormat::RGB24.is_yuv());
        
        assert!(PixelFormat::RGB24.is_rgb());
        assert!(PixelFormat::RGBA32.is_rgb());
        assert!(!PixelFormat::NV12.is_rgb());
        
        assert!(PixelFormat::RGBA32.has_alpha());
        assert!(PixelFormat::BGRA32.has_alpha());
        assert!(!PixelFormat::RGB24.has_alpha());
        
        assert_eq!(PixelFormat::RGB24.bytes_per_pixel(), 3);
        assert_eq!(PixelFormat::RGBA32.bytes_per_pixel(), 4);
        
        assert!(PixelFormat::RGBA32.is_webgl_compatible());
        assert!(PixelFormat::RGB24.is_webgl_compatible());
        assert!(!PixelFormat::NV12.is_webgl_compatible());
    }

    #[test]
    fn test_pixel_format_from_str() {
        assert_eq!("NV12".parse::<PixelFormat>().unwrap(), PixelFormat::NV12);
        assert_eq!("RGB24".parse::<PixelFormat>().unwrap(), PixelFormat::RGB24);
        assert_eq!("RGBA".parse::<PixelFormat>().unwrap(), PixelFormat::RGBA32);
        assert_eq!("BGRA".parse::<PixelFormat>().unwrap(), PixelFormat::BGRA32);
        
        assert!("invalid".parse::<PixelFormat>().is_err());
    }

    #[test]
    fn test_color_space() {
        assert_eq!(ColorSpace::BT601.name(), "BT.601");
        assert_eq!(ColorSpace::BT709.name(), "BT.709");
        assert_eq!(ColorSpace::BT2020.name(), "BT.2020");
        assert_eq!(ColorSpace::SRGB.name(), "sRGB");
    }

    #[test]
    fn test_all_codecs() {
        let all_codecs = VideoCodec::all();
        assert!(!all_codecs.is_empty());
        assert!(all_codecs.contains(&VideoCodec::H264));
        assert!(all_codecs.contains(&VideoCodec::H265));
    }

    #[test]
    fn test_all_pixel_formats() {
        let all_formats = PixelFormat::all();
        assert!(!all_formats.is_empty());
        assert!(all_formats.contains(&PixelFormat::NV12));
        assert!(all_formats.contains(&PixelFormat::RGB24));
    }
}
