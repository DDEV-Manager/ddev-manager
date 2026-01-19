mod commands;
mod ddev;
mod error;
mod process;
mod types;

use commands::*;
use process::cancel_command;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[allow(unused_mut)]
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init());

    // Only include updater plugin in release builds (when config is available)
    #[cfg(not(debug_assertions))]
    {
        builder = builder.plugin(tauri_plugin_updater::Builder::new().build());
    }

    builder
        .invoke_handler(tauri::generate_handler![
            // Projects
            list_projects,
            describe_project,
            start_project,
            stop_project,
            restart_project,
            delete_project,
            poweroff,
            // Snapshots
            list_snapshots,
            create_snapshot,
            restore_snapshot,
            delete_snapshot,
            cleanup_snapshots,
            // Logs
            get_logs,
            // Utils
            check_ddev_installed,
            get_ddev_version,
            open_project_url,
            open_project_folder,
            // Addons
            list_installed_addons,
            fetch_addon_registry,
            install_addon,
            remove_addon,
            // Process management
            cancel_command,
            // Project creation
            select_folder,
            create_project,
            check_folder_empty,
            check_composer_installed,
            check_wpcli_installed,
            // Screenshots
            capture_screenshot,
            get_screenshot_path,
            get_screenshot_data,
            delete_screenshot,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
