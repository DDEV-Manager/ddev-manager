use std::process::Command;
use std::thread;
use tauri::{Emitter, Window};
use tokio::process::Command as AsyncCommand;

use crate::ddev::{get_ddev_command, get_enhanced_path, run_streaming_command};
use crate::error::DdevError;
use crate::process::{
    create_task_entry, generate_process_id, is_process_cancelled, remove_task_entry,
};
use crate::types::{CmsInstall, CmsInstallResult, CommandOutput, CommandStatus};

/// Check if a folder is empty (completely empty, no files at all)
/// Composer create-project requires a truly empty folder
#[tauri::command]
pub async fn check_folder_empty(path: String) -> Result<bool, DdevError> {
    let path = std::path::Path::new(&path);

    if !path.exists() {
        // Non-existent folder is considered "empty" (will be created)
        return Ok(true);
    }

    if !path.is_dir() {
        return Err(DdevError::CommandFailed(
            "Path is not a directory".to_string(),
        ));
    }

    let mut entries = std::fs::read_dir(path).map_err(|e| DdevError::IoError(e.to_string()))?;

    // Folder is empty only if there are no entries at all
    Ok(entries.next().is_none())
}

/// Check if composer is installed
#[tauri::command]
pub async fn check_composer_installed() -> Result<bool, DdevError> {
    let enhanced_path = get_enhanced_path();

    match AsyncCommand::new("composer")
        .arg("--version")
        .env("PATH", &enhanced_path)
        .output()
        .await
    {
        Ok(output) => Ok(output.status.success()),
        Err(_) => Ok(false),
    }
}

/// Check if WP-CLI is installed
#[tauri::command]
pub async fn check_wpcli_installed() -> Result<bool, DdevError> {
    let enhanced_path = get_enhanced_path();

    match AsyncCommand::new("wp")
        .arg("--version")
        .env("PATH", &enhanced_path)
        .output()
        .await
    {
        Ok(output) => Ok(output.status.success()),
        Err(_) => Ok(false),
    }
}

/// Open folder picker dialog
#[tauri::command]
pub async fn select_folder(app: tauri::AppHandle) -> Result<Option<String>, DdevError> {
    use tauri_plugin_dialog::DialogExt;

    let (tx, rx) = tokio::sync::oneshot::channel();

    app.dialog()
        .file()
        .set_title("Select Project Folder")
        .pick_folder(move |folder| {
            let result = folder.map(|p| p.to_string());
            let _ = tx.send(result);
        });

    rx.await
        .map_err(|e| DdevError::CommandFailed(format!("Dialog channel error: {}", e)))
}

