use serde::Deserialize;
use std::env;
use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::thread;
use tauri::{Emitter, Window};
use tokio::process::Command as AsyncCommand;

use crate::error::DdevError;
use crate::process::{
    generate_process_id, is_process_cancelled, register_child_process, take_child_process,
    PROCESS_REGISTRY,
};
use crate::types::{CommandOutput, CommandStatus, DdevJsonResponse};

/// Common paths where DDEV might be installed
/// macOS app bundles don't inherit shell PATH, so we need to search common locations
pub fn get_common_paths() -> Vec<&'static str> {
    vec![
        "/opt/homebrew/bin",              // macOS Apple Silicon (Homebrew)
        "/usr/local/bin",                 // macOS Intel (Homebrew) / Linux
        "/home/linuxbrew/.linuxbrew/bin", // Linux Homebrew
        "/usr/bin",                       // System paths
        "/bin",
        "/usr/sbin",
        "/sbin",
    ]
}

/// Find the DDEV executable by searching common installation paths
pub fn find_ddev_path() -> Option<PathBuf> {
    // First, try to find ddev in common paths
    for dir in get_common_paths() {
        let path = PathBuf::from(dir).join("ddev");
        if path.exists() {
            return Some(path);
        }
    }

    // On Windows, also check .exe extension
    #[cfg(target_os = "windows")]
    {
        for dir in get_common_paths() {
            let path = PathBuf::from(dir).join("ddev.exe");
            if path.exists() {
                return Some(path);
            }
        }
    }

    // Fall back to hoping it's in PATH
    None
}

/// Get an enhanced PATH that includes common installation directories
pub fn get_enhanced_path() -> String {
    let common_paths = get_common_paths();
    let current_path = env::var("PATH").unwrap_or_default();

    // Prepend common paths to existing PATH
    let mut paths: Vec<&str> = common_paths.clone();
    if !current_path.is_empty() {
        paths.push(&current_path);
    }

    paths.join(":")
}

/// Get the DDEV command - either the full path or just "ddev"
pub fn get_ddev_command() -> String {
    find_ddev_path()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| "ddev".to_string())
}

/// Run a DDEV command and return the raw output (async version)
pub async fn run_ddev_command_async(args: &[&str]) -> Result<String, DdevError> {
    let ddev_cmd = get_ddev_command();
    let enhanced_path = get_enhanced_path();

    let output = AsyncCommand::new(&ddev_cmd)
        .args(args)
        .env("PATH", &enhanced_path)
        .output()
        .await
        .map_err(|e| {
            if e.kind() == std::io::ErrorKind::NotFound {
                DdevError::NotInstalled
            } else {
                DdevError::IoError(e.to_string())
            }
        })?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(DdevError::CommandFailed(stderr.to_string()))
    }
}

