use tauri::Window;

use crate::ddev::{run_ddev_command_async, run_ddev_command_streaming};
use crate::error::DdevError;
use crate::types::{AddonRegistry, DdevJsonResponse, InstalledAddon};

/// List installed addons for a project
#[tauri::command]
pub async fn list_installed_addons(project: String) -> Result<Vec<InstalledAddon>, DdevError> {
    let output = run_ddev_command_async(&[
        "--json-output",
        "add-on",
        "list",
        "--installed",
        "--project",
        &project,
    ])
    .await?;

    // Try to parse with the standard wrapper format
    if let Ok(response) = serde_json::from_str::<DdevJsonResponse<Vec<InstalledAddon>>>(&output) {
        return Ok(response.raw);
    }

    // If no "raw" field, it means no addons are installed
    // DDEV returns: {"level":"info","msg":"No registered add-ons were found.","time":"..."}
    Ok(vec![])
}

/// Fetch addon registry from addons.ddev.com
#[tauri::command]
pub async fn fetch_addon_registry() -> Result<AddonRegistry, DdevError> {
    let client = reqwest::Client::new();
    let response = client
        .get("https://addons.ddev.com/addons.json")
        .send()
        .await
        .map_err(|e| DdevError::IoError(format!("Failed to fetch registry: {}", e)))?;

    if !response.status().is_success() {
        return Err(DdevError::CommandFailed(format!(
            "Registry returned status {}",
            response.status()
        )));
    }

    let text = response
        .text()
        .await
        .map_err(|e| DdevError::IoError(format!("Failed to read response: {}", e)))?;

    serde_json::from_str::<AddonRegistry>(&text)
        .map_err(|e| DdevError::ParseError(format!("Failed to parse registry JSON: {}", e)))
}

/// Install an addon (streaming output)
/// Returns a process ID that can be used to cancel the command
#[tauri::command]
pub fn install_addon(window: Window, project: String, addon: String) -> Result<String, DdevError> {
    run_ddev_command_streaming(
        window,
        "addon-install",
        &project,
        &["add-on", "get", &addon, "--project", &project],
    )
}

/// Remove an addon (streaming output)
/// Returns a process ID that can be used to cancel the command
#[tauri::command]
pub fn remove_addon(window: Window, project: String, addon: String) -> Result<String, DdevError> {
    run_ddev_command_streaming(
        window,
        "addon-remove",
        &project,
        &["add-on", "remove", &addon, "--project", &project],
    )
}
