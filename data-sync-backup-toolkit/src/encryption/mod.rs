pub mod aes;
pub mod chacha;
pub mod key_management;

pub use aes::*;
pub use chacha::*;
pub use key_management::*;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub enum EncryptionAlgorithm {
    Aes256Gcm,
    ChaCha20Poly1305,
    None,
}

impl Default for EncryptionAlgorithm {
    fn default() -> Self {
        EncryptionAlgorithm::Aes256Gcm
    }
}

pub trait Encryptor {
    fn encrypt(&self, plaintext: &[u8], key: &[u8]) -> crate::Result<Vec<u8>>;
    fn decrypt(&self, ciphertext: &[u8], key: &[u8]) -> crate::Result<Vec<u8>>;
}

pub struct EncryptionEngine {
    algorithm: EncryptionAlgorithm,
}

impl EncryptionEngine {
    pub fn new(algorithm: EncryptionAlgorithm) -> Self {
        Self { algorithm }
    }
    
    pub fn encrypt(&self, plaintext: &[u8], key: &[u8]) -> crate::Result<Vec<u8>> {
        match self.algorithm {
            EncryptionAlgorithm::Aes256Gcm => aes_encrypt(plaintext, key),
            EncryptionAlgorithm::ChaCha20Poly1305 => chacha_encrypt(plaintext, key),
            EncryptionAlgorithm::None => Ok(plaintext.to_vec()),
        }
    }
    
    pub fn decrypt(&self, ciphertext: &[u8], key: &[u8]) -> crate::Result<Vec<u8>> {
        match self.algorithm {
            EncryptionAlgorithm::Aes256Gcm => aes_decrypt(ciphertext, key),
            EncryptionAlgorithm::ChaCha20Poly1305 => chacha_decrypt(ciphertext, key),
            EncryptionAlgorithm::None => Ok(ciphertext.to_vec()),
        }
    }
}
