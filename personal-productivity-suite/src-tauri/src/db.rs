use chrono::{DateTime, Local};
use serde::{Deserialize, Serialize};
use sqlx::sqlite::SqlitePool;
use std::path::PathBuf;

// ============ 番茄钟与任务管理模型 ============

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

// ============ Markdown 知识库模型 ============

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NoteMetadata {
    pub id: i64,
    pub file_path: String,
    pub title: String,
    pub created_at: String,
    pub updated_at: String,
    pub tags: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WikiLink {
    pub id: i64,
    pub from_note_id: i64,
    pub to_note_id: i64,
    pub link_text: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SearchResult {
    pub note_id: i64,
    pub file_path: String,
    pub title: String,
    pub snippet: String,
    pub score: f32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileNode {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub children: Option<Vec<FileNode>>,
}

pub struct Database {
    pool: SqlitePool,
}

impl Database {
    pub async fn new() -> Result<Self, Box<dyn std::error::Error>> {
        let app_dir = dirs::data_local_dir()
            .ok_or("无法获取应用数据目录")?
            .join("personal-productivity-suite");
        
        std::fs::create_dir_all(&app_dir)?;
        
        let db_path = app_dir.join("productivity.db");
        let db_url = format!("sqlite:{}", db_path.to_string_lossy());
        
        let pool = SqlitePool::connect(&db_url).await?;
        
        // 创建任务表
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
        
        // 创建番茄钟会话表
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
        
        // 创建笔记元数据表
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                file_path TEXT NOT NULL UNIQUE,
                title TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                tags TEXT
            )
            "#
        )
        .execute(&pool)
        .await?;
        
        // 创建双向链接表
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS wiki_links (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                from_note_id INTEGER NOT NULL,
                to_note_id INTEGER NOT NULL,
                link_text TEXT NOT NULL,
                created_at TEXT NOT NULL,
                UNIQUE(from_note_id, to_note_id)
            )
            "#
        )
        .execute(&pool)
        .await?;
        
        // 创建全文搜索虚拟表
        sqlx::query(
            r#"
            CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
                title,
                content,
                file_path UNINDEXED,
                note_id UNINDEXED,
                content='notes_fts_content',
                content_rowid='id'
            )
            "#
        )
        .execute(&pool)
        .await?;
        
        // 创建索引
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
            CREATE INDEX IF NOT EXISTS idx_notes_file_path 
            ON notes(file_path)
            "#
        )
        .execute(&pool)
        .await?;
        
        sqlx::query(
            r#"
            CREATE INDEX IF NOT EXISTS idx_wiki_links_from 
            ON wiki_links(from_note_id)
            "#
        )
        .execute(&pool)
        .await?;
        
        sqlx::query(
            r#"
            CREATE INDEX IF NOT EXISTS idx_wiki_links_to 
            ON wiki_links(to_note_id)
            "#
        )
        .execute(&pool)
        .await?;
        
        Ok(Self { pool })
    }
    
    pub fn get_db_path() -> Result<PathBuf, Box<dyn std::error::Error>> {
        let app_dir = dirs::data_local_dir()
            .ok_or("无法获取应用数据目录")?
            .join("personal-productivity-suite");
        
        Ok(app_dir.join("productivity.db"))
    }
    
    // ============ 任务管理方法 ============
    
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
    
    // ============ 番茄钟会话方法 ============
    
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
    
    // ============ 统计方法 ============
    
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
    
    // ============ 笔记管理方法 ============
    
    pub async fn create_or_update_note(&self, file_path: String, title: String, content: &str) -> Result<NoteMetadata, sqlx::Error> {
        let now = Local::now().to_rfc3339();
        
        let existing = sqlx::query_as!(
            NoteMetadata,
            r#"
            SELECT id, file_path, title, created_at, updated_at, tags
            FROM notes WHERE file_path = ?
            "#,
            file_path
        )
        .fetch_optional(&self.pool)
        .await?;
        
        if let Some(note) = existing {
            sqlx::query(
                r#"
                UPDATE notes SET title = ?, updated_at = ?
                WHERE id = ?
                "#
            )
            .bind(&title)
            .bind(&now)
            .bind(note.id)
            .execute(&self.pool)
            .await?;
            
            // 更新全文搜索索引
            sqlx::query(
                r#"
                INSERT INTO notes_fts(rowid, title, content, file_path, note_id)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(rowid) DO UPDATE SET
                    title = excluded.title,
                    content = excluded.content
                "#
            )
            .bind(note.id)
            .bind(&title)
            .bind(content)
            .bind(&file_path)
            .bind(note.id)
            .execute(&self.pool)
            .await?;
            
            Ok(NoteMetadata {
                id: note.id,
                file_path,
                title,
                created_at: note.created_at,
                updated_at: now,
                tags: note.tags,
            })
        } else {
            let id = sqlx::query(
                r#"
                INSERT INTO notes (file_path, title, created_at, updated_at)
                VALUES (?, ?, ?, ?)
                "#
            )
            .bind(&file_path)
            .bind(&title)
            .bind(&now)
            .bind(&now)
            .execute(&self.pool)
            .await?
            .last_insert_rowid();
            
            // 添加到全文搜索索引
            sqlx::query(
                r#"
                INSERT INTO notes_fts(rowid, title, content, file_path, note_id)
                VALUES (?, ?, ?, ?, ?)
                "#
            )
            .bind(id)
            .bind(&title)
            .bind(content)
            .bind(&file_path)
            .bind(id)
            .execute(&self.pool)
            .await?;
            
            Ok(NoteMetadata {
                id,
                file_path,
                title,
                created_at: now.clone(),
                updated_at: now,
                tags: None,
            })
        }
    }
    
    pub async fn get_note_by_path(&self, file_path: &str) -> Result<Option<NoteMetadata>, sqlx::Error> {
        sqlx::query_as!(
            NoteMetadata,
            r#"
            SELECT id, file_path, title, created_at, updated_at, tags
            FROM notes WHERE file_path = ?
            "#,
            file_path
        )
        .fetch_optional(&self.pool)
        .await
    }
    
    pub async fn get_all_notes(&self) -> Result<Vec<NoteMetadata>, sqlx::Error> {
        sqlx::query_as!(
            NoteMetadata,
            r#"
            SELECT id, file_path, title, created_at, updated_at, tags
            FROM notes ORDER BY updated_at DESC
            "#
        )
        .fetch_all(&self.pool)
        .await
    }
    
    pub async fn delete_note(&self, id: i64) -> Result<(), sqlx::Error> {
        // 删除全文搜索索引
        sqlx::query(
            r#"
            DELETE FROM notes_fts WHERE rowid = ?
            "#
        )
        .bind(id)
        .execute(&self.pool)
        .await?;
        
        // 删除链接
        sqlx::query(
            r#"
            DELETE FROM wiki_links WHERE from_note_id = ? OR to_note_id = ?
            "#
        )
        .bind(id)
        .bind(id)
        .execute(&self.pool)
        .await?;
        
        // 删除笔记元数据
        sqlx::query(
            r#"
            DELETE FROM notes WHERE id = ?
            "#
        )
        .bind(id)
        .execute(&self.pool)
        .await?;
        
        Ok(())
    }
    
    // ============ 双向链接方法 ============
    
    pub async fn create_link(&self, from_note_id: i64, to_note_id: i64, link_text: String) -> Result<WikiLink, sqlx::Error> {
        let now = Local::now().to_rfc3339();
        
        let id = sqlx::query(
            r#"
            INSERT OR REPLACE INTO wiki_links (from_note_id, to_note_id, link_text, created_at)
            VALUES (?, ?, ?, ?)
            "#
        )
        .bind(from_note_id)
        .bind(to_note_id)
        .bind(&link_text)
        .bind(&now)
        .execute(&self.pool)
        .await?
        .last_insert_rowid();
        
        Ok(WikiLink {
            id,
            from_note_id,
            to_note_id,
            link_text,
            created_at: now,
        })
    }
    
    pub async fn get_outgoing_links(&self, note_id: i64) -> Result<Vec<(WikiLink, NoteMetadata)>, sqlx::Error> {
        let rows: Vec<(WikiLink, NoteMetadata)> = sqlx::query_as(
            r#"
            SELECT 
                wl.id, wl.from_note_id, wl.to_note_id, wl.link_text, wl.created_at,
                n.id, n.file_path, n.title, n.created_at, n.updated_at, n.tags
            FROM wiki_links wl
            JOIN notes n ON wl.to_note_id = n.id
            WHERE wl.from_note_id = ?
            "#
        )
        .bind(note_id)
        .fetch_all(&self.pool)
        .await?;
        
        Ok(rows)
    }
    
    pub async fn get_incoming_links(&self, note_id: i64) -> Result<Vec<(WikiLink, NoteMetadata)>, sqlx::Error> {
        let rows: Vec<(WikiLink, NoteMetadata)> = sqlx::query_as(
            r#"
            SELECT 
                wl.id, wl.from_note_id, wl.to_note_id, wl.link_text, wl.created_at,
                n.id, n.file_path, n.title, n.created_at, n.updated_at, n.tags
            FROM wiki_links wl
            JOIN notes n ON wl.from_note_id = n.id
            WHERE wl.to_note_id = ?
            "#
        )
        .bind(note_id)
        .fetch_all(&self.pool)
        .await?;
        
        Ok(rows)
    }
    
    pub async fn clear_links(&self, note_id: i64) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            DELETE FROM wiki_links WHERE from_note_id = ?
            "#
        )
        .bind(note_id)
        .execute(&self.pool)
        .await?;
        
        Ok(())
    }
    
    // ============ 全文搜索方法 ============
    
    pub async fn search_notes(&self, query: &str) -> Result<Vec<SearchResult>, sqlx::Error> {
        let rows: Vec<(i64, String, String, String, f32)> = sqlx::query_as(
            r#"
            SELECT 
                note_id,
                file_path,
                title,
                snippet(notes_fts, 1, '<mark>', '</mark>', '...', 30) as snippet,
                rank as score
            FROM notes_fts
            WHERE notes_fts MATCH ?
            ORDER BY rank
            "#
        )
        .bind(query)
        .fetch_all(&self.pool)
        .await?;
        
        let results = rows.into_iter().map(|(note_id, file_path, title, snippet, score)| {
            SearchResult {
                note_id,
                file_path,
                title,
                snippet,
                score,
            }
        }).collect();
        
        Ok(results)
    }
    
    // ============ 知识图谱方法 ============
    
    pub async fn get_knowledge_graph(&self) -> Result<(Vec<NoteMetadata>, Vec<WikiLink>), sqlx::Error> {
        let notes = self.get_all_notes().await?;
        
        let links: Vec<WikiLink> = sqlx::query_as!(
            WikiLink,
            r#"
            SELECT id, from_note_id, to_note_id, link_text, created_at
            FROM wiki_links
            "#
        )
        .fetch_all(&self.pool)
        .await?;
        
        Ok((notes, links))
    }
}
