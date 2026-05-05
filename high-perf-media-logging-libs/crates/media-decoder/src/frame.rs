//! 视频帧
//!
//! 该模块定义了视频帧的数据结构，包含像素数据和元数据。

use std::sync::Arc;
use std::time::Duration;

use serde::{Deserialize, Serialize};

use crate::format::{ColorSpace, PixelFormat};

/// 视频帧类型
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum FrameType {
    /// 关键帧（I 帧）
    KeyFrame,
    /// 预测帧（P 帧）
    PredictiveFrame,
    /// 双向预测帧（B 帧）
    BiPredictiveFrame,
    /// 未知帧类型
    Unknown,
}

impl FrameType {
    /// 获取帧类型的名称
    pub fn name(&self) -> &'static str {
        match self {
            FrameType::KeyFrame => "I",
            FrameType::PredictiveFrame => "P",
            FrameType::BiPredictiveFrame => "B",
            FrameType::Unknown => "?",
        }
    }

    /// 检查是否为关键帧
    pub fn is_key_frame(&self) -> bool {
        matches!(self, FrameType::KeyFrame)
    }
}

impl Default for FrameType {
    fn default() -> Self {
        FrameType::Unknown
    }
}

/// 视频平面数据
///
/// 存储单个平面的像素数据。
#[derive(Debug, Clone)]
pub struct PlaneData {
    /// 像素数据
    data: Vec<u8>,
    /// 行跨度（字节数）
    stride: usize,
    /// 宽度（像素）
    width: usize,
    /// 高度（像素）
    height: usize,
}

impl PlaneData {
    /// 创建一个新的平面数据
    ///
    /// # 参数
    /// * `data` - 像素数据
    /// * `stride` - 行跨度
    /// * `width` - 宽度
    /// * `height` - 高度
    pub fn new(data: Vec<u8>, stride: usize, width: usize, height: usize) -> Self {
        Self {
            data,
            stride,
            width,
            height,
        }
    }

    /// 获取像素数据
    pub fn data(&self) -> &[u8] {
        &self.data
    }

    /// 获取可变像素数据
    pub fn data_mut(&mut self) -> &mut [u8] {
        &mut self.data
    }

    /// 获取行跨度
    pub fn stride(&self) -> usize {
        self.stride
    }

    /// 获取宽度
    pub fn width(&self) -> usize {
        self.width
    }

    /// 获取高度
    pub fn height(&self) -> usize {
        self.height
    }

    /// 获取指定行的数据
    ///
    /// # 参数
    /// * `row` - 行索引
    pub fn row(&self, row: usize) -> Option<&[u8]> {
        if row >= self.height {
            return None;
        }
        let start = row * self.stride;
        let end = start + self.width;
        self.data.get(start..end)
    }
}

/// GPU 纹理句柄
///
/// 当使用零拷贝模式时，帧数据存储在 GPU 纹理中。
#[derive(Debug, Clone)]
pub struct GpuTextureHandle {
    /// 纹理 ID（平台特定）
    texture_id: u64,
    /// 设备上下文（平台特定）
    device_context: Option<Arc<dyn std::any::Any + Send + Sync>>,
}

impl GpuTextureHandle {
    /// 创建一个新的 GPU 纹理句柄
    ///
    /// # 参数
    /// * `texture_id` - 纹理 ID
    pub fn new(texture_id: u64) -> Self {
        Self {
            texture_id,
            device_context: None,
        }
    }

    /// 获取纹理 ID
    pub fn texture_id(&self) -> u64 {
        self.texture_id
    }
}

/// 视频帧
///
/// 包含解码后的视频帧数据和元数据。
#[derive(Debug, Clone)]
pub struct VideoFrame {
    /// 像素格式
    pixel_format: PixelFormat,
    /// 颜色空间
    color_space: ColorSpace,
    /// 宽度（像素）
    width: u32,
    /// 高度（像素）
    height: u32,
    /// 帧类型
    frame_type: FrameType,
    /// 显示时间戳（PTS）
    pts: Option<Duration>,
    /// 解码时间戳（DTS）
    dts: Option<Duration>,
    /// 帧索引
    frame_index: u64,
    /// 平面数据（CPU 内存）
    planes: Option<Vec<PlaneData>>,
    /// GPU 纹理句柄（零拷贝模式）
    gpu_texture: Option<GpuTextureHandle>,
    /// 是否为零拷贝帧
    is_zero_copy: bool,
}

