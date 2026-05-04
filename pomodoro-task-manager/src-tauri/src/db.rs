use chrono::{DateTime, Local};
use serde::{Deserialize, Serialize};
use sqlx::sqlite::SqlitePool;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Task {
    pub id: i64,
    pub title: String,
    pub description: Option<String>,
    pub estimated_pomodoros: i32,
    pub completed_pomodoros: i32,
    pub created_at: String,
    pub updated_at: String,
    pub completed: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PomodoroSession {
    pub id: i64,
    pub task_id: Option<i64>,
    pub session_type: String,
    pub duration: i32,
    pub started_at: String,
    pub completed_at: Option<String>,
    pub completed: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DailyStat {
    pub date: String,
    pub total_pomodoros: i32,
    pub total_minutes: i32,
    pub completed_tasks: i32,
}

pub struct Database {
    pool: SqlitePool,
}

impl Database {
    pub async fn new() -> Result<Self, Box<dyn std::error::Error>> {
        let app_dir = dirs::data_local_dir()
            .ok_or("无法获取应用数据目录")?
            .join("pomodoro-task-manager");
        
        std::fs::create_dir_all(&app_dir)?;
        
        let db_path = app_dir.join("pomodoro.db");
        let db_url = format!("sqlite:{}", db_path.to_string_lossy());
        
        let pool = SqlitePool::connect(&db_url).await?;
        
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                estimated_pomodoros INTEGER DEFAULT 1,
                completed_pomodoros INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                completed INTEGER DEFAULT 0
            )
            "#
        )
        .execute(&pool)
        .await?;
        
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS pomodoro_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id INTEGER,
                session_type TEXT NOT NULL,
                duration INTEGER NOT NULL,
                started_at TEXT NOT NULL,
                completed_at TEXT,
                completed INTEGER DEFAULT 0
            )
            "#
        )
        .execute(&pool)
        .await?;
        
        sqlx::query(
            r#"
            CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_started_at 
            ON pomodoro_sessions(started_at)
            "#
        )
        .execute(&pool)
        .await?;
        
        sqlx::query(
            r#"
            CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_completed 
            ON pomodoro_sessions(completed)
            "#
        )
        .execute(&pool)
        .await?;
        
        Ok(Self { pool })
    }
    
    pub fn get_db_path() -> Result<PathBuf, Box<dyn std::error::Error>> {
        let app_dir = dirs::data_local_dir()
            .ok_or("无法获取应用数据目录")?
            .join("pomodoro-task-manager");
        
        Ok(app_dir.join("pomodoro.db"))
    }
    
    pub async fn create_task(&self, title: String, description: Option<String>, estimated_pomodoros: i32) -> Result<Task, sqlx::Error> {
        let now = Local::now().to_rfc3339();
        
        let id = sqlx::query(
            r#"
            INSERT INTO tasks (title, description, estimated_pomodoros, completed_pomodoros, created_at, updated_at, completed)
            VALUES (?, ?, ?, 0, ?, ?, 0)
            "#
        )
        .bind(&title)
        .bind(&description)
        .bind(estimated_pomodoros)
        .bind(&now)
        .bind(&now)
        .execute(&self.pool)
        .await?
        .last_insert_rowid();
        
        Ok(Task {
            id,
            title,
            description,
            estimated_pomodoros,
            completed_pomodoros: 0,
            created_at: now.clone(),
            updated_at: now,
            completed: false,
        })
    }
    
    pub async fn get_task(&self, id: i64) -> Result<Option<Task>, sqlx::Error> {
        sqlx::query_as!(
            Task,
            r#"
            SELECT id, title, description, estimated_pomodoros, completed_pomodoros, 
                   created_at, updated_at, completed as "completed: bool"
            FROM tasks WHERE id = ?
            "#,
            id
        )
        .fetch_optional(&self.pool)
        .await
    }
    
    pub async fn get_all_tasks(&self) -> Result<Vec<Task>, sqlx::Error> {
        sqlx::query_as!(
            Task,
            r#"
            SELECT id, title, description, estimated_pomodoros, completed_pomodoros, 
                   created_at, updated_at, completed as "completed: bool"
            FROM tasks ORDER BY created_at DESC
            "#
        )
        .fetch_all(&self.pool)
        .await
    }
    
    pub async fn update_task(&self, task: &Task) -> Result<(), sqlx::Error> {
        let now = Local::now().to_rfc3339();
        
        sqlx::query(
            r#"
            UPDATE tasks SET title = ?, description = ?, estimated_pomodoros = ?, 
                   completed_pomodoros = ?, updated_at = ?, completed = ?
            WHERE id = ?
            "#
        )
        .bind(&task.title)
        .bind(&task.description)
        .bind(task.estimated_pomodoros)
        .bind(task.completed_pomodoros)
        .bind(&now)
        .bind(task.completed)
        .bind(task.id)
        .execute(&self.pool)
        .await?;
        
        Ok(())
    }
    
    pub async fn delete_task(&self, id: i64) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM tasks WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;
        
        Ok(())
    }
    
    pub async fn create_session(&self, task_id: Option<i64>, session_type: String, duration: i32) -> Result<PomodoroSession, sqlx::Error> {
        let now = Local::now().to_rfc3339();
        
        let id = sqlx::query(
            r#"
            INSERT INTO pomodoro_sessions (task_id, session_type, duration, started_at, completed)
            VALUES (?, ?, ?, ?, 0)
            "#
        )
        .bind(task_id)
        .bind(&session_type)
        .bind(duration)
        .bind(&now)
        .execute(&self.pool)
        .await?
        .last_insert_rowid();
        
        Ok(PomodoroSession {
            id,
            task_id,
            session_type,
            duration,
            started_at: now,
            completed_at: None,
            completed: false,
        })
    }
    
    pub async fn complete_session(&self, id: i64) -> Result<(), sqlx::Error> {
        let now = Local::now().to_rfc3339();
        
        sqlx::query(
            r#"
            UPDATE pomodoro_sessions SET completed_at = ?, completed = 1
            WHERE id = ?
            "#
        )
        .bind(&now)
        .bind(id)
        .execute(&self.pool)
        .await?;
        
        let session = sqlx::query_as!(
            PomodoroSession,
            r#"
            SELECT id, task_id, session_type, duration, started_at, completed_at, completed as "completed: bool"
            FROM pomodoro_sessions WHERE id = ?
            "#,
            id
        )
        .fetch_one(&self.pool)
        .await?;
        
        if let Some(task_id) = session.task_id {
            if session.session_type == "work" {
                sqlx::query(
                    r#"
                    UPDATE tasks SET completed_pomodoros = completed_pomodoros + 1
                    WHERE id = ?
                    "#
                )
                .bind(task_id)
                .execute(&self.pool)
                .await?;
            }
        }
        
        Ok(())
    }
    
    pub async fn get_daily_stats(&self, date: &str) -> Result<DailyStat, sqlx::Error> {
        let start_date = format!("{}T00:00:00", date);
        let end_date = format!("{}T23:59:59", date);
        
        let total_pomodoros: i32 = sqlx::query_scalar(
            r#"
            SELECT COUNT(*) FROM pomodoro_sessions 
            WHERE session_type = 'work' AND completed = 1 
            AND started_at >= ? AND started_at <= ?
            "#
        )
        .bind(&start_date)
        .bind(&end_date)
        .fetch_one(&self.pool)
        .await?;
        
        let total_minutes: i32 = sqlx::query_scalar(
            r#"
            SELECT COALESCE(SUM(duration), 0) FROM pomodoro_sessions 
            WHERE session_type = 'work' AND completed = 1 
            AND started_at >= ? AND started_at <= ?
            "#
        )
        .bind(&start_date)
        .bind(&end_date)
        .fetch_one(&self.pool)
        .await?;
        
        let completed_tasks: i32 = sqlx::query_scalar(
            r#"
            SELECT COUNT(*) FROM tasks 
            WHERE completed = 1 
            AND updated_at >= ? AND updated_at <= ?
            "#
        )
        .bind(&start_date)
        .bind(&end_date)
        .fetch_one(&self.pool)
        .await?;
        
        Ok(DailyStat {
            date: date.to_string(),
            total_pomodoros,
            total_minutes,
            completed_tasks,
        })
    }
    
    pub async fn get_weekly_stats(&self, start_date: &str, end_date: &str) -> Result<Vec<DailyStat>, sqlx::Error> {
        let start = format!("{}T00:00:00", start_date);
        let end = format!("{}T23:59:59", end_date);
        
        let rows: Vec<(String, i32, i32)> = sqlx::query_as(
            r#"
            SELECT 
                date(started_at) as day,
                COUNT(*) as pomodoros,
                COALESCE(SUM(duration), 0) as minutes
            FROM pomodoro_sessions 
            WHERE session_type = 'work' AND completed = 1 
            AND started_at >= ? AND started_at <= ?
            GROUP BY date(started_at)
            ORDER BY day
            "#
        )
        .bind(&start)
        .bind(&end)
        .fetch_all(&self.pool)
        .await?;
        
        let mut stats = Vec::new();
        for (date, pomodoros, minutes) in rows {
            stats.push(DailyStat {
                date,
                total_pomodoros: pomodoros,
                total_minutes: minutes,
                completed_tasks: 0,
            });
        }
        
        Ok(stats)
    }
}
