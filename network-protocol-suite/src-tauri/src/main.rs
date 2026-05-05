#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use packet_sniffer::{
    PacketSniffer, PacketDatabase, SnifferError, SnifferStats,
    NetworkInterface, Packet, Protocol,
};
use session_analyzer::{
    TcpReassembler, HttpParser, WebSocketParser, FileExtractor, HexViewer,
    AnalyzerError, TcpStream, SessionStats, ExtractedFile, HexViewResult, ViewMode,
    ViewModeType, TextEncoding,
};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{State, Window};
use tokio::sync::mpsc;

struct AppState {
    sniffer: Mutex<PacketSniffer>,
    database: Mutex<Option<PacketDatabase>>,
    reassembler: Mutex<TcpReassembler>,
    http_parser: Mutex<HttpParser>,
    websocket_parser: Mutex<WebSocketParser>,
    file_extractor: Mutex<FileExtractor>,
    hex_viewer: Mutex<HexViewer>,
    packet_receiver: Mutex<Option<mpsc::UnboundedReceiver<Packet>>>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            sniffer: Mutex::new(PacketSniffer::new()),
            database: Mutex::new(None),
            reassembler: Mutex::new(TcpReassembler::new()),
            http_parser: Mutex::new(HttpParser::new()),
            websocket_parser: Mutex::new(WebSocketParser::new()),
            file_extractor: Mutex::new(FileExtractor::new()),
            hex_viewer: Mutex::new(HexViewer::new()),
            packet_receiver: Mutex::new(None),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
struct ApiResult<T> {
    success: bool,
    data: Option<T>,
    error: Option<String>,
}

impl<T> ApiResult<T> {
    fn ok(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
        }
    }
    
    fn err(err: String) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(err),
        }
    }
}

#[tauri::command]
fn get_network_interfaces() -> ApiResult<Vec<NetworkInterface>> {
    match PacketSniffer::get_interfaces() {
        Ok(interfaces) => ApiResult::ok(interfaces),
        Err(e) => ApiResult::err(e.to_string()),
    }
}

#[tauri::command]
fn select_interface(interface_name: String, state: State<'_, AppState>) -> ApiResult<()> {
    let mut sniffer = state.sniffer.lock().unwrap();
    match sniffer.select_interface(&interface_name) {
        Ok(_) => ApiResult::ok(()),
        Err(e) => ApiResult::err(e.to_string()),
    }
}

#[tauri::command]
fn set_bpf_filter(filter: String, state: State<'_, AppState>) -> ApiResult<()> {
    let mut sniffer = state.sniffer.lock().unwrap();
    match sniffer.set_bpf_filter(&filter) {
        Ok(_) => ApiResult::ok(()),
        Err(e) => ApiResult::err(e.to_string()),
    }
}

#[tauri::command]
fn set_promiscuous(enabled: bool, state: State<'_, AppState>) -> ApiResult<()> {
    let mut sniffer = state.sniffer.lock().unwrap();
    match sniffer.set_promiscuous(enabled) {
        Ok(_) => ApiResult::ok(()),
        Err(e) => ApiResult::err(e.to_string()),
    }
}

#[tauri::command]
fn start_sniffer(window: Window, state: State<'_, AppState>) -> ApiResult<bool> {
    let mut sniffer = state.sniffer.lock().unwrap();
    
    match sniffer.start() {
        Ok(receiver) => {
            let mut packet_receiver = state.packet_receiver.lock().unwrap();
            *packet_receiver = Some(receiver);
            ApiResult::ok(true)
        }
        Err(e) => ApiResult::err(e.to_string()),
    }
}

#[tauri::command]
fn stop_sniffer(state: State<'_, AppState>) -> ApiResult<bool> {
    let mut sniffer = state.sniffer.lock().unwrap();
    
    match sniffer.stop() {
        Ok(_) => {
            let mut packet_receiver = state.packet_receiver.lock().unwrap();
            *packet_receiver = None;
            ApiResult::ok(true)
        }
        Err(e) => ApiResult::err(e.to_string()),
    }
}

#[tauri::command]
fn is_sniffer_running(state: State<'_, AppState>) -> bool {
    let sniffer = state.sniffer.lock().unwrap();
    sniffer.is_running()
}

#[tauri::command]
fn get_sniffer_stats(state: State<'_, AppState>) -> SnifferStats {
    let sniffer = state.sniffer.lock().unwrap();
    sniffer.get_stats()
}

