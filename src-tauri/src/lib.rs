mod commands;
pub mod services;
pub mod types;

use commands::*;
use types::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .manage(DatabaseStore::default())
        .invoke_handler(tauri::generate_handler![
            greet,
            get_app_version,
            create_database_container,
            get_all_databases,
            start_container,
            stop_container,
            remove_container,
            update_container_config,
            get_docker_status,
            sync_containers_with_docker,
            open_container_creation_window,
            open_container_edit_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
