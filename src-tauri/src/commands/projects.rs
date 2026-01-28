use std::thread;
use tauri::{Emitter, Window};

use crate::ddev::{
    get_ddev_command, get_enhanced_path, run_ddev_command_streaming, run_ddev_json_command_async,
    run_streaming_command,
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

/// Change a project configuration option and restart
/// Generic helper for config changes that require restart
fn change_project_config(
    window: Window,
    name: String,
    approot: String,
    config_flag: String,
    config_value: String,
    command_name: &str,
    success_message: String,
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
                // Config succeeded, now restart
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

/// Change the PHP version for a DDEV project
/// Runs `ddev config --php-version=X.X` followed by `ddev restart`
/// Returns a process ID that can be used to cancel the command
#[tauri::command]
pub fn change_php_version(
    window: Window,
    name: String,
    approot: String,
    php_version: String,
) -> Result<String, DdevError> {
    change_project_config(
        window,
        name,
        approot,
        "php-version".to_string(),
        php_version.clone(),
        "change-php",
        format!("PHP version changed to {} successfully", php_version),
    )
}

/// Change the Node.js version for a DDEV project
/// Runs `ddev config --nodejs-version=XX` followed by `ddev restart`
/// Returns a process ID that can be used to cancel the command
#[tauri::command]
pub fn change_nodejs_version(
    window: Window,
    name: String,
    approot: String,
    nodejs_version: String,
) -> Result<String, DdevError> {
    change_project_config(
        window,
        name,
        approot,
        "nodejs-version".to_string(),
        nodejs_version.clone(),
        "change-nodejs",
        format!("Node.js version changed to {} successfully", nodejs_version),
    )
}
