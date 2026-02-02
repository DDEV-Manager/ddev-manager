mod commands;
mod ddev;
mod error;
mod process;
mod schema;
mod types;

use commands::*;
use process::cancel_command;
use tauri::menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[allow(unused_mut)]
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            // Build the View menu with zoom controls
            let zoom_in = MenuItemBuilder::with_id("zoom_in", "Zoom In")
                .accelerator("CmdOrCtrl+=")
                .build(app)?;
            let zoom_in_plus = MenuItemBuilder::with_id("zoom_in_plus", "Zoom In")
                .accelerator("CmdOrCtrl++")
                .build(app)?;
            let zoom_out = MenuItemBuilder::with_id("zoom_out", "Zoom Out")
                .accelerator("CmdOrCtrl+-")
                .build(app)?;
            let zoom_reset = MenuItemBuilder::with_id("zoom_reset", "Actual Size")
                .accelerator("CmdOrCtrl+0")
                .build(app)?;

            let view_menu = SubmenuBuilder::new(app, "View")
                .item(&zoom_in)
                .item(&zoom_in_plus)
                .item(&zoom_out)
                .separator()
                .item(&zoom_reset)
                .build()?;

            let menu = MenuBuilder::new(app).item(&view_menu).build()?;

            app.set_menu(menu)?;

            // Ensure schema is updated in the background on startup
            schema::ensure_schema_updated();
            Ok(())
        })
        .on_menu_event(|app, event| {
            let window = app.get_webview_window("main").unwrap();
            match event.id().as_ref() {
                "zoom_in" | "zoom_in_plus" => {
                    let _ = window.eval("window.__ZOOM_IN && window.__ZOOM_IN()");
                }
                "zoom_out" => {
                    let _ = window.eval("window.__ZOOM_OUT && window.__ZOOM_OUT()");
                }
                "zoom_reset" => {
                    let _ = window.eval("window.__ZOOM_RESET && window.__ZOOM_RESET()");
                }
                _ => {}
            }
        });

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
            change_php_version,
            change_nodejs_version,
            // Snapshots
            list_snapshots,
            create_snapshot,
            restore_snapshot,
            delete_snapshot,
            cleanup_snapshots,
            // Database
            select_database_file,
            select_export_destination,
            import_db,
            export_db,
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
            // Schema
            get_ddev_schema,
            refresh_ddev_schema,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
