use sha2::{Sha1, Digest};
use std::collections::HashMap;

use crate::models::{PasswordEntry, PasswordStrength, SecurityAuditReport, DuplicatePassword};
use crate::crypto::hash_password_for_comparison;

const COMMON_PASSWORDS: &[&str] = &[
    "123456", "password", "123456789", "12345678", "12345",
    "1234567", "1234567890", "admin", "qwerty", "abc123",
    "password1", "111111", "123123", "welcome", "monkey",
    "dragon", "master", "letmein", "sunshine", "princess",
    "qwerty123", "654321", "superman", "1qaz2wsx", "7777777",
    "121212", "000000", "qazwsx", "123qwe", "killer",
    "trustno1", "jordan23", "harley", "123456789a", "passw0rd",
];

#[tauri::command]
pub fn audit_password_strength(password: String) -> PasswordStrength {
    let mut score = 0;
    let mut issues = Vec::new();
    
    if password.len() < 8 {
        issues.push("密码长度小于8个字符".to_string());
    } else if password.len() >= 12 {
        score += 2;
    } else {
        score += 1;
    }
    
    if password.chars().any(|c| c.is_uppercase()) {
        score += 1;
    } else {
        issues.push("缺少大写字母".to_string());
    }
    
    if password.chars().any(|c| c.is_lowercase()) {
        score += 1;
    } else {
        issues.push("缺少小写字母".to_string());
    }
    
    if password.chars().any(|c| c.is_ascii_digit()) {
        score += 1;
    } else {
        issues.push("缺少数字".to_string());
    }
    
    if password.chars().any(|c| !c.is_alphanumeric()) {
        score += 1;
    } else {
        issues.push("缺少特殊符号".to_string());
    }
    
    if COMMON_PASSWORDS.contains(&password.to_lowercase().as_str()) {
        score = 0;
        issues.push("这是一个常见密码，请更换".to_string());
    }
    
    let label = if score <= 2 {
        "弱"
    } else if score <= 4 {
        "一般"
    } else if score <= 6 {
        "强"
    } else {
        "非常强"
    }.to_string();
    
    PasswordStrength {
        score: score as u8,
        label,
        issues,
    }
}

#[tauri::command]
pub fn check_duplicate_passwords(entries: Vec<PasswordEntry>) -> Vec<DuplicatePassword> {
    let mut password_map: HashMap<String, Vec<PasswordEntry>> = HashMap::new();
    
    for entry in entries {
        let hash = hash_password_for_comparison(&entry.password);
        password_map.entry(hash).or_default().push(entry);
    }
    
    password_map
        .into_iter()
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
    let hash = hex::encode(hasher.finalize()).to_uppercase();
    
    let prefix = &hash[..5];
    let suffix = &hash[5..];
    
    let client = reqwest::Client::new();
    let response = client
        .get(&format!("https://api.pwnedpasswords.com/range/{}", prefix))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    
    let body = response.text().await.map_err(|e| e.to_string())?;
    
    for line in body.lines() {
        let parts: Vec<&str> = line.split(':').collect();
        if parts[0] == suffix {
            return Ok(true);
        }
    }
    
    Ok(false)
}

#[tauri::command]
pub async fn get_security_audit_report(entries: Vec<PasswordEntry>) -> SecurityAuditReport {
    let mut weak_passwords = Vec::new();
    let mut pwned_passwords = Vec::new();
    
    for entry in &entries {
        let strength = audit_password_strength(entry.password.clone());
        if strength.score <= 2 {
            weak_passwords.push(entry.clone());
        }
        
        if check_pwned_password(entry.password.clone()).await.unwrap_or(false) {
            pwned_passwords.push(entry.clone());
        }
    }
    
    let duplicate_passwords = check_duplicate_passwords(entries.clone());
    
    SecurityAuditReport {
        total_entries: entries.len(),
        weak_passwords,
        duplicate_passwords,
        pwned_passwords,
        last_audit: chrono::Utc::now(),
    }
}
