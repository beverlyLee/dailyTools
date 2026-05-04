use sha2::{Sha1, Digest};
use std::collections::HashMap;
use chrono::Utc;
use reqwest::Client;

use crate::models::{PasswordEntry, PasswordStrength, DuplicatePassword, SecurityAuditReport};
use crate::password_generator::calculate_password_strength;
use crate::crypto::hash_password_for_comparison;

#[tauri::command]
pub fn audit_password_strength(password: String) -> PasswordStrength {
    let (score, issues) = calculate_password_strength(&password);
    
    let label = match score {
        0..=3 => "弱",
        4..=6 => "中等",
        7..=8 => "强",
        9..=10 => "非常强",
        _ => "未知",
    };
    
    PasswordStrength {
        score,
        label: label.to_string(),
        issues,
    }
}

#[tauri::command]
pub fn check_duplicate_passwords(entries: Vec<PasswordEntry>) -> Vec<DuplicatePassword> {
    let mut password_map: HashMap<String, Vec<PasswordEntry>> = HashMap::new();
    
    for entry in entries {
        let password_hash = hash_password_for_comparison(&entry.password);
        password_map.entry(password_hash)
            .or_default()
            .push(entry);
    }
    
    password_map.into_iter()
        .filter(|(_, entries)| entries.len() > 1)
        .map(|(password_hash, entries)| DuplicatePassword {
            password_hash,
            entries,
        })
        .collect()
}

#[tauri::command]
pub async fn check_pwned_password(password: String) -> Result<bool, String> {
    let mut hasher = Sha1::new();
    hasher.update(password.as_bytes());
    let result = hasher.finalize();
    let hash_hex = hex::encode(result).to_uppercase();
    
    let prefix = &hash_hex[0..5];
    let suffix = &hash_hex[5..];
    
    let client = Client::new();
    let url = format!("https://api.pwnedpasswords.com/range/{}", prefix);
    
    let response = client.get(&url)
        .header("User-Agent", "LocalPasswordManager/1.0")
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;
    
    let body = response.text()
        .await
        .map_err(|e| format!("读取响应失败: {}", e))?;
    
    for line in body.lines() {
        let parts: Vec<&str> = line.split(':').collect();
        if parts.len() >= 2 {
            let hash_suffix = parts[0].trim();
            if hash_suffix == suffix {
                return Ok(true);
            }
        }
    }
    
    Ok(false)
}

async fn check_multiple_pwned_passwords(passwords: &[String]) -> HashMap<String, bool> {
    let mut results = HashMap::new();
    
    for password in passwords {
        match check_pwned_password(password.clone()).await {
            Ok(is_pwned) => {
                results.insert(password.clone(), is_pwned);
            }
            Err(_) => {
                results.insert(password.clone(), false);
            }
        }
    }
    
    results
}

#[tauri::command]
pub async fn get_security_audit_report(entries: Vec<PasswordEntry>) -> SecurityAuditReport {
    let total_entries = entries.len();
    
    let mut weak_passwords = Vec::new();
    let mut passwords_to_check = Vec::new();
    
    for entry in &entries {
        let (score, _) = calculate_password_strength(&entry.password);
        if score <= 4 {
            weak_passwords.push(entry.clone());
        }
        passwords_to_check.push(entry.password.clone());
    }
    
    let duplicate_passwords = check_duplicate_passwords(entries.clone());
    
    let pwned_results = check_multiple_pwned_passwords(&passwords_to_check).await;
    let mut pwned_passwords = Vec::new();
    
    for entry in entries {
        if let Some(&is_pwned) = pwned_results.get(&entry.password) {
            if is_pwned {
                pwned_passwords.push(entry);
            }
        }
    }
    
    SecurityAuditReport {
        total_entries,
        weak_passwords,
        duplicate_passwords,
        pwned_passwords,
        last_audit: Utc::now(),
    }
}
