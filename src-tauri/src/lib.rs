mod commands;
mod ddev;
mod error;
mod process;
mod schema;
mod types;

use commands::*;
use process::cancel_command;
use std::sync::Mutex;
use tauri::menu::{
    AboutMetadata, CheckMenuItem, CheckMenuItemBuilder, MenuBuilder, MenuItemBuilder,
    PredefinedMenuItem, SubmenuBuilder,
};
use tauri::Manager;

// Store theme menu items for updating check state
pub struct ThemeMenuItems {
    pub light: CheckMenuItem<tauri::Wry>,
    pub dark: CheckMenuItem<tauri::Wry>,
    pub system: CheckMenuItem<tauri::Wry>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[allow(unused_mut)]
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            // Build the app menu (macOS application menu with About, etc.)
            let app_menu = SubmenuBuilder::new(app, "DDEV Manager")
                .item(&PredefinedMenuItem::about(
                    app,
                    Some("About DDEV Manager"),
                    Some(AboutMetadata::default()),
                )?)
                .separator()
                .item(&PredefinedMenuItem::services(app, Some("Services"))?)
                .separator()
                .item(&PredefinedMenuItem::hide(app, Some("Hide DDEV Manager"))?)
                .item(&PredefinedMenuItem::hide_others(app, Some("Hide Others"))?)
                .item(&PredefinedMenuItem::show_all(app, Some("Show All"))?)
                .separator()
                .item(&PredefinedMenuItem::quit(app, Some("Quit DDEV Manager"))?)
                .build()?;

            // Build the View menu with zoom controls and appearance
            let zoom_in = MenuItemBuilder::with_id("zoom_in", "Zoom In")
                .accelerator("CmdOrCtrl++")
                .build(app)?;
            let zoom_out = MenuItemBuilder::with_id("zoom_out", "Zoom Out")
                .accelerator("CmdOrCtrl+-")
                .build(app)?;
            let zoom_reset = MenuItemBuilder::with_id("zoom_reset", "Actual Size")
                .accelerator("CmdOrCtrl+0")
                .build(app)?;

            // Appearance submenu with check items (default to System checked)
            let theme_light = CheckMenuItemBuilder::with_id("theme_light", "Light").build(app)?;
            let theme_dark = CheckMenuItemBuilder::with_id("theme_dark", "Dark").build(app)?;
            let theme_system = CheckMenuItemBuilder::with_id("theme_system", "System")
                .checked(true)
                .build(app)?;

            // Store references for later updates
            app.manage(Mutex::new(ThemeMenuItems {
                light: theme_light.clone(),
                dark: theme_dark.clone(),
                system: theme_system.clone(),
            }));

            let appearance_menu = SubmenuBuilder::new(app, "Appearance")
                .item(&theme_light)
                .item(&theme_dark)
                .item(&theme_system)
                .build()?;

            let view_menu = SubmenuBuilder::new(app, "View")
                .item(&zoom_in)
                .item(&zoom_out)
                .separator()
                .item(&zoom_reset)
                .separator()
                .item(&appearance_menu)
                .build()?;

            let menu = MenuBuilder::new(app)
                .item(&app_menu)
                .item(&view_menu)
                .build()?;

            app.set_menu(menu)?;

            // Ensure schema is updated in the background on startup
            schema::ensure_schema_updated();
            Ok(())
        })
        .on_menu_event(|app, event| {
            let event_id = event.id().as_ref();

            // Handle theme changes - update checkmarks using stored references
            if event_id.starts_with("theme_") {
                if let Some(items) = app.try_state::<Mutex<ThemeMenuItems>>() {
                    if let Ok(items) = items.lock() {
                        let _ = items.light.set_checked(event_id == "theme_light");
                        let _ = items.dark.set_checked(event_id == "theme_dark");
                        let _ = items.system.set_checked(event_id == "theme_system");
                    }
                }
            }

            // Execute JavaScript handlers
            if let Some(window) = app.get_webview_window("main") {
                let script = match event_id {
                    "zoom_in" => Some("if(window.__ZOOM_IN)window.__ZOOM_IN()"),
                    "zoom_out" => Some("if(window.__ZOOM_OUT)window.__ZOOM_OUT()"),
                    "zoom_reset" => Some("if(window.__ZOOM_RESET)window.__ZOOM_RESET()"),
                    "theme_light" => Some("if(window.__SET_THEME)window.__SET_THEME('light')"),
                    "theme_dark" => Some("if(window.__SET_THEME)window.__SET_THEME('dark')"),
                    "theme_system" => Some("if(window.__SET_THEME)window.__SET_THEME('system')"),
                    _ => None,
                };
                if let Some(js) = script {
                    let _ = window.eval(js);
                }
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
            sync_theme_menu,
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