impl VideoFrame {
    /// 创建一个新的空视频帧
    ///
    /// # 参数
    /// * `format` - 像素格式
    /// * `width` - 宽度
    /// * `height` - 高度
    pub fn new(format: PixelFormat, width: u32, height: u32) -> Self {
        Self {
            pixel_format: format,
            color_space: ColorSpace::BT709,
            width,
            height,
            frame_type: FrameType::default(),
            pts: None,
            dts: None,
            frame_index: 0,
            planes: None,
            gpu_texture: None,
            is_zero_copy: false,
        }
    }

    /// 创建一个带平面数据的视频帧
    ///
    /// # 参数
    /// * `format` - 像素格式
    /// * `width` - 宽度
    /// * `height` - 高度
    /// * `planes` - 平面数据
    pub fn with_planes(
        format: PixelFormat,
        width: u32,
        height: u32,
        planes: Vec<PlaneData>,
    ) -> Self {
        Self {
            pixel_format: format,
            color_space: ColorSpace::BT709,
            width,
            height,
            frame_type: FrameType::default(),
            pts: None,
            dts: None,
            frame_index: 0,
            planes: Some(planes),
            gpu_texture: None,
            is_zero_copy: false,
        }
    }

    /// 创建一个零拷贝视频帧（GPU 纹理）
    ///
    /// # 参数
    /// * `format` - 像素格式
    /// * `width` - 宽度
    /// * `height` - 高度
    /// * `texture` - GPU 纹理句柄
    pub fn with_gpu_texture(
        format: PixelFormat,
        width: u32,
        height: u32,
        texture: GpuTextureHandle,
    ) -> Self {
        Self {
            pixel_format: format,
            color_space: ColorSpace::BT709,
            width,
            height,
            frame_type: FrameType::default(),
            pts: None,
            dts: None,
            frame_index: 0,
            planes: None,
            gpu_texture: Some(texture),
            is_zero_copy: true,
        }
    }

    /// 获取像素格式
    pub fn pixel_format(&self) -> PixelFormat {
        self.pixel_format
    }

    /// 获取颜色空间
    pub fn color_space(&self) -> ColorSpace {
        self.color_space
    }

    /// 设置颜色空间
    ///
    /// # 参数
    /// * `color_space` - 颜色空间
    pub fn set_color_space(&mut self, color_space: ColorSpace) {
        self.color_space = color_space;
    }

    /// 获取宽度
    pub fn width(&self) -> u32 {
        self.width
    }

    /// 获取高度
    pub fn height(&self) -> u32 {
        self.height
    }

    /// 获取帧类型
    pub fn frame_type(&self) -> FrameType {
        self.frame_type
    }

    /// 设置帧类型
    ///
    /// # 参数
    /// * `frame_type` - 帧类型
    pub fn set_frame_type(&mut self, frame_type: FrameType) {
        self.frame_type = frame_type;
    }

    /// 检查是否为关键帧
    pub fn is_key_frame(&self) -> bool {
        self.frame_type.is_key_frame()
    }

    /// 获取显示时间戳
    pub fn pts(&self) -> Option<Duration> {
        self.pts
    }

    /// 设置显示时间戳
    ///
    /// # 参数
    /// * `pts` - 显示时间戳
    pub fn set_pts(&mut self, pts: Duration) {
        self.pts = Some(pts);
    }

    /// 获取解码时间戳
    pub fn dts(&self) -> Option<Duration> {
        self.dts
    }

    /// 设置解码时间戳
    ///
    /// # 参数
    /// * `dts` - 解码时间戳
    pub fn set_dts(&mut self, dts: Duration) {
        self.dts = Some(dts);
    }

    /// 获取帧索引
    pub fn frame_index(&self) -> u64 {
        self.frame_index
    }

    /// 设置帧索引
    ///
    /// # 参数
    /// * `index` - 帧索引
    pub fn set_frame_index(&mut self, index: u64) {
        self.frame_index = index;
    }

    /// 获取平面数据
    pub fn planes(&self) -> Option<&[PlaneData]> {
        self.planes.as_deref()
    }