#[tauri::command]
fn get_selected_interface(state: State<'_, AppState>) -> Option<String> {
    let sniffer = state.sniffer.lock().unwrap();
    sniffer.get_selected_interface().cloned()
}

#[tauri::command]
fn get_bpf_filter(state: State<'_, AppState>) -> String {
    let sniffer = state.sniffer.lock().unwrap();
    sniffer.get_bpf_filter().to_string()
}

#[tauri::command]
fn is_promiscuous(state: State<'_, AppState>) -> bool {
    let sniffer = state.sniffer.lock().unwrap();
    sniffer.is_promiscuous()
}

#[tauri::command]
async fn init_database(state: State<'_, AppState>) -> ApiResult<()> {
    match PacketDatabase::new(None).await {
        Ok(db) => {
            let mut database = state.database.lock().unwrap();
            *database = Some(db);
            ApiResult::ok(())
        }
        Err(e) => ApiResult::err(e.to_string()),
    }
}

#[tauri::command]
async fn get_packets_from_db(limit: i64, offset: i64, state: State<'_, AppState>) -> ApiResult<Vec<Packet>> {
    let database = state.database.lock().unwrap();
    if let Some(db) = &*database {
        match db.get_packets(limit, offset).await {
            Ok(packets) => ApiResult::ok(packets),
            Err(e) => ApiResult::err(e.to_string()),
        }
    } else {
        ApiResult::err("数据库未初始化".to_string())
    }
}

#[tauri::command]
async fn get_packet_count(state: State<'_, AppState>) -> ApiResult<i64> {
    let database = state.database.lock().unwrap();
    if let Some(db) = &*database {
        match db.get_packet_count().await {
            Ok(count) => ApiResult::ok(count),
            Err(e) => ApiResult::err(e.to_string()),
        }
    } else {
        ApiResult::err("数据库未初始化".to_string())
    }
}

#[tauri::command]
async fn search_packets(query: String, limit: i64, state: State<'_, AppState>) -> ApiResult<Vec<Packet>> {
    let database = state.database.lock().unwrap();
    if let Some(db) = &*database {
        match db.search_packets(&query, limit).await {
            Ok(packets) => ApiResult::ok(packets),
            Err(e) => ApiResult::err(e.to_string()),
        }
    } else {
        ApiResult::err("数据库未初始化".to_string())
    }
}

#[tauri::command]
async fn clear_database(state: State<'_, AppState>) -> ApiResult<i64> {
    let database = state.database.lock().unwrap();
    if let Some(db) = &*database {
        match db.clear_packets().await {
            Ok(count) => ApiResult::ok(count),
            Err(e) => ApiResult::err(e.to_string()),
        }
    } else {
        ApiResult::err("数据库未初始化".to_string())
    }
}

#[tauri::command]
fn get_all_sessions(state: State<'_, AppState>) -> Vec<TcpStream> {
    let reassembler = state.reassembler.lock().unwrap();
    reassembler.get_all_sessions().cloned().collect()
}

#[tauri::command]
fn get_active_sessions(state: State<'_, AppState>) -> Vec<TcpStream> {
    let reassembler = state.reassembler.lock().unwrap();
    reassembler.get_active_sessions().cloned().collect()
}

#[tauri::command]
fn get_http_sessions(state: State<'_, AppState>) -> Vec<TcpStream> {
    let reassembler = state.reassembler.lock().unwrap();
    reassembler.get_http_sessions().cloned().collect()
}

#[tauri::command]
fn get_session_stats(state: State<'_, AppState>) -> SessionStats {
    let reassembler = state.reassembler.lock().unwrap();
    reassembler.get_stats()
}

#[tauri::command]
fn get_session(session_id: String, state: State<'_, AppState>) -> ApiResult<TcpStream> {
    let reassembler = state.reassembler.lock().unwrap();
    match reassembler.get_session(&session_id) {
        Some(session) => ApiResult::ok(session.clone()),
        None => ApiResult::err(format!("会话不存在: {}", session_id)),
    }
}

#[tauri::command]
fn remove_session(session_id: String, state: State<'_, AppState>) -> ApiResult<bool> {
    let mut reassembler = state.reassembler.lock().unwrap();
    match reassembler.remove_session(&session_id) {
        Some(_) => ApiResult::ok(true),
        None => ApiResult::err(format!("会话不存在: {}", session_id)),
    }
}

#[tauri::command]
fn clear_all_sessions(state: State<'_, AppState>) {
    let mut reassembler = state.reassembler.lock().unwrap();
    reassembler.clear_all();
}