/// Run a DDEV command with streaming output to the frontend (non-blocking)
/// Returns a process ID that can be used to cancel the command
pub fn run_ddev_command_streaming(
    window: Window,
    command_name: &str,
    project_name: &str,
    args: &[&str],
) -> Result<String, DdevError> {
    let process_id = generate_process_id();
    let command_name = command_name.to_string();
    let project_name = project_name.to_string();
    let args: Vec<String> = args.iter().map(|s| s.to_string()).collect();
    let ddev_cmd = get_ddev_command();
    let enhanced_path = get_enhanced_path();
    let process_id_clone = process_id.clone();

    // Emit start status with process_id
    let _ = window.emit(
        "command-status",
        CommandStatus {
            command: command_name.clone(),
            project: project_name.clone(),
            status: "started".to_string(),
            message: Some(format!("Running: ddev {}", args.join(" "))),
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
                    "command-status",
                    CommandStatus {
                        command: command_name,
                        project: project_name,
                        status: "error".to_string(),
                        message: Some(format!("Failed to start command: {}", e)),
                        process_id: None,
                    },
                );
                return;
            }
        };

        let stdout = child.stdout.take();
        let stderr = child.stderr.take();

        // Store child in registry BEFORE starting output threads
        // Use Some(child) since this is a single-command task
        {
            let mut registry = PROCESS_REGISTRY.lock().unwrap();
            registry.insert(
                process_id_clone.clone(),
                crate::process::ProcessEntry {
                    child: Some(child),
                    command: command_name.clone(),
                    project: project_name.clone(),
                },
            );
        }

        // Clone window for stderr thread
        let window_clone = window.clone();

        // Spawn thread for stdout
        let stdout_handle = stdout.map(|stdout| {
            let window = window.clone();
            thread::spawn(move || {
                let reader = BufReader::new(stdout);
                for line in reader.lines().map_while(Result::ok) {
                    let _ = window.emit(
                        "command-output",
                        CommandOutput {
                            line,
                            stream: "stdout".to_string(),
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
                        "command-output",
                        CommandOutput {
                            line,
                            stream: "stderr".to_string(),
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
        // For single-command tasks, we remove the entry entirely when done
        let status = {
            let mut registry = PROCESS_REGISTRY.lock().unwrap();
            registry
                .remove(&process_id_clone)
                .and_then(|entry| entry.child.map(|mut child| child.wait()))
        };

        match status {
            Some(Ok(exit_status)) if exit_status.success() => {
                let _ = window.emit(
                    "command-status",
                    CommandStatus {
                        command: command_name,
                        project: project_name,
                        status: "finished".to_string(),
                        message: Some("Command completed successfully".to_string()),
                        process_id: None,
                    },
                );
            }
            None => {
                // Process was cancelled - don't emit anything, cancel_command handles it
            }
            _ => {
                let _ = window.emit(
                    "command-status",
                    CommandStatus {
                        command: command_name,
                        project: project_name,
                        status: "error".to_string(),
                        message: Some("Command failed".to_string()),
                        process_id: None,
                    },
                );
            }
        }
    });

    Ok(process_id)
}

/// Run a DDEV command with JSON output (async version)
pub async fn run_ddev_json_command_async<T: for<'de> Deserialize<'de>>(
    args: &[&str],
) -> Result<T, DdevError> {
    let mut full_args = vec!["--json-output"];
    full_args.extend_from_slice(args);

    let output = run_ddev_command_async(&full_args).await?;

    // Parse the JSON response
    let response: DdevJsonResponse<T> =
        serde_json::from_str(&output).map_err(|e| DdevError::ParseError(e.to_string()))?;

    Ok(response.raw)
}

/// Helper to run a command with streaming output
/// If process_id is provided, registers the child process for cancellation support
#[allow(clippy::too_many_arguments)]
pub fn run_streaming_command(
    window: &Window,
    cmd: &str,
    args: &[&str],
    cwd: &str,
    enhanced_path: &str,
    process_id: Option<&str>,
    command_name: &str,
    project_name: &str,
) -> Result<bool, &'static str> {
    // Check if already cancelled before starting
    if let Some(pid) = process_id {
        if is_process_cancelled(pid) {
            return Err("cancelled");
        }
    }

    let result = Command::new(cmd)
        .args(args)
        .current_dir(cwd)
        .env("PATH", enhanced_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn();

    let mut child = match result {
        Ok(child) => child,
        Err(e) => {
            let _ = window.emit(
                "command-output",
                CommandOutput {
                    line: format!("Failed to start {}: {}", cmd, e),
                    stream: "stderr".to_string(),
                },
            );
            return Ok(false);
        }
    };

    let stdout = child.stdout.take();
    let stderr = child.stderr.take();

    // Register the child process for cancellation support
    if let Some(pid) = process_id {
        register_child_process(pid, child, command_name, project_name);
    }

    let window_clone = window.clone();

    let stdout_handle = stdout.map(|stdout| {
        let window = window.clone();
        thread::spawn(move || {
            let reader = BufReader::new(stdout);
            for line in reader.lines().map_while(Result::ok) {
                let _ = window.emit(
                    "command-output",
                    CommandOutput {
                        line,
                        stream: "stdout".to_string(),
                    },
                );
            }
        })
    });

    let stderr_handle = stderr.map(|stderr| {
        thread::spawn(move || {
            let reader = BufReader::new(stderr);
            for line in reader.lines().map_while(Result::ok) {
                let _ = window_clone.emit(
                    "command-output",
                    CommandOutput {
                        line,
                        stream: "stderr".to_string(),
                    },
                );
            }
        })
    });

    if let Some(handle) = stdout_handle {
        let _ = handle.join();
    }
    if let Some(handle) = stderr_handle {
        let _ = handle.join();
    }

    // Get the child back from registry and wait for it
    // The entry remains in the registry (with child=None) so is_process_cancelled still works
    if let Some(pid) = process_id {
        if let Some(mut child) = take_child_process(pid) {
            match child.wait() {
                Ok(status) => Ok(status.success()),
                Err(_) => Ok(false),
            }
        } else {
            // Either the entry was removed (cancelled) or child was already taken
            // Check if the entry still exists to determine which case
            if is_process_cancelled(pid) {
                Err("cancelled")
            } else {
                // Entry exists but child was already taken - shouldn't happen normally
                Ok(true)
            }
        }
    } else {
        // No process_id, this shouldn't happen in our usage but handle it
        Ok(true)
    }
}
