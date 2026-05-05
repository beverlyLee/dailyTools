#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod db;

use db::{Database, Task, PomodoroSession, DailyStat, Comparison};
use tauri::Manager;
use chrono::{Local, Duration};
use std::fs;
use std::path::Path;

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

#[tauri::command]
async fn save_comparison(
    app_handle: tauri::AppHandle,
    left_file_name: String,
    right_file_name: String,
    left_content: String,
    right_content: String,
) -> Result<i64, String> {
    let db = app_handle.state::<Database>();
    db.create_comparison(left_file_name, right_file_name, left_content, right_content)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_comparisons(app_handle: tauri::AppHandle) -> Result<Vec<Comparison>, String> {
    let db = app_handle.state::<Database>();
    db.get_all_comparisons().await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_comparison(app_handle: tauri::AppHandle, id: i64) -> Result<Option<Comparison>, String> {
    let db = app_handle.state::<Database>();
    db.get_comparison(id).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_comparison(app_handle: tauri::AppHandle, id: i64) -> Result<(), String> {
    let db = app_handle.state::<Database>();
    db.delete_comparison(id).await.map_err(|e| e.to_string())
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
            save_comparison,
            get_comparisons,
            get_comparison,
            delete_comparison
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
