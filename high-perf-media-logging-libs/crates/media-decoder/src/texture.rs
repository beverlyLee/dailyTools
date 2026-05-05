//! GPU 纹理接口
//!
//! 该模块定义了 GPU 纹理的抽象接口，用于零拷贝视频解码。

use std::sync::Arc;

use serde::{Deserialize, Serialize};

use crate::format::{ColorSpace, PixelFormat};

/// 纹理目标类型
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum TextureTarget {
    /// 2D 纹理
    Texture2D,
    /// 矩形纹理
    TextureRectangle,
    /// 外部图像（如 EGLImage）
    TextureExternal,
}

/// 纹理过滤模式
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum TextureFilter {
    /// 最近邻过滤
    Nearest,
    /// 线性过滤
    Linear,
}

/// 纹理包裹模式
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum TextureWrapMode {
    /// 重复
    Repeat,
    /// 截取
    ClampToEdge,
    /// 镜像重复
    MirroredRepeat,
}

/// 纹理参数配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TextureParameters {
    /// 最小化过滤模式
    min_filter: TextureFilter,
    /// 最大化过滤模式
    mag_filter: TextureFilter,
    /// S 轴包裹模式
    wrap_s: TextureWrapMode,
    /// T 轴包裹模式
    wrap_t: TextureWrapMode,
    /// 是否生成 mipmap
    generate_mipmap: bool,
}

impl Default for TextureParameters {
    fn default() -> Self {
        Self {
            min_filter: TextureFilter::Linear,
            mag_filter: TextureFilter::Linear,
            wrap_s: TextureWrapMode::ClampToEdge,
            wrap_t: TextureWrapMode::ClampToEdge,
            generate_mipmap: false,
        }
    }
}

impl TextureParameters {
    /// 创建默认的纹理参数
    pub fn new() -> Self {
        Self::default()
    }

    /// 设置最小化过滤模式
    pub fn min_filter(mut self, filter: TextureFilter) -> Self {
        self.min_filter = filter;
        self
    }

    /// 设置最大化过滤模式
    pub fn mag_filter(mut self, filter: TextureFilter) -> Self {
        self.mag_filter = filter;
        self
    }

    /// 设置 S 轴包裹模式
    pub fn wrap_s(mut self, mode: TextureWrapMode) -> Self {
        self.wrap_s = mode;
        self
    }

    /// 设置 T 轴包裹模式
    pub fn wrap_t(mut self, mode: TextureWrapMode) -> Self {
        self.wrap_t = mode;
        self
    }

    /// 设置是否生成 mipmap
    pub fn generate_mipmap(mut self, enable: bool) -> Self {
        self.generate_mipmap = enable;
        self
    }

    /// 获取最小化过滤模式
    pub fn get_min_filter(&self) -> TextureFilter {
        self.min_filter
    }

    /// 获取最大化过滤模式
    pub fn get_mag_filter(&self) -> TextureFilter {
        self.mag_filter
    }

    /// 获取 S 轴包裹模式
    pub fn get_wrap_s(&self) -> TextureWrapMode {
        self.wrap_s
    }

    /// 获取 T 轴包裹模式
    pub fn get_wrap_t(&self) -> TextureWrapMode {
        self.wrap_t
    }

    /// 检查是否生成 mipmap
    pub fn should_generate_mipmap(&self) -> bool {
        self.generate_mipmap
    }
}

/// GPU 纹理描述符
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TextureDescriptor {
    /// 像素格式
    pub format: PixelFormat,
    /// 颜色空间
    pub color_space: ColorSpace,
    /// 宽度
    pub width: u32,
    /// 高度
    pub height: u32,
    /// 纹理目标类型
    pub target: TextureTarget,
    /// 纹理参数
    pub parameters: TextureParameters,
    /// 是否支持零拷贝
    pub is_zero_copy: bool,
}

impl Default for TextureDescriptor {
    fn default() -> Self {
        Self {
            format: PixelFormat::NV12,
            color_space: ColorSpace::BT709,
            width: 0,
            height: 0,
            target: TextureTarget::Texture2D,
            parameters: TextureParameters::default(),
            is_zero_copy: false,
        }
    }
}

impl TextureDescriptor {
    /// 创建一个新的纹理描述符
    pub fn new(format: PixelFormat, width: u32, height: u32) -> Self {
        Self {
            format,
            width,
            height,
            ..Default::default()
        }
    }

    /// 设置颜色空间
    pub fn color_space(mut self, color_space: ColorSpace) -> Self {
        self.color_space = color_space;
        self
    }

    /// 设置纹理目标
    pub fn target(mut self, target: TextureTarget) -> Self {
        self.target = target;
        self
    }

    /// 设置纹理参数
    pub fn parameters(mut self, parameters: TextureParameters) -> Self {
        self.parameters = parameters;
        self
    }

    /// 启用零拷贝
    pub fn zero_copy(mut self, enable: bool) -> Self {
        self.is_zero_copy = enable;
        self
    }
}

/// GPU 纹理接口
///
/// 定义了 GPU 纹理的抽象接口，支持零拷贝模式。
pub trait GpuTexture: Send + Sync {
    /// 获取纹理 ID
    fn texture_id(&self) -> u64;