/// Install CMS via composer or WP-CLI/download
/// Returns CmsInstallResult indicating success, failure, or cancellation
fn install_cms(
    window: &Window,
    cms: &CmsInstall,
    path: &str,
    enhanced_path: &str,
    process_id: &str,
    project_name: &str,
) -> CmsInstallResult {
    match cms.install_type.as_str() {
        "composer" => {
            if let Some(package) = &cms.package {
                let _ = window.emit(
                    "command-output",
                    CommandOutput {
                        line: format!("Installing {} via Composer...", package),
                        stream: "stdout".to_string(),
                    },
                );
                match run_streaming_command(
                    window,
                    "composer",
                    &["create-project", package, "."],
                    path,
                    enhanced_path,
                    Some(process_id),
                    "config",
                    project_name,
                ) {
                    Ok(true) => CmsInstallResult::Success,
                    Ok(false) => CmsInstallResult::Failed,
                    Err(_) => CmsInstallResult::Cancelled,
                }
            } else {
                let _ = window.emit(
                    "command-output",
                    CommandOutput {
                        line: "Error: No composer package specified".to_string(),
                        stream: "stderr".to_string(),
                    },
                );
                CmsInstallResult::Failed
            }
        }
        "wordpress" => {
            // Try WP-CLI first
            let wp_available = Command::new("wp")
                .arg("--version")
                .env("PATH", enhanced_path)
                .output()
                .map(|o| o.status.success())
                .unwrap_or(false);

            if wp_available {
                let _ = window.emit(
                    "command-output",
                    CommandOutput {
                        line: "Installing WordPress via WP-CLI...".to_string(),
                        stream: "stdout".to_string(),
                    },
                );
                match run_streaming_command(
                    window,
                    "wp",
                    &["core", "download"],
                    path,
                    enhanced_path,
                    Some(process_id),
                    "config",
                    project_name,
                ) {
                    Ok(true) => CmsInstallResult::Success,
                    Ok(false) => CmsInstallResult::Failed,
                    Err(_) => CmsInstallResult::Cancelled,
                }
            } else {
                // Download from wordpress.org
                let _ = window.emit(
                    "command-output",
                    CommandOutput {
                        line: "Downloading WordPress from wordpress.org...".to_string(),
                        stream: "stdout".to_string(),
                    },
                );

                // Download latest.zip
                let zip_path = format!("{}/wordpress-latest.zip", path);
                match run_streaming_command(
                    window,
                    "curl",
                    &["-L", "-o", &zip_path, "https://wordpress.org/latest.zip"],
                    path,
                    enhanced_path,
                    Some(process_id),
                    "config",
                    project_name,
                ) {
                    Ok(true) => {}
                    Ok(false) => return CmsInstallResult::Failed,
                    Err(_) => return CmsInstallResult::Cancelled,
                }

                // Extract zip
                let _ = window.emit(
                    "command-output",
                    CommandOutput {
                        line: "Extracting WordPress...".to_string(),
                        stream: "stdout".to_string(),
                    },
                );

                match run_streaming_command(
                    window,
                    "unzip",
                    &["-q", &zip_path],
                    path,
                    enhanced_path,
                    Some(process_id),
                    "config",
                    project_name,
                ) {
                    Ok(true) => {}
                    Ok(false) => return CmsInstallResult::Failed,
                    Err(_) => return CmsInstallResult::Cancelled,
                }

                // Move files from wordpress/ subdirectory to project root
                let wp_subdir = format!("{}/wordpress", path);
                if std::path::Path::new(&wp_subdir).exists() {
                    // Move all files from wordpress/ to current directory
                    let _ = window.emit(
                        "command-output",
                        CommandOutput {
                            line: "Moving WordPress files to project root...".to_string(),
                            stream: "stdout".to_string(),
                        },
                    );

                    // Use shell to move files including hidden ones
                    match run_streaming_command(
                        window,
                        "sh",
                        &["-c", "mv wordpress/* . && mv wordpress/.[!.]* . 2>/dev/null; rmdir wordpress"],
                        path,
                        enhanced_path,
                        Some(process_id),
                        "config",
                        project_name,
                    ) {
                        Ok(true) => {}
                        Ok(false) => {
                            let _ = window.emit(
                                "command-output",
                                CommandOutput {
                                    line: "Warning: Could not move some WordPress files".to_string(),
                                    stream: "stderr".to_string(),
                                },
                            );
                        }
                        Err(_) => return CmsInstallResult::Cancelled,
                    }
                }

                // Clean up zip file
                let _ = std::fs::remove_file(&zip_path);

                CmsInstallResult::Success
            }
        }
        _ => {
            let _ = window.emit(
                "command-output",
                CommandOutput {
                    line: format!("Unknown installation type: {}", cms.install_type),
                    stream: "stderr".to_string(),
                },
            );
            CmsInstallResult::Failed
        }
    }
}

