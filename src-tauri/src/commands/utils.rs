use std::process::Command;
use tokio::process::Command as AsyncCommand;

use crate::ddev::{
    get_ddev_base_args, get_ddev_command, get_enhanced_path, run_ddev_command_async,
};
use crate::error::DdevError;

/// Check if DDEV is installed
#[tauri::command]
pub async fn check_ddev_installed() -> Result<bool, DdevError> {
    let ddev_cmd = get_ddev_command();
    let enhanced_path = get_enhanced_path();

    // Build full args list (includes "ddev" prefix when using WSL on Windows)
    let mut full_args: Vec<&str> = get_ddev_base_args();
    full_args.push("version");

    match AsyncCommand::new(&ddev_cmd)
        .args(&full_args)
        .env("PATH", &enhanced_path)
        .output()
        .await
    {
        Ok(output) => Ok(output.status.success()),
        Err(_) => Ok(false),
    }
}

/// Get DDEV version information
#[tauri::command]
pub async fn get_ddev_version() -> Result<String, DdevError> {
    run_ddev_command_async(&["version"]).await
}

/// Open project URL in default browser
#[tauri::command]
pub fn open_project_url(url: String) -> Result<(), DdevError> {
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&url)
            .spawn()
            .map_err(|e| DdevError::IoError(e.to_string()))?;
    }

    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(["/C", "start", &url])
            .spawn()
            .map_err(|e| DdevError::IoError(e.to_string()))?;
    }

    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(&url)
            .spawn()
            .map_err(|e| DdevError::IoError(e.to_string()))?;
    }

    Ok(())
}

/// Open project folder in file manager
#[tauri::command]
pub fn open_project_folder(path: String) -> Result<(), DdevError> {
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| DdevError::IoError(e.to_string()))?;
    }

    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .arg(&path)
            .spawn()
            .map_err(|e| DdevError::IoError(e.to_string()))?;
    }

    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| DdevError::IoError(e.to_string()))?;
    }

    Ok(())
}

/// Check if running as AppImage (Linux only)
/// Returns true if the APPIMAGE environment variable is set
#[tauri::command]
pub fn is_appimage() -> bool {
    #[cfg(target_os = "linux")]
    {
        std::env::var("APPIMAGE").is_ok()
    }
    #[cfg(not(target_os = "linux"))]
    {
        false
    }
}

/// Sync theme menu checkmarks with the current theme
#[tauri::command]
pub fn sync_theme_menu(app_handle: tauri::AppHandle, theme: String) -> Result<(), DdevError> {
    use crate::ThemeMenuItems;
    use std::sync::Mutex;
    use tauri::Manager;

    if let Some(items) = app_handle.try_state::<Mutex<ThemeMenuItems>>() {
        if let Ok(items) = items.lock() {
            let _ = items.light.set_checked(theme == "light");
            let _ = items.dark.set_checked(theme == "dark");
            let _ = items.high_contrast.set_checked(theme == "high-contrast");
            let _ = items.system.set_checked(theme == "system");
        }
    }
    Ok(())
}
