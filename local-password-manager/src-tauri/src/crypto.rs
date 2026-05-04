use argon2::{
    password_hash::{
        rand_core::OsRng,
        PasswordHash, PasswordHasher, PasswordVerifier, SaltString
    },
    Argon2
};
use aes_gcm::{
    aead::{Aead, KeyInit, OsRng as AesOsRng},
    Aes256Gcm, Nonce
};
use sha2::{Sha256, Digest};
use rand::RngCore;
use std::sync::Mutex;
use tauri::State;

use crate::models::AppState;

#[derive(Debug, thiserror::Error)]
pub enum CryptoError {
    #[error("Argon2 error: {0}")]
    Argon2Error(#[from] argon2::password_hash::Error),
    #[error("AES error: {0}")]
    AesError(#[from] aes_gcm::aead::Error),
    #[error("Vault is locked")]
    VaultLocked,
    #[error("Invalid master password")]
    InvalidMasterPassword,
}

impl serde::Serialize for CryptoError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

pub fn hash_master_password(password: &str) -> Result<String, CryptoError> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    
    let password_hash = argon2.hash_password(password.as_bytes(), &salt)?;
    Ok(password_hash.to_string())
}

pub fn verify_master_password(password: &str, hash: &str) -> Result<bool, CryptoError> {
    let parsed_hash = PasswordHash::new(hash)?;
    let argon2 = Argon2::default();
    
    match argon2.verify_password(password.as_bytes(), &parsed_hash) {
        Ok(_) => Ok(true),
        Err(argon2::password_hash::Error::Password) => Ok(false),
        Err(e) => Err(CryptoError::Argon2Error(e)),
    }
}

pub fn derive_encryption_key(password: &str, salt: &[u8]) -> Result<Vec<u8>, CryptoError> {
    let mut key = [0u8; 32];
    
    let argon2 = Argon2::new(
        argon2::Algorithm::Argon2id,
        argon2::Version::V0x13,
        argon2::Params::new(19456, 2, 1, Some(32)).unwrap()
    );
    
    argon2.hash_password_into(password.as_bytes(), salt, &mut key)
        .map_err(CryptoError::Argon2Error)?;
    
    Ok(key.to_vec())
}

pub fn encrypt_data(data: &[u8], key: &[u8]) -> Result<Vec<u8>, CryptoError> {
    let cipher = Aes256Gcm::new_from_slice(key)
        .map_err(|_| CryptoError::AesError(aes_gcm::aead::Error))?;
    
    let mut nonce_bytes = [0u8; 12];
    AesOsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);
    
    let ciphertext = cipher.encrypt(nonce, data)
        .map_err(CryptoError::AesError)?;
    
    let mut result = Vec::with_capacity(12 + ciphertext.len());
    result.extend_from_slice(&nonce_bytes);
    result.extend_from_slice(&ciphertext);
    
    Ok(result)
}

pub fn decrypt_data(encrypted_data: &[u8], key: &[u8]) -> Result<Vec<u8>, CryptoError> {
    if encrypted_data.len() < 12 {
        return Err(CryptoError::AesError(aes_gcm::aead::Error));
    }
    
    let cipher = Aes256Gcm::new_from_slice(key)
        .map_err(|_| CryptoError::AesError(aes_gcm::aead::Error))?;
    
    let (nonce_bytes, ciphertext) = encrypted_data.split_at(12);
    let nonce = Nonce::from_slice(nonce_bytes);
    
    let plaintext = cipher.decrypt(nonce, ciphertext)
        .map_err(CryptoError::AesError)?;
    
    Ok(plaintext)
}

pub fn hash_password_for_comparison(password: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(password.as_bytes());
    let result = hasher.finalize();
    hex::encode(result)
}

#[tauri::command]
pub fn lock_vault(state: State<'_, Mutex<AppState>>) -> Result<(), String> {
    let mut app_state = state.lock().map_err(|e| e.to_string())?;
    app_state.is_locked = true;
    app_state.encryption_key = None;
    Ok(())
}

#[tauri::command]
pub fn is_vault_locked(state: State<'_, Mutex<AppState>>) -> Result<bool, String> {
    let app_state = state.lock().map_err(|e| e.to_string())?;
    Ok(app_state.is_locked)
}
