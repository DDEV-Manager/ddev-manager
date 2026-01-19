use tauri::Window;

use crate::ddev::{run_ddev_command_streaming, run_ddev_json_command_async};
use crate::error::DdevError;
use crate::types::{DdevProjectBasic, DdevProjectDetails};

/// List all DDEV projects
#[tauri::command]
pub async fn list_projects() -> Result<Vec<DdevProjectBasic>, DdevError> {
    run_ddev_json_command_async(&["list"]).await
}

/// Get detailed information about a specific project
#[tauri::command]
pub async fn describe_project(name: String) -> Result<DdevProjectDetails, DdevError> {
    run_ddev_json_command_async(&["describe", &name]).await
}

/// Start a DDEV project (non-blocking, streams output via events)
/// Returns a process ID that can be used to cancel the command
#[tauri::command]
pub fn start_project(window: Window, name: String) -> Result<String, DdevError> {
    run_ddev_command_streaming(window, "start", &name, &["start", &name])
}

/// Stop a DDEV project (non-blocking, streams output via events)
/// Returns a process ID that can be used to cancel the command
#[tauri::command]
pub fn stop_project(window: Window, name: String) -> Result<String, DdevError> {
    run_ddev_command_streaming(window, "stop", &name, &["stop", &name])
}

/// Restart a DDEV project (non-blocking, streams output via events)
/// Returns a process ID that can be used to cancel the command
#[tauri::command]
pub fn restart_project(window: Window, name: String) -> Result<String, DdevError> {
    run_ddev_command_streaming(window, "restart", &name, &["restart", &name])
}

/// Power off all DDEV projects (non-blocking, streams output via events)
/// Returns a process ID that can be used to cancel the command
#[tauri::command]
pub fn poweroff(window: Window) -> Result<String, DdevError> {
    run_ddev_command_streaming(window, "poweroff", "all", &["poweroff"])
}

/// Delete a DDEV project (removes containers and config, keeps files)
/// Returns a process ID that can be used to cancel the command
#[tauri::command]
pub fn delete_project(window: Window, name: String) -> Result<String, DdevError> {
    run_ddev_command_streaming(
        window,
        "delete",
        &name,
        &["delete", "--omit-snapshot", "--yes", &name],
    )
}
