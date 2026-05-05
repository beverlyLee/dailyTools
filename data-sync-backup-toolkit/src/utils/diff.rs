use diffy::{Patch, create_patch, apply_patch};
use serde::{Deserialize, Serialize};
use std::path::Path;
use crate::Result;
use crate::DsbtError;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileDiff {
    pub file_path: String,
    pub original_hash: String,
    pub modified_hash: String,
    pub patch: String,
}

pub fn generate_diff(original: &[u8], modified: &[u8]) -> Result<String> {
    let original_str = String::from_utf8_lossy(original);
    let modified_str = String::from_utf8_lossy(modified);
    
    Ok(create_patch(&original_str, &modified_str, 3))
}

pub fn apply_diff(original: &[u8], patch_str: &str) -> Result<Vec<u8>> {
    let original_str = String::from_utf8_lossy(original);
    let patch = Patch::from_str(patch_str)
        .map_err(|e| DsbtError::Other(format!("解析补丁失败: {}", e)))?;
    
    let result = apply_patch(&original_str, &patch)
        .map_err(|e| DsbtError::Other(format!("应用补丁失败: {}", e)))?;
    
    Ok(result.into_bytes())
}

pub fn compare_file_contents(path1: &Path, path2: &Path) -> Result<Option<FileDiff>> {
    let content1 = std::fs::read(path1)?;
    let content2 = std::fs::read(path2)?;
    
    let hash1 = crate::utils::hashing::calculate_sha256(&content1);
    let hash2 = crate::utils::hashing::calculate_sha256(&content2);
    
    if hash1 == hash2 {
        return Ok(None);
    }
    
    let patch = generate_diff(&content1, &content2)?;
    
    Ok(Some(FileDiff {
        file_path: path2.to_string_lossy().to_string(),
        original_hash: hash1,
        modified_hash: hash2,
        patch,
    }))
}
