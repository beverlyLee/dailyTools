#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ScanConfig {
    target_url: String,
    depth: u32,
    threads: u32,
    vuln_types: Vec<String>,
    cookie: Option<String>,
    user_agent: String,
    timeout: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct AnalyzeConfig {
    target: String,
    port_range: String,
    custom_ports: Option<String>,
    scan_types: Vec<String>,
    timeout: u32,
    threads: u32,
    skip_verified: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Vulnerability {
    id: String,
    r#type: String,
    severity: String,
    url: String,
    description: String,
    payload: String,
    recommendation: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct PortInfo {
    port: u16,
    protocol: String,
    service: String,
    version: Option<String>,
    state: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ServiceInfo {
    name: String,
    version: Option<String>,
    port: u16,
    details: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct SensitiveFile {
    path: String,
    url: String,
    r#type: String,
    severity: String,
    description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct TechStack {
    name: String,
    version: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct AssetPortrait {
    target_type: String,
    ip_address: Option<String>,
    os: Option<String>,
    risk_score: u8,
    risk_description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct AnalysisResults {
    target: String,
    open_ports: Vec<PortInfo>,
    services: Vec<ServiceInfo>,
    sensitive_files: Vec<SensitiveFile>,
    tech_stack: Vec<TechStack>,
    risk_level: String,
    portrait: AssetPortrait,
}

#[derive(Default)]
struct AppState {
    scan_results: Mutex<Vec<Vulnerability>>,
    analysis_results: Mutex<Option<AnalysisResults>>,
}

#[tauri::command]
async fn health_check() -> Result<String, String> {
    Ok("ok".to_string())
}

#[tauri::command]
async fn start_vuln_scan(
    config: ScanConfig,
    state: State<'_, Arc<AppState>>,
) -> Result<bool, String> {
    println!("Starting vulnerability scan for: {}", config.target_url);
    println!("Scan depth: {}, threads: {}", config.depth, config.threads);
    println!("Vulnerability types: {:?}", config.vuln_types);

    Ok(true)
}

#[tauri::command]
async fn start_asset_analysis(
    config: AnalyzeConfig,
    state: State<'_, Arc<AppState>>,
) -> Result<bool, String> {
    println!("Starting asset analysis for: {}", config.target);
    println!("Port range: {}, threads: {}", config.port_range, config.threads);
    println!("Scan types: {:?}", config.scan_types);

    Ok(true)
}

#[tauri::command]
async fn get_scan_results(state: State<'_, Arc<AppState>>) -> Result<Vec<Vulnerability>, String> {
    let results = state.scan_results.lock().await;
    Ok(results.clone())
}

#[tauri::command]
async fn get_analysis_results(state: State<'_, Arc<AppState>>) -> Result<Option<AnalysisResults>, String> {
    let results = state.analysis_results.lock().await;
    Ok(results.clone())
}

#[tauri::command]
async fn save_scan_results(
    results: Vec<Vulnerability>,
    state: State<'_, Arc<AppState>>,
) -> Result<(), String> {
    let mut scan_results = state.scan_results.lock().await;
    *scan_results = results;
    Ok(())
}

#[tauri::command]
async fn save_analysis_results(
    results: AnalysisResults,
    state: State<'_, Arc<AppState>>,
) -> Result<(), String> {
    let mut analysis_results = state.analysis_results.lock().await;
    *analysis_results = Some(results);
    Ok(())
}

fn main() {
    let state = Arc::new(AppState::default());

    tauri::Builder::default()
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            health_check,
            start_vuln_scan,
            start_asset_analysis,
            get_scan_results,
            get_analysis_results,
            save_scan_results,
            save_analysis_results,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
