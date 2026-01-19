use std::io::{BufRead, BufReader};
use std::process::{Command, Stdio};
use std::thread;
use tauri::{Emitter, Window};

use crate::ddev::{get_ddev_command, get_enhanced_path};
use crate::error::DdevError;
use crate::process::{generate_process_id, ProcessEntry, PROCESS_REGISTRY};
use crate::types::{LogOutput, LogStatus};

/// Get logs from a DDEV project container (streaming)
/// Returns a process ID that can be used to cancel/stop the log stream
#[tauri::command]
pub fn get_logs(
    window: Window,
    project: String,
    service: String,
    follow: bool,
    tail: Option<u32>,
    timestamps: bool,
) -> Result<String, DdevError> {
    let process_id = generate_process_id();
    let ddev_cmd = get_ddev_command();
    let enhanced_path = get_enhanced_path();
    let process_id_clone = process_id.clone();
    let project_clone = project.clone();
    let service_clone = service.clone();

    // Build the args
    let mut args = vec!["logs".to_string(), "-s".to_string(), service.clone()];

    if follow {
        args.push("-f".to_string());
    }

    if let Some(t) = tail {
        args.push(format!("--tail={}", t));
    }

    if timestamps {
        args.push("-t".to_string());
    }

    args.push(project.clone());

    // Emit start status
    let _ = window.emit(
        "log-status",
        LogStatus {
            project: project.clone(),
            service: service.clone(),
            status: "started".to_string(),
            message: Some(format!("Getting logs for {} ({})", project, service)),
            process_id: Some(process_id.clone()),
        },
    );

    // Spawn the command in a background thread
    thread::spawn(move || {
        let result = Command::new(&ddev_cmd)
            .args(&args)
            .env("PATH", &enhanced_path)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn();

        let mut child = match result {
            Ok(child) => child,
            Err(e) => {
                let _ = window.emit(
                    "log-status",
                    LogStatus {
                        project: project_clone,
                        service: service_clone,
                        status: "error".to_string(),
                        message: Some(format!("Failed to get logs: {}", e)),
                        process_id: None,
                    },
                );
                return;
            }
        };

        let stdout = child.stdout.take();
        let stderr = child.stderr.take();

        // Store child in registry for cancellation support
        {
            let mut registry = PROCESS_REGISTRY.lock().unwrap();
            registry.insert(
                process_id_clone.clone(),
                ProcessEntry {
                    child: Some(child),
                    command: "logs".to_string(),
                    project: project_clone.clone(),
                },
            );
        }

        let window_clone = window.clone();
        let project_for_stdout = project_clone.clone();
        let service_for_stdout = service_clone.clone();
        let project_for_stderr = project_clone.clone();
        let service_for_stderr = service_clone.clone();

        // Spawn thread for stdout
        let stdout_handle = stdout.map(|stdout| {
            let window = window.clone();
            thread::spawn(move || {
                let reader = BufReader::new(stdout);
                for line in reader.lines().map_while(Result::ok) {
                    let _ = window.emit(
                        "log-output",
                        LogOutput {
                            line,
                            stream: "stdout".to_string(),
                            project: project_for_stdout.clone(),
                            service: service_for_stdout.clone(),
                        },
                    );
                }
            })
        });

        // Spawn thread for stderr
        let stderr_handle = stderr.map(|stderr| {
            thread::spawn(move || {
                let reader = BufReader::new(stderr);
                for line in reader.lines().map_while(Result::ok) {
                    let _ = window_clone.emit(
                        "log-output",
                        LogOutput {
                            line,
                            stream: "stderr".to_string(),
                            project: project_for_stderr.clone(),
                            service: service_for_stderr.clone(),
                        },
                    );
                }
            })
        });

        // Wait for output threads to complete
        if let Some(handle) = stdout_handle {
            let _ = handle.join();
        }
        if let Some(handle) = stderr_handle {
            let _ = handle.join();
        }

        // Retrieve child from registry and wait for completion
        let status = {
            let mut registry = PROCESS_REGISTRY.lock().unwrap();
            registry
                .remove(&process_id_clone)
                .and_then(|entry| entry.child.map(|mut child| child.wait()))
        };

        match status {
            Some(Ok(exit_status)) if exit_status.success() => {
                let _ = window.emit(
                    "log-status",
                    LogStatus {
                        project: project_clone.clone(),
                        service: service_clone.clone(),
                        status: "finished".to_string(),
                        message: Some("Log streaming completed".to_string()),
                        process_id: None,
                    },
                );
            }
            None => {
                // Process was cancelled - don't emit, cancel_command handles it
            }
            _ => {
                let _ = window.emit(
                    "log-status",
                    LogStatus {
                        project: project_clone,
                        service: service_clone,
                        status: "error".to_string(),
                        message: Some("Log streaming failed".to_string()),
                        process_id: None,
                    },
                );
            }
        }
    });

    Ok(process_id)
}