    /// 获取可变平面数据
    pub fn planes_mut(&mut self) -> Option<&mut [PlaneData]> {
        self.planes.as_deref_mut()
    }

    /// 获取 GPU 纹理句柄
    pub fn gpu_texture(&self) -> Option<&GpuTextureHandle> {
        self.gpu_texture.as_ref()
    }

    /// 检查是否为零拷贝帧
    pub fn is_zero_copy(&self) -> bool {
        self.is_zero_copy
    }

    /// 检查是否有 CPU 可访问的数据
    pub fn has_cpu_data(&self) -> bool {
        self.planes.is_some()
    }

    /// 检查是否有 GPU 纹理
    pub fn has_gpu_texture(&self) -> bool {
        self.gpu_texture.is_some()
    }

    /// 获取平面数量
    pub fn plane_count(&self) -> usize {
        self.planes.as_ref().map_or(0, |p| p.len())
    }

    /// 计算帧大小（字节）
    ///
    /// 仅适用于有 CPU 数据的帧。
    pub fn size_bytes(&self) -> usize {
        self.planes.as_ref().map_or(0, |planes| {
            planes.iter().map(|p| p.data().len()).sum()
        })
    }

    /// 计算显示纵横比
    pub fn aspect_ratio(&self) -> f64 {
        if self.height == 0 {
            0.0
        } else {
            self.width as f64 / self.height as f64
        }
    }
}

/// 编码数据包
///
/// 包含待解码的压缩视频数据。
#[derive(Debug, Clone)]
pub struct EncodedPacket {
    /// 压缩数据
    data: Vec<u8>,
    /// 显示时间戳
    pts: Option<Duration>,
    /// 解码时间戳
    dts: Option<Duration>,
    /// 是否为关键帧
    is_key_frame: bool,
    /// 数据包索引
    packet_index: u64,
}

impl EncodedPacket {
    /// 创建一个新的编码数据包
    ///
    /// # 参数
    /// * `data` - 压缩数据
    pub fn new(data: Vec<u8>) -> Self {
        Self {
            data,
            pts: None,
            dts: None,
            is_key_frame: false,
            packet_index: 0,
        }
    }

    /// 获取压缩数据
    pub fn data(&self) -> &[u8] {
        &self.data
    }

    /// 获取可变压缩数据
    pub fn data_mut(&mut self) -> &mut [u8] {
        &mut self.data
    }

    /// 获取显示时间戳
    pub fn pts(&self) -> Option<Duration> {
        self.pts
    }

    /// 设置显示时间戳
    pub fn set_pts(&mut self, pts: Duration) {
        self.pts = Some(pts);
    }

    /// 获取解码时间戳
    pub fn dts(&self) -> Option<Duration> {
        self.dts
    }

    /// 设置解码时间戳
    pub fn set_dts(&mut self, dts: Duration) {
        self.dts = Some(dts);
    }

    /// 检查是否为关键帧
    pub fn is_key_frame(&self) -> bool {
        self.is_key_frame
    }

    /// 设置是否为关键帧
    pub fn set_key_frame(&mut self, is_key_frame: bool) {
        self.is_key_frame = is_key_frame;
    }

    /// 获取数据包索引
    pub fn packet_index(&self) -> u64 {
        self.packet_index
    }

    /// 设置数据包索引
    pub fn set_packet_index(&mut self, index: u64) {
        self.packet_index = index;
    }