/// Create a new DDEV project (streaming output)
#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub fn create_project(
    window: Window,
    path: String,
    name: String,
    project_type: Option<String>,
    php_version: Option<String>,
    database: Option<String>,
    webserver: Option<String>,
    docroot: Option<String>,
    auto_start: bool,
    cms_install: Option<String>,
) -> Result<String, DdevError> {
    let process_id = generate_process_id();
    let command_name = "config".to_string();
    let project_name = name.clone();
    let ddev_cmd = get_ddev_command();
    let enhanced_path = get_enhanced_path();
    let process_id_clone = process_id.clone();

    // Parse CMS install instruction if provided
    let cms_install_parsed: Option<CmsInstall> = cms_install
        .as_ref()
        .and_then(|json| serde_json::from_str(json).ok());

    // Build the ddev config arguments
    let mut args = vec![
        "config".to_string(),
        format!("--project-name={}", name),
        "--create-docroot".to_string(),
    ];

    // Only specify project type if provided (otherwise DDEV will auto-detect)
    if let Some(pt) = project_type {
        if !pt.is_empty() {
            args.push(format!("--project-type={}", pt));
        }
    }

    if let Some(php) = php_version {
        if !php.is_empty() {
            args.push(format!("--php-version={}", php));
        }
    }

    if let Some(db) = database {
        if !db.is_empty() {
            args.push(format!("--database={}", db));
        }
    }

    if let Some(ws) = webserver {
        if !ws.is_empty() {
            args.push(format!("--webserver-type={}", ws));
        }
    }

    if let Some(dr) = docroot {
        if !dr.is_empty() {
            args.push(format!("--docroot={}", dr));
        }
    }

    // Create an entry in the registry for this multi-step task
    // Individual commands will register their child processes for cancellation support
    create_task_entry(&process_id, &command_name, &project_name);

    // Emit start status with process_id
    let _ = window.emit(
        "command-status",
        CommandStatus {
            command: command_name.clone(),
            project: project_name.clone(),
            status: "started".to_string(),
            message: Some(format!("Creating project: ddev {}", args.join(" "))),
            process_id: Some(process_id.clone()),
        },
    );

    // Spawn the command in a background thread
    thread::spawn(move || {
        // Helper to clean up and check if cancelled
        let check_cancelled = || -> bool { is_process_cancelled(&process_id_clone) };

        // Create directory if it doesn't exist
        if !std::path::Path::new(&path).exists() {
            if let Err(e) = std::fs::create_dir_all(&path) {
                // Clean up registry entry
                remove_task_entry(&process_id_clone);
                let _ = window.emit(
                    "command-status",
                    CommandStatus {
                        command: command_name,
                        project: project_name,
                        status: "error".to_string(),
                        message: Some(format!("Failed to create directory: {}", e)),
                        process_id: None,
                    },
                );
                return;
            }
        }

        // Check if cancelled before CMS install
        if check_cancelled() {
            return; // cancel_command already emitted the cancelled status
        }

        // Install CMS if requested (before ddev config)
        if let Some(cms) = cms_install_parsed {
            match install_cms(
                &window,
                &cms,
                &path,
                &enhanced_path,
                &process_id_clone,
                &project_name,
            ) {
                CmsInstallResult::Success => {}
                CmsInstallResult::Failed => {
                    // Clean up registry entry
                    remove_task_entry(&process_id_clone);
                    let _ = window.emit(
                        "command-status",
                        CommandStatus {
                            command: command_name,
                            project: project_name,
                            status: "error".to_string(),
                            message: Some("CMS installation failed".to_string()),
                            process_id: None,
                        },
                    );
                    return;
                }
                CmsInstallResult::Cancelled => {
                    return; // cancel_command already emitted the cancelled status
                }
            }
        }

        // Check if cancelled before ddev config
        if check_cancelled() {
            return;
        }

        // Run ddev config using run_streaming_command for proper cancellation support
        let args_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
        match run_streaming_command(
            &window,
            &ddev_cmd,
            &args_refs,
            &path,
            &enhanced_path,
            Some(&process_id_clone),
            &command_name,
            &project_name,
        ) {
            Ok(true) => {
                // Config succeeded, check if we need to auto-start
                if auto_start {
                    // Check if cancelled before starting
                    if check_cancelled() {
                        return;
                    }

                    let _ = window.emit(
                        "command-output",
                        CommandOutput {
                            line: "Starting project...".to_string(),
                            stream: "stdout".to_string(),
                        },
                    );

                    // Run ddev start using run_streaming_command
                    match run_streaming_command(
                        &window,
                        &ddev_cmd,
                        &["start"],
                        &path,
                        &enhanced_path,
                        Some(&process_id_clone),
                        &command_name,
                        &project_name,
                    ) {
                        Ok(_) => {}
                        Err(_) => {
                            return; // Cancelled
                        }
                    }
                }

                // Clean up registry entry
                remove_task_entry(&process_id_clone);
                let _ = window.emit(
                    "command-status",
                    CommandStatus {
                        command: command_name,
                        project: project_name,
                        status: "finished".to_string(),
                        message: Some("Project created successfully".to_string()),
                        process_id: None,
                    },
                );
            }
            Ok(false) => {
                // Clean up registry entry
                remove_task_entry(&process_id_clone);
                let _ = window.emit(
                    "command-status",
                    CommandStatus {
                        command: command_name,
                        project: project_name,
                        status: "error".to_string(),
                        message: Some("Failed to create project".to_string()),
                        process_id: None,
                    },
                );
            }
            Err(_) => {
                // Cancelled - cancel_command already emitted the status
            }
        }
    });

    Ok(process_id)
}