    /// 获取纹理描述符
    fn descriptor(&self) -> &TextureDescriptor;

    /// 获取像素格式
    fn format(&self) -> PixelFormat {
        self.descriptor().format
    }

    /// 获取宽度
    fn width(&self) -> u32 {
        self.descriptor().width
    }

    /// 获取高度
    fn height(&self) -> u32 {
        self.descriptor().height
    }

    /// 检查是否为零拷贝纹理
    fn is_zero_copy(&self) -> bool {
        self.descriptor().is_zero_copy
    }

    /// 将纹理数据读取到 CPU 内存
    ///
    /// 仅在非零拷贝模式下可用。
    fn read_to_cpu(&self) -> Option<Vec<u8>>;

    /// 销毁纹理资源
    fn destroy(&mut self);
}

/// 平台特定纹理句柄
#[derive(Debug, Clone)]
pub enum PlatformTextureHandle {
    /// OpenGL 纹理 ID
    OpenGL(u32),
    /// Direct3D 纹理指针
    Direct3D(*mut std::ffi::c_void),
    /// Vulkan 图像句柄
    Vulkan(u64),
    /// Metal 纹理引用
    Metal(*mut std::ffi::c_void),
    /// EGL 图像
    EGLImage(*mut std::ffi::c_void),
}

unsafe impl Send for PlatformTextureHandle {}
unsafe impl Sync for PlatformTextureHandle {}

/// 具体的 GPU 纹理实现
#[derive(Debug, Clone)]
pub struct Texture {
    /// 纹理 ID
    texture_id: u64,
    /// 纹理描述符
    descriptor: TextureDescriptor,
    /// 平台特定句柄
    platform_handle: Option<Arc<PlatformTextureHandle>>,
    /// 是否已销毁
    is_destroyed: bool,
}

impl Texture {
    /// 创建一个新的纹理
    pub fn new(descriptor: TextureDescriptor) -> Self {
        Self {
            texture_id: 0,
            descriptor,
            platform_handle: None,
            is_destroyed: false,
        }
    }

    /// 带纹理 ID 创建
    pub fn with_id(texture_id: u64, descriptor: TextureDescriptor) -> Self {
        Self {
            texture_id,
            descriptor,
            platform_handle: None,
            is_destroyed: false,
        }
    }

    /// 设置平台句柄
    pub fn set_platform_handle(&mut self, handle: PlatformTextureHandle) {
        self.platform_handle = Some(Arc::new(handle));
    }

    /// 获取平台句柄
    pub fn platform_handle(&self) -> Option<&PlatformTextureHandle> {
        self.platform_handle.as_deref()
    }

    /// 计算纹理大小（字节）
    pub fn size_bytes(&self) -> usize {
        match self.descriptor.format {
            PixelFormat::NV12 | PixelFormat::NV21 | PixelFormat::I420 | PixelFormat::YV12 => {
                (self.descriptor.width * self.descriptor.height * 3 / 2) as usize
            }
            PixelFormat::RGB24 | PixelFormat::BGR24 => {
                (self.descriptor.width * self.descriptor.height * 3) as usize
            }
            PixelFormat::RGBA32 | PixelFormat::BGRA32 | PixelFormat::ARGB32 => {
                (self.descriptor.width * self.descriptor.height * 4) as usize
            }
        }
    }
}

impl GpuTexture for Texture {
    fn texture_id(&self) -> u64 {
        self.texture_id
    }

    fn descriptor(&self) -> &TextureDescriptor {
        &self.descriptor
    }

    fn read_to_cpu(&self) -> Option<Vec<u8>> {
        if self.is_destroyed {
            return None;
        }
        if self.descriptor.is_zero_copy {
            None
        } else {
            Some(vec![0u8; self.size_bytes()])
        }
    }

    fn destroy(&mut self) {
        self.is_destroyed = true;
        self.platform_handle = None;
    }
}

/// 纹理池
///
/// 用于管理多个纹理资源，支持循环复用。
pub struct TexturePool {
    /// 可用纹理
    available: Vec<Texture>,
    /// 在用纹理
    in_use: Vec<Texture>,
    /// 纹理描述符
    descriptor: TextureDescriptor,
    /// 最大纹理数量
    max_count: usize,
}

impl TexturePool {
    /// 创建一个新的纹理池
    pub fn new(descriptor: TextureDescriptor, initial_count: usize, max_count: usize) -> Self {
        let mut available = Vec::with_capacity(initial_count);
        for i in 0..initial_count {
            available.push(Texture::with_id(i as u64, descriptor.clone()));
        }

        Self {
            available,
            in_use: Vec::new(),
            descriptor,
            max_count,
        }
    }

    /// 从池中获取一个纹理
    pub fn acquire(&mut self) -> Option<Texture> {
        if let Some(texture) = self.available.pop() {
            Some(texture)
        } else if self.in_use.len() < self.max_count {
            let id = (self.in_use.len() + self.available.len()) as u64;
            Some(Texture::with_id(id, self.descriptor.clone()))
        } else {
            None
        }
    }

