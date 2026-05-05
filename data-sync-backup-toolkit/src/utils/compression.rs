use serde::{Deserialize, Serialize};
use std::io::{Read, Write, Cursor};
use flate2::{read::GzDecoder, write::GzEncoder, Compression};
use zstd::stream::{Decoder as ZstdDecoder, Encoder as ZstdEncoder};
use crate::Result;
use crate::DsbtError;

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub enum CompressionType {
    Gzip,
    Zstd,
    None,
}

impl Default for CompressionType {
    fn default() -> Self {
        CompressionType::Zstd
    }
}

pub fn compress(data: &[u8], compression_type: CompressionType) -> Result<Vec<u8>> {
    match compression_type {
        CompressionType::Gzip => compress_gzip(data),
        CompressionType::Zstd => compress_zstd(data),
        CompressionType::None => Ok(data.to_vec()),
    }
}

pub fn decompress(data: &[u8], compression_type: CompressionType) -> Result<Vec<u8>> {
    match compression_type {
        CompressionType::Gzip => decompress_gzip(data),
        CompressionType::Zstd => decompress_zstd(data),
        CompressionType::None => Ok(data.to_vec()),
    }
}

fn compress_gzip(data: &[u8]) -> Result<Vec<u8>> {
    let mut encoder = GzEncoder::new(Vec::new(), Compression::default());
    encoder.write_all(data)?;
    encoder.finish().map_err(|e| DsbtError::Other(format!("Gzip压缩错误: {}", e)))
}

fn decompress_gzip(data: &[u8]) -> Result<Vec<u8>> {
    let mut decoder = GzDecoder::new(Cursor::new(data));
    let mut result = Vec::new();
    decoder.read_to_end(&mut result)?;
    Ok(result)
}

fn compress_zstd(data: &[u8]) -> Result<Vec<u8>> {
    let mut encoder = ZstdEncoder::new(Vec::new(), 3)?;
    encoder.write_all(data)?;
    encoder.finish().map_err(|e| DsbtError::Other(format!("Zstd压缩错误: {}", e)))
}

fn decompress_zstd(data: &[u8]) -> Result<Vec<u8>> {
    let mut decoder = ZstdDecoder::new(Cursor::new(data))?;
    let mut result = Vec::new();
    decoder.read_to_end(&mut result)?;
    Ok(result)
}
