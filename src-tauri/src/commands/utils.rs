use std::process::Command;
use tokio::process::Command as AsyncCommand;

use crate::ddev::{get_ddev_command, get_enhanced_path, run_ddev_command_async};
use crate::error::DdevError;

/// Check if DDEV is installed
#[tauri::command]
pub async fn check_ddev_installed() -> Result<bool, DdevError> {
    let ddev_cmd = get_ddev_command();
    let enhanced_path = get_enhanced_path();

    match AsyncCommand::new(&ddev_cmd)
        .arg("version")
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