    /// 将纹理归还到池中
    pub fn release(&mut self, texture: Texture) {
        self.available.push(texture);
    }

    /// 获取可用纹理数量
    pub fn available_count(&self) -> usize {
        self.available.len()
    }

    /// 获取在用纹理数量
    pub fn in_use_count(&self) -> usize {
        self.in_use.len()
    }

    /// 获取最大纹理数量
    pub fn max_count(&self) -> usize {
        self.max_count
    }

    /// 销毁池中的所有纹理
    pub fn clear(&mut self) {
        for texture in &mut self.available {
            texture.destroy();
        }
        self.available.clear();

        for texture in &mut self.in_use {
            texture.destroy();
        }
        self.in_use.clear();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_texture_descriptor() {
        let desc = TextureDescriptor::new(PixelFormat::NV12, 1920, 1080)
            .color_space(ColorSpace::BT709)
            .target(TextureTarget::Texture2D)
            .zero_copy(true);

        assert_eq!(desc.format, PixelFormat::NV12);
        assert_eq!(desc.width, 1920);
        assert_eq!(desc.height, 1080);
        assert_eq!(desc.color_space, ColorSpace::BT709);
        assert_eq!(desc.target, TextureTarget::Texture2D);
        assert!(desc.is_zero_copy);
    }

    #[test]
    fn test_texture_parameters() {
        let params = TextureParameters::new()
            .min_filter(TextureFilter::Nearest)
            .mag_filter(TextureFilter::Linear)
            .wrap_s(TextureWrapMode::Repeat)
            .wrap_t(TextureWrapMode::MirroredRepeat)
            .generate_mipmap(true);

        assert_eq!(params.get_min_filter(), TextureFilter::Nearest);
        assert_eq!(params.get_mag_filter(), TextureFilter::Linear);
        assert_eq!(params.get_wrap_s(), TextureWrapMode::Repeat);
        assert_eq!(params.get_wrap_t(), TextureWrapMode::MirroredRepeat);
        assert!(params.should_generate_mipmap());
    }

    #[test]
    fn test_texture_creation() {
        let desc = TextureDescriptor::new(PixelFormat::RGBA32, 640, 480);
        let texture = Texture::with_id(42, desc);

        assert_eq!(texture.texture_id(), 42);
        assert_eq!(texture.format(), PixelFormat::RGBA32);
        assert_eq!(texture.width(), 640);
        assert_eq!(texture.height(), 480);
        assert!(!texture.is_zero_copy());
    }

    #[test]
    fn test_texture_size_bytes() {
        // NV12: Y (1920*1080) + UV (960*540*2) = 1920*1080*1.5
        let desc = TextureDescriptor::new(PixelFormat::NV12, 1920, 1080);
        let texture = Texture::new(desc);
        let expected = 1920 * 1080 * 3 / 2;
        assert_eq!(texture.size_bytes(), expected as usize);

        // RGB24: 3 bytes per pixel
        let desc = TextureDescriptor::new(PixelFormat::RGB24, 640, 480);
        let texture = Texture::new(desc);
        let expected = 640 * 480 * 3;
        assert_eq!(texture.size_bytes(), expected as usize);

        // RGBA32: 4 bytes per pixel
        let desc = TextureDescriptor::new(PixelFormat::RGBA32, 1280, 720);
        let texture = Texture::new(desc);
        let expected = 1280 * 720 * 4;
        assert_eq!(texture.size_bytes(), expected as usize);
    }

    #[test]
    fn test_texture_pool() {
        let desc = TextureDescriptor::new(PixelFormat::NV12, 1920, 1080);
        let mut pool = TexturePool::new(desc, 4, 8);

        assert_eq!(pool.available_count(), 4);
        assert_eq!(pool.in_use_count(), 0);
        assert_eq!(pool.max_count(), 8);

        // 获取纹理
        let t1 = pool.acquire().unwrap();
        let t2 = pool.acquire().unwrap();

        assert_eq!(pool.available_count(), 2);

        // 归还纹理
        pool.release(t1);
        assert_eq!(pool.available_count(), 3);

        pool.release(t2);
        assert_eq!(pool.available_count(), 4);

        // 清理
        pool.clear();
        assert_eq!(pool.available_count(), 0);
    }

    #[test]
    fn test_texture_read_cpu() {
        // 非零拷贝模式可以读取
        let desc = TextureDescriptor::new(PixelFormat::RGBA32, 640, 480)
            .zero_copy(false);
        let texture = Texture::new(desc);
        assert!(texture.read_to_cpu().is_some());

        // 零拷贝模式不能直接读取
        let desc = TextureDescriptor::new(PixelFormat::NV12, 1920, 1080)
            .zero_copy(true);
        let texture = Texture::new(desc);
        assert!(texture.read_to_cpu().is_none());
    }

    #[test]
    fn test_texture_destroy() {
        let desc = TextureDescriptor::new(PixelFormat::RGBA32, 640, 480);
        let mut texture = Texture::new(desc);

        assert!(!texture.is_destroyed);
        texture.destroy();
        assert!(texture.is_destroyed);
    }
}
