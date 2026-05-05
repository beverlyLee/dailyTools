use sha2::{Sha256, Digest};
use std::fs::File;
use std::io::{Read, BufReader};
use crate::Result;

pub fn calculate_sha256(data: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(data);
    let result = hasher.finalize();
    hex::encode(result)
}

pub fn calculate_file_hash(file_path: &std::path::Path) -> Result<String> {
    let file = File::open(file_path)?;
    let mut reader = BufReader::new(file);
    let mut hasher = Sha256::new();
    let mut buffer = [0; 8192];
    
    loop {
        let bytes_read = reader.read(&mut buffer)?;
        if bytes_read == 0 {
            break;
        }
        hasher.update(&buffer[..bytes_read]);
    }
    
    let result = hasher.finalize();
    Ok(hex::encode(result))
}

pub fn compare_files(path1: &std::path::Path, path2: &std::path::Path) -> Result<bool> {
    let hash1 = calculate_file_hash(path1)?;
    let hash2 = calculate_file_hash(path2)?;
    Ok(hash1 == hash2)
}
