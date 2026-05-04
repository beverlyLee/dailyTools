#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod crypto;
mod database;
mod password_generator;
mod security_audit;
mod models;

use crypto::*;
use database::*;
use password_generator::*;
use security_audit::*;
use models::*;

fn main() {
    tauri::Builder::default()
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            initialize_database,
            set_master_password,
            verify_master_password,
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
            lock_vault,
            unlock_vault,
            is_vault_locked,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
