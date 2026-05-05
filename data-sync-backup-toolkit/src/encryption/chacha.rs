use chacha20poly1305::{
    aead::{Aead, KeyInit},
    ChaCha20Poly1305, Nonce,
};
use rand::Rng;
use crate::Result;
use crate::DsbtError;

pub fn chacha_encrypt(plaintext: &[u8], key: &[u8]) -> Result<Vec<u8>> {
    if key.len() != 32 {
        return Err(DsbtError::Encryption(format!("ChaCha20-Poly1305密钥长度必须为32字节，当前为{}字节", key.len())));
    }
    
    let cipher = ChaCha20Poly1305::new_from_slice(key)
        .map_err(|e| DsbtError::Encryption(format!("创建ChaCha20加密器失败: {}", e)))?;
    
    let mut nonce_bytes = [0u8; 12];
    rand::thread_rng().fill(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);
    
    let ciphertext = cipher.encrypt(nonce, plaintext)
        .map_err(|e| DsbtError::Encryption(format!("ChaCha20加密失败: {}", e)))?;
    
    let mut result = Vec::with_capacity(12 + ciphertext.len());
    result.extend_from_slice(&nonce_bytes);
    result.extend_from_slice(&ciphertext);
    
    Ok(result)
}

pub fn chacha_decrypt(ciphertext_with_nonce: &[u8], key: &[u8]) -> Result<Vec<u8>> {
    if key.len() != 32 {
        return Err(DsbtError::Encryption(format!("ChaCha20-Poly1305密钥长度必须为32字节，当前为{}字节", key.len())));
    }
    
    if ciphertext_with_nonce.len() < 12 {
        return Err(DsbtError::Encryption("密文太短，缺少nonce".to_string()));
    }
    
    let cipher = ChaCha20Poly1305::new_from_slice(key)
        .map_err(|e| DsbtError::Encryption(format!("创建ChaCha20解密器失败: {}", e)))?;
    
    let (nonce_bytes, ciphertext) = ciphertext_with_nonce.split_at(12);
    let nonce = Nonce::from_slice(nonce_bytes);
    
    let plaintext = cipher.decrypt(nonce, ciphertext)
        .map_err(|e| DsbtError::Encryption(format!("ChaCha20解密失败: {}", e)))?;
    
    Ok(plaintext)
}
