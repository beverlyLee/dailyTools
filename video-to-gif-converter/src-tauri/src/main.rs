#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod db;

use db::{Database, ConversionHistory, ConversionHistoryItem, ConversionSettings};
use tauri::Manager;
use std::fs;
use std::path::Path;

#[tauri::command]
async fn add_conversion(
    app_handle: tauri::AppHandle,
    original_path: String,
    output_path: String,
    settings: ConversionSettings,
) -> Result<ConversionHistory, String> {
    let db = app_handle.state::<Database>();
    db.add_conversion(original_path, output_path, &settings)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_conversion_history(app_handle: tauri::AppHandle) -> Result<Vec<ConversionHistoryItem>, String> {
    let db = app_handle.state::<Database>();
    db.get_all_history().await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_conversion(app_handle: tauri::AppHandle, id: i64) -> Result<(), String> {
    let db = app_handle.state::<Database>();
    db.delete_history(id).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn clear_history(app_handle: tauri::AppHandle) -> Result<(), String> {
    let db = app_handle.state::<Database>();
    db.clear_all_history().await.map_err(|e| e.to_string())
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
            add_conversion,
            get_conversion_history,
            delete_conversion,
            clear_history,
            backup_database,
            restore_database
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
