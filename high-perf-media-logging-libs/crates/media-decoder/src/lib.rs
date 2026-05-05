//! 高性能跨平台硬件加速视频解码库
//!
//! 该库提供了跨平台的硬件加速视频解码功能，特别适用于高性能多媒体处理场景。
//! 主要特性：
//! - 跨平台支持：Windows (DirectX), Linux (VA-API), macOS (VideoToolbox)
//! - 硬件加速：利用 GPU 进行视频解码
//! - 零拷贝：CPU 到 GPU 的零拷贝数据路径
//! - 多格式输出：NV12 或 RGB 纹理
//! - 异步处理：基于 async/await 的异步解码

pub mod config;
pub mod decoder;
pub mod error;
pub mod frame;
pub mod format;
pub mod platform;
pub mod texture;

pub use config::*;
pub use decoder::*;
pub use error::*;
pub use frame::*;
pub use format::*;
pub use platform::*;
pub use texture::*;
