#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod crypto;
mod database;
mod password_generator;
mod security_audit;
mod regex_library;
mod models;

use crypto::*;
use database::*;
use password_generator::*;
use security_audit::*;
use regex_library::*;
use models::AppState;

fn main() {
    tauri::Builder::default()
        .manage(std::sync::Mutex::new(AppState::default()))
        .invoke_handler(tauri::generate_handler![
            initialize_database,
            set_master_password,
            verify_master_password,
            unlock_vault,
            lock_vault,
            is_vault_locked,
            generate_password,
            generate_passphrase,
            add_password_entry,
            get_all_password_entries,
            update_password_entry,
            delete_password_entry,
            audit_password_strength,
            check_duplicate_passwords,
            check_pwned_password,
            get_security_audit_report,
            get_all_regex_patterns,
            add_regex_pattern,
            update_regex_pattern,
            delete_regex_pattern,
            get_regex_pattern_by_id,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
