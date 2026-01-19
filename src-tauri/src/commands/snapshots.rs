use tauri::Window;

use crate::ddev::{
    run_ddev_command_async, run_ddev_command_streaming, run_ddev_command_streaming_in_dir,
};
use crate::error::DdevError;

/// List snapshots for a project (async, returns JSON)
#[tauri::command]
pub async fn list_snapshots(project: String) -> Result<String, DdevError> {
    run_ddev_command_async(&["snapshot", "--list", "--json-output", &project]).await
}

/// Create a snapshot for a project (streaming output)
#[tauri::command]
pub fn create_snapshot(
    window: Window,
    project: String,
    name: Option<String>,
) -> Result<String, DdevError> {
    let args: Vec<String> = match &name {
        Some(snapshot_name) => vec![
            "snapshot".to_string(),
            "--name".to_string(),
            snapshot_name.clone(),
            project.clone(),
        ],
        None => vec!["snapshot".to_string(), project.clone()],
    };
    let args_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    run_ddev_command_streaming(window, "snapshot", &project, &args_refs)
}

/// Restore a snapshot for a project (streaming output)
/// Must run from project directory since `ddev snapshot restore` doesn't accept project name
#[tauri::command]
pub fn restore_snapshot(
    window: Window,
    project: String,
    snapshot: String,
    approot: String,
) -> Result<String, DdevError> {
    run_ddev_command_streaming_in_dir(
        window,
        "snapshot-restore",
        &project,
        &["snapshot", "restore", &snapshot],
        &approot,
    )
}

/// Delete a specific snapshot (streaming output)
#[tauri::command]
pub fn delete_snapshot(
    window: Window,
    project: String,
    snapshot: String,
) -> Result<String, DdevError> {
    run_ddev_command_streaming(
        window,
        "snapshot-delete",
        &project,
        &["snapshot", "--cleanup", "--name", &snapshot, "-y", &project],
    )
}

/// Delete all snapshots for a project (streaming output)
#[tauri::command]
pub fn cleanup_snapshots(window: Window, project: String) -> Result<String, DdevError> {
    run_ddev_command_streaming(
        window,
        "snapshot-cleanup",
        &project,
        &["snapshot", "--cleanup", "-y", &project],
    )
}
