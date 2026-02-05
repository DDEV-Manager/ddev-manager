use std::thread;
use tauri::{Emitter, Window};
use tokio::process::Command as AsyncCommand;

use crate::ddev::{
    get_ddev_base_args, get_ddev_command, get_enhanced_path, run_ddev_command_streaming,
    run_ddev_json_command_async, run_streaming_command,
};
use crate::error::DdevError;
use crate::process::{
    create_task_entry, generate_process_id, is_process_cancelled, remove_task_entry,
};
use crate::types::{CommandOutput, CommandStatus, DdevProjectBasic, DdevProjectDetails};

/// List all DDEV projects
#[tauri::command]
pub async fn list_projects() -> Result<Vec<DdevProjectBasic>, DdevError> {
    run_ddev_json_command_async(&["list"]).await
}

/// Get detailed information about a specific project
#[tauri::command]
pub async fn describe_project(name: String) -> Result<DdevProjectDetails, DdevError> {
    let mut details: DdevProjectDetails = run_ddev_json_command_async(&["describe", &name]).await?;

    // Override xdebug_enabled with runtime status when project is running,
    // because `ddev describe` reports the config value (xdebug_enabled in .ddev/config.yaml)
    // while `ddev xdebug on/off` only changes runtime state.
    if details.status == "running" {
        if let Ok(runtime_enabled) = check_xdebug_runtime(&details.approot).await {
            details.xdebug_enabled = runtime_enabled;
        }
    }

    Ok(details)
}

