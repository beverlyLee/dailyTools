#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod tracing;
mod logging;
mod utils;
mod types;

use std::sync::Arc;
use parking_lot::Mutex;
use types::AppState;

fn main() {
    env_logger::init();

    let app_state = AppState {
        tracing_config: Arc::new(Mutex::new(tracing::TracingConfig::default())),
        logging_config: Arc::new(Mutex::new(logging::LoggingConfig::default())),
        log_buffer: Arc::new(Mutex::new(logging::LogBuffer::new(10000))),
        trace_buffer: Arc::new(Mutex::new(tracing::TraceBuffer::new(1000))),
    };

    tauri::Builder::default()
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            tracing::configure_jaeger,
            tracing::configure_zipkin,
            tracing::get_traces,
            tracing::get_trace_detail,
            tracing::get_trace_gantt_data,
            tracing::get_slow_spans,
            tracing::get_error_traces,
            logging::configure_log_sources,
            logging::add_log_source,
            logging::remove_log_source,
            logging::get_logs,
            logging::search_logs,
            logging::get_log_context,
            logging::get_error_clusters,
            logging::get_heatmap_data,
            logging::start_log_streaming,
            logging::stop_log_streaming,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
