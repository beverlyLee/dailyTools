use sqlx::{SqlitePool, sqlite::SqliteConnectOptions, Row};
use std::str::FromStr;
use std::sync::Mutex;
use tauri::State;
use chrono::{DateTime, Utc};
use serde_json;

use crate::models::{PasswordEntry, NewPasswordEntry, AppState};
use crate::crypto::{encrypt_data, decrypt_data, hash_master_password, verify_master_password, derive_encryption_key, CryptoError};

pub static DB_POOL: Mutex<Option<SqlitePool>> = Mutex::new(None);

pub fn set_global_db_pool(pool: SqlitePool) {
    let mut pool_guard = DB_POOL.lock().unwrap();
    *pool_guard = Some(pool);
}

pub fn get_global_db_pool() -> Result<SqlitePool, String> {
    let pool_guard = DB_POOL.lock().unwrap();
    if let Some(pool) = &*pool_guard {
        Ok(pool.clone())
    } else {
        Err("数据库未初始化".to_string())
    }
}

#[derive(Debug, thiserror::Error)]
pub enum DatabaseError {
    #[error("SQLx error: {0}")]
    SqlxError(#[from] sqlx::Error),
    #[error("Crypto error: {0}")]
    CryptoError(#[from] CryptoError),
    #[error("Serde error: {0}")]
    SerdeError(#[from] serde_json::Error),
    #[error("Vault is locked")]
    VaultLocked,
    #[error("Entry not found")]
    EntryNotFound,
}

impl serde::Serialize for DatabaseError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

async fn get_db_pool() -> Result<SqlitePool, DatabaseError> {
    let pool_guard = DB_POOL.lock().unwrap();
    if let Some(pool) = &*pool_guard {
        Ok(pool.clone())
    } else {
        Err(DatabaseError::SqlxError(sqlx::Error::PoolClosed))
    }
}

fn get_encryption_key(state: &State<'_, Mutex<AppState>>) -> Result<Vec<u8>, DatabaseError> {
    let app_state = state.lock().map_err(|_| DatabaseError::VaultLocked)?;
    if app_state.is_locked {
        return Err(DatabaseError::VaultLocked);
    }
    app_state.encryption_key.clone().ok_or(DatabaseError::VaultLocked)
}

#[tauri::command]
pub async fn initialize_database() -> Result<(), String> {
    let app_dir = dirs::data_dir()
        .ok_or("无法获取应用数据目录")?
        .join("security-regex-toolkit");
    
    std::fs::create_dir_all(&app_dir)
        .map_err(|e| format!("无法创建应用目录: {}", e))?;
    
    let db_path = app_dir.join("app.db");
    let db_url = format!("sqlite://{}", db_path.to_string_lossy());
    
    let options = SqliteConnectOptions::from_str(&db_url)
        .map_err(|e| format!("数据库连接选项错误: {}", e))?
        .create_if_missing(true);
    
    let pool = SqlitePool::connect_with(options)
        .await
        .map_err(|e| format!("无法连接到数据库: {}", e))?;
    
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS master_password (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            hash TEXT NOT NULL,
            salt BLOB NOT NULL,
            created_at TEXT NOT NULL
        )
        "#
    )
    .execute(&pool)
    .await
    .map_err(|e| format!("创建主密码表失败: {}", e))?;
    
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS password_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            encrypted_data BLOB NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            last_used TEXT
        )
        "#
    )
    .execute(&pool)
    .await
    .map_err(|e| format!("创建密码条目表失败: {}", e))?;
    
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS regex_patterns (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            pattern TEXT NOT NULL,
            flags TEXT DEFAULT '',
            description TEXT,
            category TEXT DEFAULT 'general',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        "#
    )
    .execute(&pool)
    .await
    .map_err(|e| format!("创建正则表达式表失败: {}", e))?;
    
    let result: Option<(i64,)> = sqlx::query_as(
        "SELECT id FROM regex_patterns LIMIT 1"
    )
    .fetch_optional(&pool)
    .await
    .map_err(|e| format!("检查正则表达式表失败: {}", e))?;
    