    /// 获取数据大小
    pub fn size(&self) -> usize {
        self.data.len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_frame_type() {
        assert_eq!(FrameType::KeyFrame.name(), "I");
        assert_eq!(FrameType::PredictiveFrame.name(), "P");
        assert_eq!(FrameType::BiPredictiveFrame.name(), "B");
        assert_eq!(FrameType::Unknown.name(), "?");
        
        assert!(FrameType::KeyFrame.is_key_frame());
        assert!(!FrameType::PredictiveFrame.is_key_frame());
    }

    #[test]
    fn test_plane_data() {
        let data = vec![0u8; 100];
        let plane = PlaneData::new(data, 20, 10, 5);
        
        assert_eq!(plane.stride(), 20);
        assert_eq!(plane.width(), 10);
        assert_eq!(plane.height(), 5);
        assert_eq!(plane.data().len(), 100);
        
        // 测试行访问
        let row = plane.row(0);
        assert!(row.is_some());
        assert_eq!(row.unwrap().len(), 10);
        
        // 测试越界访问
        assert!(plane.row(5).is_none());
    }

    #[test]
    fn test_video_frame_basic() {
        let frame = VideoFrame::new(PixelFormat::NV12, 1920, 1080);
        
        assert_eq!(frame.pixel_format(), PixelFormat::NV12);
        assert_eq!(frame.width(), 1920);
        assert_eq!(frame.height(), 1080);
        assert_eq!(frame.color_space(), ColorSpace::BT709);
        assert_eq!(frame.frame_type(), FrameType::Unknown);
        assert!(frame.pts().is_none());
        assert!(frame.dts().is_none());
        assert_eq!(frame.frame_index(), 0);
        assert!(!frame.is_zero_copy());
        assert!(!frame.has_cpu_data());
        assert!(!frame.has_gpu_texture());
        
        // 测试纵横比
        assert!((frame.aspect_ratio() - 16.0/9.0).abs() < 0.01);
    }

    #[test]
    fn test_video_frame_with_planes() {
        // 创建 NV12 格式的平面数据
        // Y 平面：width * height
        let y_plane = PlaneData::new(vec![0u8; 1920 * 1080], 1920, 1920, 1080);
        // UV 平面：(width/2) * (height/2) * 2
        let uv_plane = PlaneData::new(vec![0u8; 960 * 540 * 2], 1920, 960, 540);
        
        let frame = VideoFrame::with_planes(
            PixelFormat::NV12,
            1920,
            1080,
            vec![y_plane, uv_plane],
        );
        
        assert!(frame.has_cpu_data());
        assert_eq!(frame.plane_count(), 2);
        assert!(frame.size_bytes() > 0);
    }

    #[test]
    fn test_video_frame_with_gpu_texture() {
        let texture = GpuTextureHandle::new(12345);
        let frame = VideoFrame::with_gpu_texture(
            PixelFormat::NV12,
            1920,
            1080,
            texture,
        );
        
        assert!(frame.is_zero_copy());
        assert!(frame.has_gpu_texture());
        assert!(!frame.has_cpu_data());
        
        let texture = frame.gpu_texture().unwrap();
        assert_eq!(texture.texture_id(), 12345);
    }

    #[test]
    fn test_video_frame_setters() {
        let mut frame = VideoFrame::new(PixelFormat::RGB24, 640, 480);
        
        frame.set_color_space(ColorSpace::SRGB);
        frame.set_frame_type(FrameType::KeyFrame);
        frame.set_pts(Duration::from_millis(100));
        frame.set_dts(Duration::from_millis(50));
        frame.set_frame_index(42);
        
        assert_eq!(frame.color_space(), ColorSpace::SRGB);
        assert_eq!(frame.frame_type(), FrameType::KeyFrame);
        assert!(frame.is_key_frame());
        assert_eq!(frame.pts(), Some(Duration::from_millis(100)));
        assert_eq!(frame.dts(), Some(Duration::from_millis(50)));
        assert_eq!(frame.frame_index(), 42);
    }

    #[test]
    fn test_encoded_packet() {
        let data = vec![0x00, 0x00, 0x00, 0x01, 0x67];
        let mut packet = EncodedPacket::new(data);
        
        assert_eq!(packet.size(), 5);
        assert_eq!(packet.data(), &[0x00, 0x00, 0x00, 0x01, 0x67]);
        assert!(!packet.is_key_frame());
        
        packet.set_pts(Duration::from_millis(33));
        packet.set_dts(Duration::from_millis(33));
        packet.set_key_frame(true);
        packet.set_packet_index(100);
        
        assert_eq!(packet.pts(), Some(Duration::from_millis(33)));
        assert_eq!(packet.dts(), Some(Duration::from_millis(33)));
        assert!(packet.is_key_frame());
        assert_eq!(packet.packet_index(), 100);
    }

    #[test]
    fn test_gpu_texture_handle() {
        let handle = GpuTextureHandle::new(99999);
        assert_eq!(handle.texture_id(), 99999);
    }
}
