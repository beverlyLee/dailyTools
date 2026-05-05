use sqlx::{SqlitePool, Row};
use chrono::Utc;

use crate::models::{RegexPattern, NewRegexPattern};
use crate::database::get_global_db_pool;

#[tauri::command]
pub async fn get_all_regex_patterns() -> Result<Vec<RegexPattern>, String> {
    let pool = get_global_db_pool()?;
    
    let rows = sqlx::query(
        r#"
        SELECT id, name, pattern, flags, description, category, created_at, updated_at
        FROM regex_patterns
        ORDER BY created_at DESC
        "#
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| e.to_string())?;
    
    let mut patterns = Vec::new();
    
    for row in rows {
        let pattern = RegexPattern {
            id: row.get::<i64, _>("id"),
            name: row.get::<String, _>("name"),
            pattern: row.get::<String, _>("pattern"),
            flags: row.get::<String, _>("flags"),
            description: row.get::<Option<String>, _>("description"),
            category: row.get::<String, _>("category"),
            created_at: row.get::<String, _>("created_at"),
            updated_at: row.get::<String, _>("updated_at"),
        };
        patterns.push(pattern);
    }
    
    Ok(patterns)
}

#[tauri::command]
pub async fn add_regex_pattern(pattern: NewRegexPattern) -> Result<i64, String> {
    let pool = get_global_db_pool()?;
    let now = Utc::now().to_rfc3339();
    
    let result = sqlx::query(
        r#"
        INSERT INTO regex_patterns (name, pattern, flags, description, category, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        "#
    )
    .bind(&pattern.name)
    .bind(&pattern.pattern)
    .bind(pattern.flags.unwrap_or_default())
    .bind(pattern.description)
    .bind(pattern.category.unwrap_or_else(|| "general".to_string()))
    .bind(&now)
    .bind(&now)
    .execute(&pool)
    .await
    .map_err(|e| e.to_string())?;
    
    Ok(result.last_insert_rowid())
}

#[tauri::command]
pub async fn update_regex_pattern(id: i64, pattern: NewRegexPattern) -> Result<(), String> {
    let pool = get_global_db_pool()?;
    let now = Utc::now().to_rfc3339();
    
    let result = sqlx::query(
        r#"
        UPDATE regex_patterns
        SET name = ?, pattern = ?, flags = ?, description = ?, category = ?, updated_at = ?
        WHERE id = ?
        "#
    )
    .bind(&pattern.name)
    .bind(&pattern.pattern)
    .bind(pattern.flags.unwrap_or_default())
    .bind(pattern.description)
    .bind(pattern.category.unwrap_or_else(|| "general".to_string()))
    .bind(&now)
    .bind(id)
    .execute(&pool)
    .await
    .map_err(|e| e.to_string())?;
    
    if result.rows_affected() == 0 {
        return Err("正则表达式不存在".to_string());
    }
    
    Ok(())
}

#[tauri::command]
pub async fn delete_regex_pattern(id: i64) -> Result<(), String> {
    let pool = get_global_db_pool()?;
    
    let result = sqlx::query(
        "DELETE FROM regex_patterns WHERE id = ?"
    )
    .bind(id)
    .execute(&pool)
    .await
    .map_err(|e| e.to_string())?;
    
    if result.rows_affected() == 0 {
        return Err("正则表达式不存在".to_string());
    }
    
    Ok(())
}

#[tauri::command]
pub async fn get_regex_pattern_by_id(id: i64) -> Result<Option<RegexPattern>, String> {
    let pool = get_global_db_pool()?;
    
    let row = sqlx::query(
        r#"
        SELECT id, name, pattern, flags, description, category, created_at, updated_at
        FROM regex_patterns
        WHERE id = ?
        "#
    )
    .bind(id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| e.to_string())?;
    
    Ok(row.map(|row| RegexPattern {
        id: row.get::<i64, _>("id"),
        name: row.get::<String, _>("name"),
        pattern: row.get::<String, _>("pattern"),
        flags: row.get::<String, _>("flags"),
        description: row.get::<Option<String>, _>("description"),
        category: row.get::<String, _>("category"),
        created_at: row.get::<String, _>("created_at"),
        updated_at: row.get::<String, _>("updated_at"),
    }))
}
