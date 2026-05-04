use chrono::{DateTime, Local};
use serde::{Deserialize, Serialize};
use sqlx::sqlite::SqlitePool;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConversionSettings {
    pub start_time: f64,
    pub end_time: f64,
    pub width: i32,
    pub height: i32,
    pub fps: i32,
    pub loop_count: i32,
    pub colors: i32,
    pub format: String,
    pub quality: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConversionHistory {
    pub id: i64,
    pub original_path: String,
    pub output_path: String,
    pub settings: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConversionHistoryItem {
    pub id: i64,
    pub original_path: String,
    pub output_path: String,
    pub settings: ConversionSettings,
    pub created_at: String,
}

pub struct Database {
    pool: SqlitePool,
}

impl Database {
    pub async fn new() -> Result<Self, Box<dyn std::error::Error>> {
        let app_dir = dirs::data_local_dir()
            .ok_or("无法获取应用数据目录")?
            .join("video-to-gif-converter");
        
        std::fs::create_dir_all(&app_dir)?;
        
        let db_path = app_dir.join("converter.db");
        let db_url = format!("sqlite:{}", db_path.to_string_lossy());
        
        let pool = SqlitePool::connect(&db_url).await?;
        
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS conversion_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                original_path TEXT NOT NULL,
                output_path TEXT NOT NULL,
                settings TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            "#
        )
        .execute(&pool)
        .await?;
        
        sqlx::query(
            r#"
            CREATE INDEX IF NOT EXISTS idx_conversion_history_created_at 
            ON conversion_history(created_at)
            "#
        )
        .execute(&pool)
        .await?;
        
        Ok(Self { pool })
    }
    
    pub fn get_db_path() -> Result<PathBuf, Box<dyn std::error::Error>> {
        let app_dir = dirs::data_local_dir()
            .ok_or("无法获取应用数据目录")?
            .join("video-to-gif-converter");
        
        Ok(app_dir.join("converter.db"))
    }
    
    pub async fn add_conversion(
        &self,
        original_path: String,
        output_path: String,
        settings: &ConversionSettings,
    ) -> Result<ConversionHistory, sqlx::Error> {
        let now = Local::now().to_rfc3339();
        let settings_json = serde_json::to_string(settings).unwrap_or_default();
        
        let id = sqlx::query(
            r#"
            INSERT INTO conversion_history (original_path, output_path, settings, created_at)
            VALUES (?, ?, ?, ?)
            "#
        )
        .bind(&original_path)
        .bind(&output_path)
        .bind(&settings_json)
        .bind(&now)
        .execute(&self.pool)
        .await?
        .last_insert_rowid();
        
        Ok(ConversionHistory {
            id,
            original_path,
            output_path,
            settings: settings_json,
            created_at: now,
        })
    }
    
    pub async fn get_all_history(&self) -> Result<Vec<ConversionHistoryItem>, sqlx::Error> {
        let rows = sqlx::query_as!(
            ConversionHistory,
            r#"
            SELECT id, original_path, output_path, settings, created_at
            FROM conversion_history ORDER BY created_at DESC
            "#
        )
        .fetch_all(&self.pool)
        .await?;
        
        let mut items = Vec::new();
        for row in rows {
            let settings: ConversionSettings = serde_json::from_str(&row.settings)
                .unwrap_or_else(|_| ConversionSettings {
                    start_time: 0.0,
                    end_time: 10.0,
                    width: 640,
                    height: 480,
                    fps: 15,
                    loop_count: 0,
                    colors: 256,
                    format: "gif".to_string(),
                    quality: 80,
                });
            
            items.push(ConversionHistoryItem {
                id: row.id,
                original_path: row.original_path,
                output_path: row.output_path,
                settings,
                created_at: row.created_at,
            });
        }
        
        Ok(items)
    }
    
    pub async fn delete_history(&self, id: i64) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM conversion_history WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;
        
        Ok(())
    }
    
    pub async fn clear_all_history(&self) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM conversion_history")
            .execute(&self.pool)
            .await?;
        
        Ok(())
    }
}
