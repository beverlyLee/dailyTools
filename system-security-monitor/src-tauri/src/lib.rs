use std::sync::Mutex;
use sysinfo::{CpuExt, DiskExt, NetworkExt, ProcessExt, System, SystemExt};
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use sqlx::{SqlitePool, sqlite::SqlitePoolOptions};
use rand::{Rng, thread_rng};
use rand_chacha::ChaCha20Rng;
use rand::SeedableRng;
use argon2::{Argon2, PasswordHasher, PasswordVerifier, password_hash::{SaltString, PasswordHash}};
use aes_gcm::{Aes256Gcm, Key, Nonce, Tag};
use aes_gcm::aead::{Aead, NewAead};
use sha2::{Sha256, Digest};
use regex::Regex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemResources {
    pub timestamp: DateTime<Utc>,
    pub cpu_usage: Vec<f32>,
    pub cpu_avg_usage: f32,
    pub memory_total: u64,
    pub memory_used: u64,
    pub memory_percentage: f32,
    pub swap_total: u64,
    pub swap_used: u64,
    pub disks: Vec<DiskInfo>,
    pub networks: Vec<NetworkInfo>,
    pub gpu_usage: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiskInfo {
    pub name: String,
    pub mount_point: String,
    pub total_space: u64,
    pub available_space: u64,
    pub used_space: u64,
    pub read_bytes: u64,
    pub write_bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkInfo {
    pub name: String,
    pub received_bytes: u64,
    pub transmitted_bytes: u64,
    pub packets_received: u64,
    pub packets_transmitted: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessInfo {
    pub pid: u32,
    pub name: String,
    pub cpu_usage: f32,
    pub memory_usage: u64,
    pub virtual_memory: u64,
    pub status: String,
    pub start_time: u64,
    pub run_time: u64,
    pub disk_read: u64,
    pub disk_write: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PasswordEntry {
    pub id: i64,
    pub title: String,
    pub username: String,
    pub password: String,
    pub url: Option<String>,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegexPattern {
    pub id: i64,
    pub name: String,
    pub pattern: String,
    pub description: String,
    pub category: String,
    pub created_at: DateTime<Utc>,
}

pub struct AppState {
    pub system: Mutex<System>,
    pub db_pool: Option<SqlitePool>,
    pub master_key: Option<Vec<u8>>,
}

impl Default for AppState {
    fn default() -> Self {
        let mut system = System::new_all();
        system.refresh_all();
        
        Self {
            system: Mutex::new(system),
            db_pool: None,
            master_key: None,
        }
    }
}

#[tauri::command]
fn get_system_resources(state: tauri::State<'_, AppState>) -> SystemResources {
    let mut sys = state.system.lock().unwrap();
    sys.refresh_all();
    
    let cpu_usage: Vec<f32> = sys.cpus().iter().map(|cpu| cpu.cpu_usage()).collect();
    let cpu_avg_usage = if cpu_usage.is_empty() {
        0.0
    } else {
        cpu_usage.iter().sum::<f32>() / cpu_usage.len() as f32
    };
    
    let memory_total = sys.total_memory();
    let memory_used = sys.used_memory();
    let memory_percentage = if memory_total > 0 {
        (memory_used as f32 / memory_total as f32) * 100.0
    } else {
        0.0
    };
    
    let swap_total = sys.total_swap();
    let swap_used = sys.used_swap();
    
    let disks: Vec<DiskInfo> = sys.disks().iter().map(|disk| {
        DiskInfo {
            name: disk.name().to_string_lossy().to_string(),
            mount_point: disk.mount_point().to_string_lossy().to_string(),
            total_space: disk.total_space(),
            available_space: disk.available_space(),
            used_space: disk.total_space().saturating_sub(disk.available_space()),
            read_bytes: 0,
            write_bytes: 0,
        }
    }).collect();
    
    let networks: Vec<NetworkInfo> = sys.networks().iter().map(|(name, network)| {
        NetworkInfo {
            name: name.to_string(),
            received_bytes: network.received(),
            transmitted_bytes: network.transmitted(),
            packets_received: network.packets_received(),
            packets_transmitted: network.packets_transmitted(),
        }
    }).collect();
    
    SystemResources {
        timestamp: Utc::now(),
        cpu_usage,
        cpu_avg_usage,
        memory_total,
        memory_used,
        memory_percentage,
        swap_total,
        swap_used,
        disks,
        networks,
        gpu_usage: None,
    }
}

#[tauri::command]
fn get_all_processes(state: tauri::State<'_, AppState>) -> Vec<ProcessInfo> {
    let mut sys = state.system.lock().unwrap();
    sys.refresh_all();
    
    sys.processes().iter().map(|(pid, process)| {
        ProcessInfo {
            pid: pid.as_u32(),
            name: process.name().to_string(),
            cpu_usage: process.cpu_usage(),
            memory_usage: process.memory(),
            virtual_memory: process.virtual_memory(),
            status: format!("{:?}", process.status()),
            start_time: process.start_time(),
            run_time: process.run_time(),
            disk_read: process.disk_usage().read_bytes,
            disk_write: process.disk_usage().written_bytes,
        }
    }).collect()
}

#[tauri::command]
fn kill_process(pid: u32) -> bool {
    let mut sys = System::new_all();
    sys.refresh_all();
    
    if let Some(process) = sys.process(sysinfo::Pid::from(pid as usize)) {
        process.kill()
    } else {
        false
    }
}

#[tauri::command]
async fn init_database(state: tauri::State<'_, AppState>) -> Result<(), String> {
    let app_data_dir = tauri::api::path::app_data_dir(&tauri::Config::default())
        .ok_or("无法获取应用数据目录")?;
    
    std::fs::create_dir_all(&app_data_dir).map_err(|e| e.to_string())?;
    
    let db_path = app_data_dir.join("system_security_monitor.db");
    let db_url = format!("sqlite://{}", db_path.to_string_lossy());
    
    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(&db_url)
        .await
        .map_err(|e| e.to_string())?;
    
    sqlx::query(r#"
        CREATE TABLE IF NOT EXISTS performance_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            cpu_usage TEXT NOT NULL,
            memory_usage INTEGER NOT NULL,
            memory_total INTEGER NOT NULL,
            disk_io_read INTEGER NOT NULL,
            disk_io_write INTEGER NOT NULL,
            network_rx INTEGER NOT NULL,
            network_tx INTEGER NOT NULL
        )
    "#)
    .execute(&pool)
    .await
    .map_err(|e| e.to_string())?;
    
    sqlx::query(r#"
        CREATE TABLE IF NOT EXISTS password_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            encrypted_data BLOB NOT NULL,
            nonce BLOB NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    "#)
    .execute(&pool)
    .await
    .map_err(|e| e.to_string())?;
    
    sqlx::query(r#"
        CREATE TABLE IF NOT EXISTS regex_patterns (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            pattern TEXT NOT NULL,
            description TEXT,
            category TEXT NOT NULL DEFAULT 'general',
            created_at TEXT NOT NULL
        )
    "#)
    .execute(&pool)
    .await
    .map_err(|e| e.to_string())?;
    
    let default_patterns = [
        ("邮箱", r#"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"#, "匹配标准邮箱格式", "communication"),
        ("手机号", r#"^1[3-9]\d{9}$"#, "匹配中国大陆手机号", "communication"),
        ("URL", r#"^https?://[^\s/$.?#].[^\s]*$"#, "匹配HTTP/HTTPS URL", "web"),
        ("IPv4地址", r#"^(\d{1,3}\.){3}\d{1,3}$"#, "匹配IPv4地址", "network"),
        ("身份证号", r#"^[1-9]\d{5}(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$"#, "匹配18位身份证号", "identity"),
    ];
    
    for (name, pattern, description, category) in default_patterns.iter() {
        let existing: Option<(i64,)> = sqlx::query_as("SELECT id FROM regex_patterns WHERE name = ?")
            .bind(name)
            .fetch_optional(&pool)
            .await
            .map_err(|e| e.to_string())?;
        
        if existing.is_none() {
            sqlx::query(r#"
                INSERT INTO regex_patterns (name, pattern, description, category, created_at)
                VALUES (?, ?, ?, ?, ?)
            "#)
            .bind(name)
            .bind(pattern)
            .bind(description)
            .bind(category)
            .bind(Utc::now().to_rfc3339())
            .execute(&pool)
            .await
            .map_err(|e| e.to_string())?;
        }
    }
    
    unsafe {
        let state_ptr = &*state as *const AppState as *mut AppState;
        (*state_ptr).db_pool = Some(pool);
    }
    
    Ok(())
}

#[tauri::command]
async fn save_performance_data(
    state: tauri::State<'_, AppState>,
    resources: SystemResources
) -> Result<(), String> {
    let pool = state.db_pool.as_ref().ok_or("数据库未初始化")?;
    
    let total_rx: u64 = resources.networks.iter().map(|n| n.received_bytes).sum();
    let total_tx: u64 = resources.networks.iter().map(|n| n.transmitted_bytes).sum();
    let total_read: u64 = resources.disks.iter().map(|d| d.read_bytes).sum();
    let total_write: u64 = resources.disks.iter().map(|d| d.write_bytes).sum();
    
    sqlx::query(r#"
        INSERT INTO performance_history (
            timestamp, cpu_usage, memory_usage, memory_total,
            disk_io_read, disk_io_write, network_rx, network_tx
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    "#)
    .bind(resources.timestamp.to_rfc3339())
    .bind(serde_json::to_string(&resources.cpu_usage).map_err(|e| e.to_string())?)
    .bind(resources.memory_used as i64)
    .bind(resources.memory_total as i64)
    .bind(total_read as i64)
    .bind(total_write as i64)
    .bind(total_rx as i64)
    .bind(total_tx as i64)
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
async fn get_performance_history(
    state: tauri::State<'_, AppState>,
    hours: i64
) -> Result<Vec<serde_json::Value>, String> {
    let pool = state.db_pool.as_ref().ok_or("数据库未初始化")?;
    
    let cutoff = Utc::now() - chrono::Duration::hours(hours);
    
    let rows: Vec<(String, String, i64, i64, i64, i64, i64, i64)> = sqlx::query_as(r#"
        SELECT timestamp, cpu_usage, memory_usage, memory_total,
               disk_io_read, disk_io_write, network_rx, network_tx
        FROM performance_history
        WHERE timestamp >= ?
        ORDER BY timestamp ASC
    "#)
    .bind(cutoff.to_rfc3339())
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;
    
    let history: Vec<serde_json::Value> = rows.into_iter().map(|(timestamp, cpu_usage, memory_usage, memory_total, disk_read, disk_write, network_rx, network_tx)| {
        let cpu_usage: Vec<f32> = serde_json::from_str(&cpu_usage).unwrap_or_default();
        let cpu_avg = if cpu_usage.is_empty() { 0.0 } else { cpu_usage.iter().sum::<f32>() / cpu_usage.len() as f32 };
        
        serde_json::json!({
            "timestamp": timestamp,
            "cpu_usage": cpu_usage,
            "cpu_avg": cpu_avg,
            "memory_usage": memory_usage,
            "memory_total": memory_total,
            "memory_percentage": if memory_total > 0 { (memory_usage as f64 / memory_total as f64) * 100.0 } else { 0.0 },
            "disk_read": disk_read,
            "disk_write": disk_write,
            "network_rx": network_rx,
            "network_tx": network_tx,
        })
    }).collect();
    
    Ok(history)
}

#[tauri::command]
fn generate_password(length: usize, include_symbols: bool, include_numbers: bool) -> String {
    const LOWERCASE: &str = "abcdefghijklmnopqrstuvwxyz";
    const UPPERCASE: &str = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const NUMBERS: &str = "0123456789";
    const SYMBOLS: &str = "!@#$%^&*()_+-=[]{}|;:,.<>?";
    
    let mut charset = LOWERCASE.to_string() + UPPERCASE;
    if include_numbers {
        charset += NUMBERS;
    }
    if include_symbols {
        charset += SYMBOLS;
    }
    
    let mut rng = thread_rng();
    (0..length)
        .map(|_| {
            let idx = rng.gen_range(0..charset.len());
            charset.chars().nth(idx).unwrap()
        })
        .collect()
}

#[tauri::command]
fn generate_passphrase(word_count: usize) -> String {
    const WORD_LIST: &[&str] = &[
        "apple", "banana", "cherry", "date", "elderberry", "fig", "grape", "honeydew",
        "island", "jungle", "kiwi", "lemon", "mango", "nectarine", "orange", "peach",
        "quince", "raspberry", "strawberry", "tangerine", "ugli", "vanilla", "watermelon",
        "apricot", "blueberry", "coconut", "dragonfruit", "eggplant", "feijoa", "gooseberry",
        "hawk", "iguana", "jaguar", "koala", "lion", "monkey", "newt", "octopus",
        "penguin", "quail", "rabbit", "shark", "tiger", "umbrella", "vulture", "whale",
        "xylophone", "yacht", "zebra", "forest", "mountain", "river", "ocean", "desert",
        "cloud", "rainbow", "sunset", "moonlight", "starlight", "thunder", "lightning", "breeze"
    ];
    
    let mut rng = thread_rng();
    let words: Vec<String> = (0..word_count)
        .map(|_| {
            let idx = rng.gen_range(0..WORD_LIST.len());
            let word = WORD_LIST[idx];
            let num: u8 = rng.gen_range(0..100);
            format!("{}{}", word, num)
        })
        .collect();
    
    words.join("-")
}

#[tauri::command]
async fn set_master_password(state: tauri::State<'_, AppState>, password: String) -> Result<(), String> {
    let salt = SaltString::generate(&mut thread_rng());
    
    let argon2 = Argon2::default();
    let password_hash = argon2.hash_password(password.as_bytes(), &salt)
        .map_err(|e| e.to_string())?;
    
    let mut hasher = Sha256::new();
    hasher.update(password.as_bytes());
    let key = hasher.finalize().to_vec();
    
    unsafe {
        let state_ptr = &*state as *const AppState as *mut AppState;
        (*state_ptr).master_key = Some(key);
    }
    
    Ok(())
}

#[tauri::command]
fn verify_master_password(state: tauri::State<'_, AppState>, password: String) -> bool {
    if let Some(ref key) = state.master_key {
        let mut hasher = Sha256::new();
        hasher.update(password.as_bytes());
        let derived = hasher.finalize().to_vec();
        derived == *key
    } else {
        false
    }
}

fn encrypt_data(data: &str, key: &[u8]) -> Result<(Vec<u8>, Vec<u8>), String> {
    let cipher = Aes256Gcm::new(Key::from_slice(key));
    let nonce = Aes256Gcm::generate_nonce(&mut thread_rng());
    let ciphertext = cipher.encrypt(&nonce, data.as_bytes())
        .map_err(|e| e.to_string())?;
    
    Ok((ciphertext, nonce.to_vec()))
}

fn decrypt_data(ciphertext: &[u8], nonce_bytes: &[u8], key: &[u8]) -> Result<String, String> {
    let cipher = Aes256Gcm::new(Key::from_slice(key));
    let nonce = Nonce::from_slice(nonce_bytes);
    let plaintext = cipher.decrypt(nonce, ciphertext)
        .map_err(|e| e.to_string())?;
    
    String::from_utf8(plaintext).map_err(|e| e.to_string())
}

#[tauri::command]
async fn save_password_entry(
    state: tauri::State<'_, AppState>,
    entry: PasswordEntry
) -> Result<i64, String> {
    let pool = state.db_pool.as_ref().ok_or("数据库未初始化")?;
    let key = state.master_key.as_ref().ok_or("主密码未设置")?;
    
    let data = serde_json::to_string(&entry).map_err(|e| e.to_string())?;
    let (encrypted, nonce) = encrypt_data(&data, key)?;
    
    let now = Utc::now().to_rfc3339();
    
    let id: (i64,) = sqlx::query_as(r#"
        INSERT INTO password_entries (encrypted_data, nonce, created_at, updated_at)
        VALUES (?, ?, ?, ?)
        RETURNING id
    "#)
    .bind(encrypted)
    .bind(nonce)
    .bind(&now)
    .bind(&now)
    .fetch_one(pool)
    .await
    .map_err(|e| e.to_string())?;
    
    Ok(id.0)
}

#[tauri::command]
async fn get_all_password_entries(
    state: tauri::State<'_, AppState>
) -> Result<Vec<PasswordEntry>, String> {
    let pool = state.db_pool.as_ref().ok_or("数据库未初始化")?;
    let key = state.master_key.as_ref().ok_or("主密码未设置")?;
    
    let rows: Vec<(i64, Vec<u8>, Vec<u8>, String, String)> = sqlx::query_as(r#"
        SELECT id, encrypted_data, nonce, created_at, updated_at
        FROM password_entries
        ORDER BY created_at DESC
    "#)
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;
    
    let mut entries = Vec::new();
    for (id, encrypted, nonce, created_at, updated_at) in rows {
        if let Ok(decrypted) = decrypt_data(&encrypted, &nonce, key) {
            if let Ok(mut entry) = serde_json::from_str::<PasswordEntry>(&decrypted) {
                entry.id = id;
                entries.push(entry);
            }
        }
    }
    
    Ok(entries)
}

#[tauri::command]
async fn update_password_entry(
    state: tauri::State<'_, AppState>,
    entry: PasswordEntry
) -> Result<(), String> {
    let pool = state.db_pool.as_ref().ok_or("数据库未初始化")?;
    let key = state.master_key.as_ref().ok_or("主密码未设置")?;
    
    let data = serde_json::to_string(&entry).map_err(|e| e.to_string())?;
    let (encrypted, nonce) = encrypt_data(&data, key)?;
    
    let now = Utc::now().to_rfc3339();
    
    sqlx::query(r#"
        UPDATE password_entries
        SET encrypted_data = ?, nonce = ?, updated_at = ?
        WHERE id = ?
    "#)
    .bind(encrypted)
    .bind(nonce)
    .bind(&now)
    .bind(entry.id)
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
async fn delete_password_entry(
    state: tauri::State<'_, AppState>,
    id: i64
) -> Result<(), String> {
    let pool = state.db_pool.as_ref().ok_or("数据库未初始化")?;
    
    sqlx::query("DELETE FROM password_entries WHERE id = ?")
        .bind(id)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
fn check_password_strength(password: &str) -> serde_json::Value {
    let mut score = 0;
    let mut suggestions = Vec::new();
    
    if password.len() >= 8 {
        score += 1;
    } else {
        suggestions.push("密码长度至少8个字符");
    }
    
    if password.len() >= 12 {
        score += 1;
    }
    
    if password.chars().any(|c| c.is_lowercase()) {
        score += 1;
    } else {
        suggestions.push("添加小写字母");
    }
    
    if password.chars().any(|c| c.is_uppercase()) {
        score += 1;
    } else {
        suggestions.push("添加大写字母");
    }
    
    if password.chars().any(|c| c.is_numeric()) {
        score += 1;
    } else {
        suggestions.push("添加数字");
    }
    
    if password.chars().any(|c| !c.is_alphanumeric()) {
        score += 1;
    } else {
        suggestions.push("添加特殊字符");
    }
    
    let common_patterns = ["123456", "password", "qwerty", "admin", "letmein", "welcome"];
    let is_common = common_patterns.iter().any(|&p| password.to_lowercase().contains(p));
    if is_common {
        score = score.saturating_sub(2);
        suggestions.push("避免使用常见密码模式");
    }
    
    let level = match score {
        0..=2 => "weak",
        3..=4 => "medium",
        5..=6 => "strong",
        _ => "very_strong",
    };
    
    serde_json::json!({
        "score": score,
        "max_score": 6,
        "level": level,
        "suggestions": suggestions
    })
}

#[tauri::command]
async fn check_pwned_password(password: &str) -> Result<bool, String> {
    let mut hasher = Sha256::new();
    hasher.update(password.as_bytes());
    let hash = hex::encode(hasher.finalize()).to_uppercase();
    
    let prefix = &hash[..5];
    let suffix = &hash[5..];
    
    let url = format!("https://api.pwnedpasswords.com/range/{}", prefix);
    
    let client = reqwest::blocking::Client::builder()
        .user_agent("SystemSecurityMonitor/1.0")
        .build()
        .map_err(|e| e.to_string())?;
    
    let response = client.get(&url)
        .send()
        .map_err(|e| e.to_string())?;
    
    let text = response.text().map_err(|e| e.to_string())?;
    
    let is_pwned = text.lines().any(|line| {
        let parts: Vec<&str> = line.split(':').collect();
        parts.first().map(|&s| s.trim() == suffix).unwrap_or(false)
    });
    
    Ok(is_pwned)
}

#[tauri::command]
fn test_regex(pattern: &str, test_text: &str) -> serde_json::Value {
    match Regex::new(pattern) {
        Ok(re) => {
            let matches: Vec<serde_json::Value> = re.find_iter(test_text)
                .enumerate()
                .map(|(i, m)| {
                    serde_json::json!({
                        "index": i,
                        "match": m.as_str(),
                        "start": m.start(),
                        "end": m.end()
                    })
                })
                .collect();
            
            let captures: Vec<serde_json::Value> = re.captures_iter(test_text)
                .map(|caps| {
                    let groups: Vec<Option<String>> = caps.iter()
                        .map(|m| m.map(|mat| mat.as_str().to_string()))
                        .collect();
                    serde_json::json!(groups)
                })
                .collect();
            
            serde_json::json!({
                "success": true,
                "is_match": re.is_match(test_text),
                "matches": matches,
                "captures": captures,
                "match_count": matches.len()
            })
        }
        Err(e) => {
            serde_json::json!({
                "success": false,
                "error": e.to_string()
            })
        }
    }
}

#[tauri::command]
fn explain_regex(pattern: &str) -> String {
    let mut explanation = String::new();
    explanation.push_str(&format!("正则表达式: {}\n\n", pattern));
    explanation.push_str("详细解释:\n");
    
    if let Ok(re) = Regex::new(pattern) {
        explanation.push_str("✓ 语法正确\n\n");
    } else {
        explanation.push_str("✗ 语法错误\n\n");
        return explanation;
    }
    
    let mut i = 0;
    let chars: Vec<char> = pattern.chars().collect();
    
    while i < chars.len() {
        match chars[i] {
            '^' => {
                explanation.push_str(&format!("  ^  匹配字符串的开始\n"));
                i += 1;
            }
            '$' => {
                explanation.push_str(&format!("  $  匹配字符串的结束\n"));
                i += 1;
            }
            '.' => {
                if i + 1 < chars.len() && chars[i + 1] == '*' {
                    explanation.push_str(&format!("  .* 匹配任意字符任意次数（贪婪模式）\n"));
                    i += 2;
                } else if i + 1 < chars.len() && chars[i + 1] == '+' {
                    explanation.push_str(&format!("  .+ 匹配任意字符至少一次\n"));
                    i += 2;
                } else if i + 1 < chars.len() && chars[i + 1] == '?' {
                    explanation.push_str(&format!("  .? 匹配任意字符零次或一次\n"));
                    i += 2;
                } else {
                    explanation.push_str(&format!("  .   匹配任意单个字符（除换行符）\n"));
                    i += 1;
                }
            }
            '*' => {
                explanation.push_str(&format!("  *   匹配前面的元素零次或多次\n"));
                i += 1;
            }
            '+' => {
                explanation.push_str(&format!("  +   匹配前面的元素一次或多次\n"));
                i += 1;
            }
            '?' => {
                if i > 0 && (chars[i-1] == '*' || chars[i-1] == '+' || chars[i-1] == '?') {
                    explanation.push_str(&format!("  ?   非贪婪模式（尽可能少匹配）\n"));
                } else {
                    explanation.push_str(&format!("  ?   匹配前面的元素零次或一次\n"));
                }
                i += 1;
            }
            '[' => {
                let mut j = i + 1;
                let mut char_class = String::from("[");
                while j < chars.len() && chars[j] != ']' {
                    char_class.push(chars[j]);
                    j += 1;
                }
                if j < chars.len() {
                    char_class.push(']');
                    explanation.push_str(&format!("  {}  字符类: 匹配其中任意一个字符\n", char_class));
                    
                    if char_class.contains("a-z") || char_class.contains("A-Z") {
                        explanation.push_str("        包含字母范围\n");
                    }
                    if char_class.contains("0-9") {
                        explanation.push_str("        包含数字范围\n");
                    }
                    
                    i = j + 1;
                } else {
                    explanation.push_str(&format!("  [   未闭合的字符类\n"));
                    i += 1;
                }
            }
            '(' => {
                let mut j = i + 1;
                let mut group = String::from("(");
                let mut depth = 1;
                
                while j < chars.len() && depth > 0 {
                    if chars[j] == '(' { depth += 1; }
                    if chars[j] == ')' { depth -= 1; }
                    group.push(chars[j]);
                    j += 1;
                }
                
                if chars[i+1] == '?' {
                    if i + 2 < chars.len() && chars[i+2] == ':' {
                        explanation.push_str(&format!("  (?:...)  非捕获组\n"));
                    } else if i + 2 < chars.len() && chars[i+2] == '=' {
                        explanation.push_str(&format!("  (?=...)  正向前瞻\n"));
                    } else if i + 2 < chars.len() && chars[i+2] == '!' {
                        explanation.push_str(&format!("  (?!...)  负向前瞻\n"));
                    } else {
                        explanation.push_str(&format!("  {}  捕获组\n", group));
                    }
                } else {
                    explanation.push_str(&format!("  {}  捕获组\n", group));
                }
                i = j;
            }
            '|' => {
                explanation.push_str(&format!("  |   或操作符（匹配左边或右边）\n"));
                i += 1;
            }
            '\\' => {
                if i + 1 < chars.len() {
                    match chars[i+1] {
                        'd' => explanation.push_str(&format!("  \\d  匹配任意数字 [0-9]\n")),
                        'D' => explanation.push_str(&format!("  \\D  匹配任意非数字\n")),
                        'w' => explanation.push_str(&format!("  \\w  匹配单词字符 [a-zA-Z0-9_]\n")),
                        'W' => explanation.push_str(&format!("  \\W  匹配非单词字符\n")),
                        's' => explanation.push_str(&format!("  \\s  匹配空白字符\n")),
                        'S' => explanation.push_str(&format!("  \\S  匹配非空白字符\n")),
                        'b' => explanation.push_str(&format!("  \\b  单词边界\n")),
                        'B' => explanation.push_str(&format!("  \\B  非单词边界\n")),
                        'n' => explanation.push_str(&format!("  \\n  换行符\n")),
                        't' => explanation.push_str(&format!("  \\t  制表符\n")),
                        'r' => explanation.push_str(&format!("  \\r  回车符\n")),
                        c => explanation.push_str(&format!("  \\{}  转义字符 '{}'\n", c, c)),
                    }
                    i += 2;
                } else {
                    explanation.push_str(&format!("  \\   不完整的转义序列\n"));
                    i += 1;
                }
            }
            '{' => {
                let mut j = i + 1;
                let mut quantifier = String::from("{");
                while j < chars.len() && chars[j] != '}' {
                    quantifier.push(chars[j]);
                    j += 1;
                }
                if j < chars.len() {
                    quantifier.push('}');
                    let q = &quantifier[1..quantifier.len()-1];
                    if q.contains(',') {
                        let parts: Vec<&str> = q.split(',').collect();
                        if parts.len() == 2 {
                            if parts[1].is_empty() {
                                explanation.push_str(&format!("  {}  匹配至少 {} 次\n", quantifier, parts[0]));
                            } else {
                                explanation.push_str(&format!("  {}  匹配 {} 到 {} 次\n", quantifier, parts[0], parts[1]));
                            }
                        }
                    } else {
                        explanation.push_str(&format!("  {}  匹配恰好 {} 次\n", quantifier, q));
                    }
                    i = j + 1;
                } else {
                    explanation.push_str(&format!("  {{   未闭合的量词\n"));
                    i += 1;
                }
            }
            c => {
                explanation.push_str(&format!("  {}   匹配字符 '{}'\n", c, c));
                i += 1;
            }
        }
    }
    
    explanation
}

#[tauri::command]
async fn save_regex_pattern(
    state: tauri::State<'_, AppState>,
    name: String,
    pattern: String,
    description: Option<String>,
    category: String
) -> Result<i64, String> {
    let pool = state.db_pool.as_ref().ok_or("数据库未初始化")?;
    
    let id: (i64,) = sqlx::query_as(r#"
        INSERT INTO regex_patterns (name, pattern, description, category, created_at)
        VALUES (?, ?, ?, ?, ?)
        RETURNING id
    "#)
    .bind(&name)
    .bind(&pattern)
    .bind(&description)
    .bind(&category)
    .bind(Utc::now().to_rfc3339())
    .fetch_one(pool)
    .await
    .map_err(|e| e.to_string())?;
    
    Ok(id.0)
}

#[tauri::command]
async fn get_all_regex_patterns(
    state: tauri::State<'_, AppState>
) -> Result<Vec<RegexPattern>, String> {
    let pool = state.db_pool.as_ref().ok_or("数据库未初始化")?;
    
    let rows: Vec<(i64, String, String, Option<String>, String, String)> = sqlx::query_as(r#"
        SELECT id, name, pattern, description, category, created_at
        FROM regex_patterns
        ORDER BY category, name
    "#)
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;
    
    let patterns: Vec<RegexPattern> = rows.into_iter().map(|(id, name, pattern, description, category, created_at)| {
        RegexPattern {
            id,
            name,
            pattern,
            description: description.unwrap_or_default(),
            category,
            created_at: DateTime::parse_from_rfc3339(&created_at).unwrap_or_else(|_| Utc::now()).into(),
        }
    }).collect();
    
    Ok(patterns)
}

#[tauri::command]
async fn delete_regex_pattern(
    state: tauri::State<'_, AppState>,
    id: i64
) -> Result<(), String> {
    let pool = state.db_pool.as_ref().ok_or("数据库未初始化")?;
    
    sqlx::query("DELETE FROM regex_patterns WHERE id = ?")
        .bind(id)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;
    
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            get_system_resources,
            get_all_processes,
            kill_process,
            init_database,
            save_performance_data,
            get_performance_history,
            generate_password,
            generate_passphrase,
            set_master_password,
            verify_master_password,
            save_password_entry,
            get_all_password_entries,
            update_password_entry,
            delete_password_entry,
            check_password_strength,
            check_pwned_password,
            test_regex,
            explain_regex,
            save_regex_pattern,
            get_all_regex_patterns,
            delete_regex_pattern,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