#[tauri::command]
fn reassemble_stream_data(session_id: String, is_client: bool, state: State<'_, AppState>) -> ApiResult<Vec<u8>> {
    let reassembler = state.reassembler.lock().unwrap();
    match reassembler.reassemble_stream_data(&session_id, is_client) {
        Ok(data) => ApiResult::ok(data),
        Err(e) => ApiResult::err(e.to_string()),
    }
}

#[tauri::command]
fn get_all_extracted_files(state: State<'_, AppState>) -> Vec<ExtractedFile> {
    let extractor = state.file_extractor.lock().unwrap();
    extractor.get_all_files().cloned().collect()
}

#[tauri::command]
fn get_files_by_session(session_id: String, state: State<'_, AppState>) -> Vec<ExtractedFile> {
    let extractor = state.file_extractor.lock().unwrap();
    extractor.get_files_by_session(&session_id).cloned().collect()
}

#[tauri::command]
fn get_files_by_type(content_type: String, state: State<'_, AppState>) -> Vec<ExtractedFile> {
    let extractor = state.file_extractor.lock().unwrap();
    extractor.get_files_by_type(&content_type).cloned().collect()
}

#[tauri::command]
fn get_extracted_file(id: String, state: State<'_, AppState>) -> ApiResult<ExtractedFile> {
    let extractor = state.file_extractor.lock().unwrap();
    match extractor.get_file(&id) {
        Some(file) => ApiResult::ok(file.clone()),
        None => ApiResult::err(format!("文件不存在: {}", id)),
    }
}

#[tauri::command]
fn clear_extracted_files(state: State<'_, AppState>) {
    let mut extractor = state.file_extractor.lock().unwrap();
    extractor.clear_all();
}

#[tauri::command]
fn set_hex_view_mode(mode: ViewMode, state: State<'_, AppState>) {
    let mut viewer = state.hex_viewer.lock().unwrap();
    viewer.set_mode(mode);
}

#[tauri::command]
fn get_hex_view_mode(state: State<'_, AppState>) -> ViewMode {
    let viewer = state.hex_viewer.lock().unwrap();
    viewer.get_mode().clone()
}

#[tauri::command]
fn format_hex_view(data: Vec<u8>, offset: u64, state: State<'_, AppState>) -> Vec<HexViewResult> {
    let viewer = state.hex_viewer.lock().unwrap();
    viewer.format_hex_view(&data, offset)
}

#[tauri::command]
fn format_text_view(data: Vec<u8>, state: State<'_, AppState>) -> String {
    let viewer = state.hex_viewer.lock().unwrap();
    viewer.format_text_view(&data)
}

#[tauri::command]
fn format_hex_dump(data: Vec<u8>, offset: u64, state: State<'_, AppState>) -> String {
    let viewer = state.hex_viewer.lock().unwrap();
    viewer.format_as_hex_dump(&data, offset)
}

#[tauri::command]
fn search_hex(data: Vec<u8>, hex_pattern: String, state: State<'_, AppState>) -> ApiResult<Vec<usize>> {
    let viewer = state.hex_viewer.lock().unwrap();
    match viewer.search_hex(&data, &hex_pattern) {
        Ok(positions) => ApiResult::ok(positions),
        Err(e) => ApiResult::err(e.to_string()),
    }
}

#[tauri::command]
fn search_text(data: Vec<u8>, text_pattern: String, state: State<'_, AppState>) -> Vec<usize> {
    let viewer = state.hex_viewer.lock().unwrap();
    viewer.search_text(&data, &text_pattern)
}

fn main() {
    env_logger::init();
    
    tauri::Builder::default()
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            get_network_interfaces,
            select_interface,
            set_bpf_filter,
            set_promiscuous,
            start_sniffer,
            stop_sniffer,
            is_sniffer_running,
            get_sniffer_stats,
            get_selected_interface,
            get_bpf_filter,
            is_promiscuous,
            init_database,
            get_packets_from_db,
            get_packet_count,
            search_packets,
            clear_database,
            get_all_sessions,
            get_active_sessions,
            get_http_sessions,
            get_session_stats,
            get_session,
            remove_session,
            clear_all_sessions,
            reassemble_stream_data,
            get_all_extracted_files,
            get_files_by_session,
            get_files_by_type,
            get_extracted_file,
            clear_extracted_files,
            set_hex_view_mode,
            get_hex_view_mode,
            format_hex_view,
            format_text_view,
            format_hex_dump,
            search_hex,
            search_text,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