/// Check xdebug runtime status by running `ddev xdebug status`
async fn check_xdebug_runtime(approot: &str) -> Result<bool, DdevError> {
    let ddev_cmd = get_ddev_command();
    let enhanced_path = get_enhanced_path();

    let base_args: Vec<String> = get_ddev_base_args().iter().map(|s| s.to_string()).collect();
    let mut full_args: Vec<String> = base_args;
    full_args.push("xdebug".to_string());
    full_args.push("status".to_string());

    let output = AsyncCommand::new(&ddev_cmd)
        .args(&full_args)
        .current_dir(approot)
        .env("PATH", &enhanced_path)
        .output()
        .await
        .map_err(|e| DdevError::IoError(e.to_string()))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    let combined = format!("{}{}", stdout, stderr).to_lowercase();
    Ok(combined.contains("xdebug enabled"))
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

/// Change a project configuration option and optionally restart
/// Generic helper for config changes
fn change_project_config(
    window: Window,
    name: String,
    approot: String,
    config_flag: String,
    config_value: String,
    command_name: &str,
    success_message: String,
    restart: bool,
) -> Result<String, DdevError> {
    let process_id = generate_process_id();
    let command_name = command_name.to_string();
    let project_name = name.clone();
    let ddev_cmd = get_ddev_command();
    let enhanced_path = get_enhanced_path();
    let process_id_clone = process_id.clone();

    // Create an entry in the registry for this multi-step task
    create_task_entry(&process_id, &command_name, &project_name);

    // Emit start status with process_id
    let _ = window.emit(
        "command-status",
        CommandStatus {
            command: command_name.clone(),
            project: project_name.clone(),
            status: "started".to_string(),
            message: Some(format!("Changing {} to {}", config_flag, config_value)),
            process_id: Some(process_id.clone()),
        },
    );

    // Spawn the command in a background thread
    thread::spawn(move || {
        let check_cancelled = || -> bool { is_process_cancelled(&process_id_clone) };

        // Step 1: Run ddev config --{flag}={value}
        let config_arg = format!("--{}={}", config_flag, config_value);
        let config_args = vec!["config", &config_arg];

        let _ = window.emit(
            "command-output",
            CommandOutput {
                line: format!("Running: ddev config {}", config_arg),
                stream: "stdout".to_string(),
            },
        );

        match run_streaming_command(
            &window,
            &ddev_cmd,
            &config_args,
            &approot,
            &enhanced_path,
            Some(&process_id_clone),
            &command_name,
            &project_name,
        ) {
            Ok(true) => {
                // Config succeeded
                if restart {
                    // Only restart if requested (project was running)
                    if check_cancelled() {
                        return;
                    }

                    let _ = window.emit(
                        "command-output",
                        CommandOutput {
                            line: "Restarting project...".to_string(),
                            stream: "stdout".to_string(),
                        },
                    );

                    // Step 2: Run ddev restart
                    match run_streaming_command(
                        &window,
                        &ddev_cmd,
                        &["restart"],
                        &approot,
                        &enhanced_path,
                        Some(&process_id_clone),
                        &command_name,
                        &project_name,
                    ) {
                        Ok(true) => {
                            // Clean up registry entry
                            remove_task_entry(&process_id_clone);
                            let _ = window.emit(
                                "command-status",
                                CommandStatus {
                                    command: command_name,
                                    project: project_name,
                                    status: "finished".to_string(),
                                    message: Some(success_message),
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
                                    message: Some("Failed to restart project".to_string()),
                                    process_id: None,
                                },
                            );
                        }
                        Err(_) => {
                            // Cancelled - cancel_command already emitted the status
                        }
                    }
                } else {
                    // No restart needed, just finish
                    remove_task_entry(&process_id_clone);
                    let _ = window.emit(
                        "command-status",
                        CommandStatus {
                            command: command_name,
                            project: project_name,
                            status: "finished".to_string(),
                            message: Some(success_message),
                            process_id: None,
                        },
                    );
                }
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
                        message: Some(format!("Failed to change {}", config_flag)),
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

/// Toggle a DDEV service on or off (e.g. xdebug, xhgui)
/// Uses async command that waits for process exit directly, avoiding pipe-hang issues
/// where subprocesses (like docker exec) inherit stdout/stderr file descriptors.
/// Captures output and emits it via window events for terminal display.
#[tauri::command]
pub async fn toggle_service(
    window: Window,
    _name: String,
    approot: String,
    service: String,
    enable: bool,
) -> Result<(), DdevError> {
    let action = if enable { "on" } else { "off" };
    let ddev_cmd = get_ddev_command();
    let enhanced_path = get_enhanced_path();

    let base_args: Vec<String> = get_ddev_base_args().iter().map(|s| s.to_string()).collect();
    let mut full_args: Vec<String> = base_args;
    full_args.push(service.clone());
    full_args.push(action.to_string());

    let _ = window.emit(
        "command-status",
        CommandStatus {
            command: format!("toggle-{}", service),
            project: _name.clone(),
            status: "started".to_string(),
            message: Some(format!("Running: ddev {} {}", service, action)),
            process_id: None,
        },
    );

    let output = AsyncCommand::new(&ddev_cmd)
        .args(&full_args)
        .current_dir(&approot)
        .env("PATH", &enhanced_path)
        .output()
        .await
        .map_err(|e| {
            let _ = window.emit(
                "command-status",
                CommandStatus {
                    command: format!("toggle-{}", service),
                    project: _name.clone(),
                    status: "error".to_string(),
                    message: Some(format!("Failed to run ddev {} {}", service, action)),
                    process_id: None,
                },
            );
            if e.kind() == std::io::ErrorKind::NotFound {
                DdevError::NotInstalled
            } else {
                DdevError::IoError(e.to_string())
            }
        })?;

    // Emit captured stdout
    let stdout = String::from_utf8_lossy(&output.stdout);
    for line in stdout.lines() {
        let _ = window.emit(
            "command-output",
            CommandOutput {
                line: line.to_string(),
                stream: "stdout".to_string(),
            },
        );
    }

    // Emit captured stderr
    let stderr = String::from_utf8_lossy(&output.stderr);
    for line in stderr.lines() {
        let _ = window.emit(
            "command-output",
            CommandOutput {
                line: line.to_string(),
                stream: "stderr".to_string(),
            },
        );
    }

    if output.status.success() {
        let _ = window.emit(
            "command-status",
            CommandStatus {
                command: format!("toggle-{}", service),
                project: _name,
                status: "finished".to_string(),
                message: Some(format!("ddev {} {} completed", service, action)),
                process_id: None,
            },
        );
        Ok(())
    } else {
        let _ = window.emit(
            "command-status",
            CommandStatus {
                command: format!("toggle-{}", service),
                project: _name,
                status: "error".to_string(),
                message: Some(format!("ddev {} {} failed", service, action)),
                process_id: None,
            },
        );
        Err(DdevError::CommandFailed(format!(
            "ddev {} {} failed",
            service, action
        )))
    }
}

/// Change the PHP version for a DDEV project
/// Runs `ddev config --php-version=X.X` and optionally `ddev restart`
/// Returns a process ID that can be used to cancel the command
#[tauri::command]
pub fn change_php_version(
    window: Window,
    name: String,
    approot: String,
    php_version: String,
    restart: bool,
) -> Result<String, DdevError> {
    change_project_config(
        window,
        name,
        approot,
        "php-version".to_string(),
        php_version.clone(),
        "change-php",
        format!("PHP version changed to {} successfully", php_version),
        restart,
    )
}

/// Change the Node.js version for a DDEV project
/// Runs `ddev config --nodejs-version=XX` and optionally `ddev restart`
/// Returns a process ID that can be used to cancel the command
#[tauri::command]
pub fn change_nodejs_version(
    window: Window,
    name: String,
    approot: String,
    nodejs_version: String,
    restart: bool,
) -> Result<String, DdevError> {
    change_project_config(
        window,
        name,
        approot,
        "nodejs-version".to_string(),
        nodejs_version.clone(),
        "change-nodejs",
        format!("Node.js version changed to {} successfully", nodejs_version),
        restart,
    )
}
