use crate::ddev::run_ddev_command_async;
use crate::error::DdevError;

/// List snapshots for a project
#[tauri::command]
pub async fn list_snapshots(project: String) -> Result<String, DdevError> {
    run_ddev_command_async(&["snapshot", "--list", &project]).await
}

/// Create a snapshot for a project
#[tauri::command]
pub async fn create_snapshot(project: String, name: Option<String>) -> Result<String, DdevError> {
    let args = match &name {
        Some(snapshot_name) => vec!["snapshot", "--name", snapshot_name, &project],
        None => vec!["snapshot", &project],
    };
    run_ddev_command_async(&args).await
}

/// Restore a snapshot for a project
#[tauri::command]
pub async fn restore_snapshot(project: String, snapshot: String) -> Result<String, DdevError> {
    run_ddev_command_async(&["snapshot", "restore", &snapshot, &project]).await
}