    if result.is_none() {
        let default_patterns = [
            ("邮箱地址", r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", "g", "匹配标准邮箱地址格式", "网络"),
            ("手机号码", r"1[3-9]\d{9}", "g", "匹配中国大陆手机号码", "联系方式"),
            ("URL地址", r"https?://[\w-]+(\.[\w-]+)+([\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-])?", "gi", "匹配HTTP/HTTPS URL地址", "网络"),
            ("IPv4地址", r"\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b", "g", "匹配IPv4地址", "网络"),
            ("日期格式", r"\d{4}[-/\\.]\d{1,2}[-/\\.]\d{1,2}", "g", "匹配YYYY-MM-DD等日期格式", "时间"),
            ("身份证号", r"[1-9]\d{5}(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx]", "g", "匹配18位中国大陆身份证号", "身份"),
        ];
        
        for (name, pattern, flags, description, category) in default_patterns.iter() {
            sqlx::query(
                "INSERT INTO regex_patterns (name, pattern, flags, description, category) VALUES (?, ?, ?, ?, ?)"
            )
            .bind(name)
            .bind(pattern)
            .bind(flags)
            .bind(description)
            .bind(category)
            .execute(&pool)
            .await
            .map_err(|e| format!("插入默认正则表达式失败: {}", e))?;
        }
    }
    
    let mut pool_guard = DB_POOL.lock().unwrap();
    *pool_guard = Some(pool);
    
    Ok(())
}

#[tauri::command]
pub async fn set_master_password(
    password: String,
    state: State<'_, Mutex<AppState>>
) -> Result<(), String> {
    let pool = get_db_pool().await.map_err(|e| e.to_string())?;
    
    let hash = hash_master_password(&password)
        .map_err(|e| e.to_string())?;
    
    let mut salt = [0u8; 16];
    rand::thread_rng().fill_bytes(&mut salt);
    
    let encryption_key = derive_encryption_key(&password, &salt)
        .map_err(|e| e.to_string())?;
    
    let created_at = Utc::now().to_rfc3339();
    
    let existing: Option<(i32,)> = sqlx::query_as(
        "SELECT id FROM master_password WHERE id = 1"
    )
    .fetch_optional(&pool)
    .await
    .map_err(|e| e.to_string())?;
    
    if existing.is_some() {
        sqlx::query(
            "UPDATE master_password SET hash = ?, salt = ?, created_at = ? WHERE id = 1"
        )
        .bind(&hash)
        .bind(&salt[..])
        .bind(&created_at)
        .execute(&pool)
        .await
        .map_err(|e| e.to_string())?;
    } else {
        sqlx::query(
            "INSERT INTO master_password (id, hash, salt, created_at) VALUES (1, ?, ?, ?)"
        )
        .bind(&hash)
        .bind(&salt[..])
        .bind(&created_at)
        .execute(&pool)
        .await
        .map_err(|e| e.to_string())?;
    }
    
    let mut app_state = state.lock().map_err(|e| e.to_string())?;
    app_state.is_locked = false;
    app_state.encryption_key = Some(encryption_key);
    
    Ok(())
}

#[tauri::command]
pub async fn verify_master_password(
    password: String,
    state: State<'_, Mutex<AppState>>
) -> Result<bool, String> {
    let pool = get_db_pool().await.map_err(|e| e.to_string())?;
    
    let result: Option<(String, Vec<u8>)> = sqlx::query_as(
        "SELECT hash, salt FROM master_password WHERE id = 1"
    )
    .fetch_optional(&pool)
    .await
    .map_err(|e| e.to_string())?;
    
    if let Some((hash, salt)) = result {
        let is_valid = verify_master_password(&password, &hash)
            .map_err(|e| e.to_string())?;
        
        if is_valid {
            let encryption_key = derive_encryption_key(&password, &salt)
                .map_err(|e| e.to_string())?;
            
            let mut app_state = state.lock().map_err(|e| e.to_string())?;
            app_state.is_locked = false;
            app_state.encryption_key = Some(encryption_key);
        }
        
        Ok(is_valid)
    } else {
        Ok(false)
    }
}

#[tauri::command]
pub async fn unlock_vault(
    password: String,
    state: State<'_, Mutex<AppState>>
) -> Result<bool, String> {
    verify_master_password(password, state).await
}

#[tauri::command]
pub async fn add_password_entry(
    entry: NewPasswordEntry,
    state: State<'_, Mutex<AppState>>
) -> Result<i64, String> {
    let pool = get_db_pool().await.map_err(|e| e.to_string())?;
    let key = get_encryption_key(&state).map_err(|e| e.to_string())?;
    
    let entry_json = serde_json::to_string(&entry)
        .map_err(|e| e.to_string())?;
    
    let encrypted_data = encrypt_data(entry_json.as_bytes(), &key)
        .map_err(|e| e.to_string())?;
    
    let now = Utc::now().to_rfc3339();
    
    let result = sqlx::query(
        r#"
        INSERT INTO password_entries (encrypted_data, created_at, updated_at)
        VALUES (?, ?, ?)
        "#
    )
    .bind(&encrypted_data)
    .bind(&now)
    .bind(&now)
    .execute(&pool)
    .await
    .map_err(|e| e.to_string())?;
    
    Ok(result.last_insert_rowid())
}

#[tauri::command]
pub async fn get_all_password_entries(
    state: State<'_, Mutex<AppState>>
) -> Result<Vec<PasswordEntry>, String> {
    let pool = get_db_pool().await.map_err(|e| e.to_string())?;
    let key = get_encryption_key(&state).map_err(|e| e.to_string())?;
    
    let rows: Vec<(i64, Vec<u8>, String, String, Option<String>)> = sqlx::query_as(
        r#"
        SELECT id, encrypted_data, created_at, updated_at, last_used
        FROM password_entries
        ORDER BY created_at DESC
        "#
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| e.to_string())?;
    
    let mut entries = Vec::new();
    
    for (id, encrypted_data, created_at, updated_at, last_used) in rows {
        let decrypted_data = decrypt_data(&encrypted_data, &key)
            .map_err(|e| e.to_string())?;
        
        let new_entry: NewPasswordEntry = serde_json::from_slice(&decrypted_data)
            .map_err(|e| e.to_string())?;
        
        let entry = PasswordEntry {
            id,
            title: new_entry.title,
            username: new_entry.username,
            password: new_entry.password,
            url: new_entry.url,
            notes: new_entry.notes,
            category: new_entry.category,
            created_at: DateTime::parse_from_rfc3339(&created_at)
                .map_err(|e| e.to_string())?
                .with_timezone(&Utc),
            updated_at: DateTime::parse_from_rfc3339(&updated_at)
                .map_err(|e| e.to_string())?
                .with_timezone(&Utc),
            last_used: last_used.map(|s| {
                DateTime::parse_from_rfc3339(&s)
                    .unwrap()
                    .with_timezone(&Utc)
            }),
        };
        
        entries.push(entry);
    }
    
    Ok(entries)
}

#[tauri::command]
pub async fn update_password_entry(
    id: i64,
    entry: NewPasswordEntry,
    state: State<'_, Mutex<AppState>>
) -> Result<(), String> {
    let pool = get_db_pool().await.map_err(|e| e.to_string())?;
    let key = get_encryption_key(&state).map_err(|e| e.to_string())?;
    
    let entry_json = serde_json::to_string(&entry)
        .map_err(|e| e.to_string())?;
    
    let encrypted_data = encrypt_data(entry_json.as_bytes(), &key)
        .map_err(|e| e.to_string())?;
    
    let now = Utc::now().to_rfc3339();
    
    let result = sqlx::query(
        r#"
        UPDATE password_entries
        SET encrypted_data = ?, updated_at = ?
        WHERE id = ?
        "#
    )
    .bind(&encrypted_data)
    .bind(&now)
    .bind(id)
    .execute(&pool)
    .await
    .map_err(|e| e.to_string())?;
    
    if result.rows_affected() == 0 {
        return Err("条目不存在".to_string());
    }
    
    Ok(())
}

#[tauri::command]
pub async fn delete_password_entry(
    id: i64,
    _state: State<'_, Mutex<AppState>>
) -> Result<(), String> {
    let pool = get_db_pool().await.map_err(|e| e.to_string())?;
    
    let result = sqlx::query(
        "DELETE FROM password_entries WHERE id = ?"
    )
    .bind(id)
    .execute(&pool)
    .await
    .map_err(|e| e.to_string())?;
    
    if result.rows_affected() == 0 {
        return Err("条目不存在".to_string());
    }
    
    Ok(())
}
