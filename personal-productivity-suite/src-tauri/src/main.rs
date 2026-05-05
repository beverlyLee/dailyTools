#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod db;

use db::{Database, Task, PomodoroSession, DailyStat, NoteMetadata, WikiLink, SearchResult, FileNode};
use tauri::Manager;
use chrono::Local;
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;
use regex::Regex;

// ============ 番茄钟与任务管理命令 ============

#[tauri::command]
async fn create_task(
    app_handle: tauri::AppHandle,
    title: String,
    description: Option<String>,
    estimated_pomodoros: i32,
) -> Result<Task, String> {
    let db = app_handle.state::<Database>();
    db.create_task(title, description, estimated_pomodoros)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_tasks(app_handle: tauri::AppHandle) -> Result<Vec<Task>, String> {
    let db = app_handle.state::<Database>();
    db.get_all_tasks().await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_task(app_handle: tauri::AppHandle, task: Task) -> Result<(), String> {
    let db = app_handle.state::<Database>();
    db.update_task(&task).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_task(app_handle: tauri::AppHandle, id: i64) -> Result<(), String> {
    let db = app_handle.state::<Database>();
    db.delete_task(id).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn create_session(
    app_handle: tauri::AppHandle,
    task_id: Option<i64>,
    session_type: String,
    duration: i32,
) -> Result<PomodoroSession, String> {
    let db = app_handle.state::<Database>();
    db.create_session(task_id, session_type, duration)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn complete_session(app_handle: tauri::AppHandle, id: i64) -> Result<(), String> {
    let db = app_handle.state::<Database>();
    db.complete_session(id).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_daily_stats(app_handle: tauri::AppHandle, date: String) -> Result<DailyStat, String> {
    let db = app_handle.state::<Database>();
    db.get_daily_stats(&date).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_weekly_stats(
    app_handle: tauri::AppHandle,
    start_date: String,
    end_date: String,
) -> Result<Vec<DailyStat>, String> {
    let db = app_handle.state::<Database>();
    db.get_weekly_stats(&start_date, &end_date)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn backup_database(app_handle: tauri::AppHandle, backup_path: String) -> Result<(), String> {
    let db_path = Database::get_db_path().map_err(|e| e.to_string())?;
    
    if !db_path.exists() {
        return Err("数据库文件不存在".to_string());
    }
    
    let backup_path = Path::new(&backup_path);
    
    fs::copy(&db_path, backup_path)
        .map_err(|e| format!("备份失败: {}", e))?;
    
    Ok(())
}

#[tauri::command]
async fn restore_database(app_handle: tauri::AppHandle, backup_path: String) -> Result<(), String> {
    let backup_path = Path::new(&backup_path);
    
    if !backup_path.exists() {
        return Err("备份文件不存在".to_string());
    }
    
    let db_path = Database::get_db_path().map_err(|e| e.to_string())?;
    
    fs::copy(backup_path, &db_path)
        .map_err(|e| format!("恢复失败: {}", e))?;
    
    Ok(())
}

#[tauri::command]
async fn send_notification(app_handle: tauri::AppHandle, title: String, body: String) -> Result<(), String> {
    app_handle
        .notification_builder()
        .title(&title)
        .body(&body)
        .show()
        .map_err(|e| e.to_string())?;
    
    Ok(())
}

// ============ Markdown 知识库命令 ============

#[tauri::command]
async fn get_file_tree(root_path: String) -> Result<FileNode, String> {
    let root = PathBuf::from(&root_path);
    
    if !root.exists() {
        fs::create_dir_all(&root).map_err(|e| format!("创建目录失败: {}", e))?;
    }
    
    fn build_tree(path: &Path, root_path: &Path) -> FileNode {
        let name = path.file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        
        let relative_path = path.strip_prefix(root_path)
            .unwrap_or(path)
            .to_string_lossy()
            .to_string();
        
        if path.is_dir() {
            let mut children: Vec<FileNode> = Vec::new();
            
            if let Ok(entries) = fs::read_dir(path) {
                for entry in entries.flatten() {
                    let entry_path = entry.path();
                    children.push(build_tree(&entry_path, root_path));
                }
            }
            
            children.sort_by(|a, b| {
                if a.is_dir && !b.is_dir {
                    std::cmp::Ordering::Less
                } else if !a.is_dir && b.is_dir {
                    std::cmp::Ordering::Greater
                } else {
                    a.name.to_lowercase().cmp(&b.name.to_lowercase())
                }
            });
            
            FileNode {
                name,
                path: relative_path,
                is_dir: true,
                children: if children.is_empty() { None } else { Some(children) },
            }
        } else {
            FileNode {
                name,
                path: relative_path,
                is_dir: false,
                children: None,
            }
        }
    }
    
    Ok(build_tree(&root, &root))
}

#[tauri::command]
async fn read_file(app_handle: tauri::AppHandle, full_path: String) -> Result<String, String> {
    let path = PathBuf::from(&full_path);
    
    if !path.exists() {
        return Err("文件不存在".to_string());
    }
    
    fs::read_to_string(&path)
        .map_err(|e| format!("读取文件失败: {}", e))
}

#[tauri::command]
async fn write_file(app_handle: tauri::AppHandle, full_path: String, content: String) -> Result<(), String> {
    let path = PathBuf::from(&full_path);
    
    // 确保目录存在
    if let Some(parent) = path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("创建目录失败: {}", e))?;
        }
    }
    
    fs::write(&path, &content)
        .map_err(|e| format!("写入文件失败: {}", e))?;
    
    // 更新数据库中的笔记元数据
    let db = app_handle.state::<Database>();
    
    // 从内容中提取标题（第一个 # 标题或文件名）
    let title = extract_title(&content, &full_path);
    
    // 保存到数据库
    let note = db.create_or_update_note(full_path.clone(), title, &content)
        .await
        .map_err(|e| format!("更新数据库失败: {}", e))?;
    
    // 提取并保存 Wiki Links
    extract_and_save_wiki_links(&db, note.id, &content).await;
    
    Ok(())
}

fn extract_title(content: &str, file_path: &str) -> String {
    // 尝试从第一个 # 标题提取
    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("# ") {
            return trimmed[2..].trim().to_string();
        }
        if trimmed.starts_with("## ") || trimmed.starts_with("### ") {
            continue;
        }
        if !trimmed.is_empty() {
            break;
        }
    }
    
    // 如果没有找到标题，使用文件名
    let path = PathBuf::from(file_path);
    path.file_stem()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string()
}

async fn extract_and_save_wiki_links(db: &Database, note_id: i64, content: &str) {
    // 清除旧的链接
    let _ = db.clear_links(note_id).await;
    
    // 匹配 Wiki Links 格式: [[链接文本]] 或 [[目标|显示文本]]
    let re = match Regex::new(r"\[\[([^\]|]+)(?:\|([^\]]+))?\]\]") {
        Ok(r) => r,
        Err(_) => return,
    };
    
    for cap in re.captures_iter(content) {
        let target = cap[1].trim().to_string();
        let display_text = cap.get(2).map(|m| m.as_str().trim().to_string()).unwrap_or_else(|| target.clone());
        
        // 这里简化处理：在实际应用中，需要根据 target 查找对应的笔记
        // 这里假设 target 是文件名，需要先检查是否存在
        // 为简化，我们先记录链接，后续可以完善
    }
}

#[tauri::command]
async fn create_file(app_handle: tauri::AppHandle, full_path: String, is_dir: bool) -> Result<(), String> {
    let path = PathBuf::from(&full_path);
    
    if path.exists() {
        return Err("文件或目录已存在".to_string());
    }
    
    if is_dir {
        fs::create_dir_all(&path)
            .map_err(|e| format!("创建目录失败: {}", e))?;
    } else {
        // 确保父目录存在
        if let Some(parent) = path.parent() {
            if !parent.exists() {
                fs::create_dir_all(parent)
                    .map_err(|e| format!("创建目录失败: {}", e))?;
            }
        }
        fs::write(&path, "")
            .map_err(|e| format!("创建文件失败: {}", e))?;
    }
    
    Ok(())
}

#[tauri::command]
async fn delete_file(app_handle: tauri::AppHandle, full_path: String) -> Result<(), String> {
    let path = PathBuf::from(&full_path);
    
    if !path.exists() {
        return Err("文件或目录不存在".to_string());
    }
    
    // 从数据库中删除笔记记录
    let db = app_handle.state::<Database>();
    if let Ok(Some(note)) = db.get_note_by_path(&full_path).await {
        let _ = db.delete_note(note.id).await;
    }
    
    if path.is_dir() {
        fs::remove_dir_all(&path)
            .map_err(|e| format!("删除目录失败: {}", e))?;
    } else {
        fs::remove_file(&path)
            .map_err(|e| format!("删除文件失败: {}", e))?;
    }
    
    Ok(())
}

#[tauri::command]
async fn rename_file(app_handle: tauri::AppHandle, old_path: String, new_path: String) -> Result<(), String> {
    let old = PathBuf::from(&old_path);
    let new = PathBuf::from(&new_path);
    
    if !old.exists() {
        return Err("原文件或目录不存在".to_string());
    }
    
    if new.exists() {
        return Err("目标文件或目录已存在".to_string());
    }
    
    fs::rename(&old, &new)
        .map_err(|e| format!("重命名失败: {}", e))?;
    
    // 更新数据库中的路径
    let db = app_handle.state::<Database>();
    if let Ok(Some(note)) = db.get_note_by_path(&old_path).await {
        // 读取内容
        if let Ok(content) = fs::read_to_string(&new) {
            let title = extract_title(&content, &new_path);
            let _ = db.create_or_update_note(new_path, title, &content).await;
            // 删除旧记录
            let _ = db.delete_note(note.id).await;
        }
    }
    
    Ok(())
}

#[tauri::command]
async fn search_notes(app_handle: tauri::AppHandle, query: String) -> Result<Vec<SearchResult>, String> {
    let db = app_handle.state::<Database>();
    db.search_notes(&query).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_outgoing_links(app_handle: tauri::AppHandle, note_id: i64) -> Result<Vec<(WikiLink, NoteMetadata)>, String> {
    let db = app_handle.state::<Database>();
    db.get_outgoing_links(note_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_incoming_links(app_handle: tauri::AppHandle, note_id: i64) -> Result<Vec<(WikiLink, NoteMetadata)>, String> {
    let db = app_handle.state::<Database>();
    db.get_incoming_links(note_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_knowledge_graph(app_handle: tauri::AppHandle) -> Result<(Vec<NoteMetadata>, Vec<WikiLink>), String> {
    let db = app_handle.state::<Database>();
    db.get_knowledge_graph().await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_all_notes(app_handle: tauri::AppHandle) -> Result<Vec<NoteMetadata>, String> {
    let db = app_handle.state::<Database>();
    db.get_all_notes().await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_notes_directory() -> Result<String, String> {
    let app_dir = dirs::document_dir()
        .ok_or("无法获取文档目录")?
        .join("PersonalProductivityNotes");
    
    if !app_dir.exists() {
        fs::create_dir_all(&app_dir)
            .map_err(|e| format!("创建笔记目录失败: {}", e))?;
    }
    
    Ok(app_dir.to_string_lossy().to_string())
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let db_path = Database::get_db_path().expect("无法获取数据库路径");
            println!("数据库路径: {:?}", db_path);
            
            let db = tauri::async_runtime::block_on(Database::new())
                .expect("数据库初始化失败");
            
            app.manage(db);
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // 番茄钟与任务管理
            create_task,
            get_tasks,
            update_task,
            delete_task,
            create_session,
            complete_session,
            get_daily_stats,
            get_weekly_stats,
            backup_database,
            restore_database,
            send_notification,
            // Markdown 知识库
            get_file_tree,
            read_file,
            write_file,
            create_file,
            delete_file,
            rename_file,
            search_notes,
            get_outgoing_links,
            get_incoming_links,
            get_knowledge_graph,
            get_all_notes,
            get_notes_directory
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
