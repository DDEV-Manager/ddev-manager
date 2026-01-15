use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader};
use std::process::{Command, Stdio};
use std::thread;
use tauri::{Emitter, Window};

/// Error type for DDEV operations
#[derive(Debug, thiserror::Error)]
pub enum DdevError {
    #[error("DDEV command failed: {0}")]
    CommandFailed(String),
    #[error("Failed to parse DDEV output: {0}")]
    ParseError(String),
    #[error("DDEV is not installed or not in PATH")]
    NotInstalled,
    #[error("IO error: {0}")]
    IoError(String),
}

impl Serialize for DdevError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

/// Event payload for command output
#[derive(Clone, Serialize)]
pub struct CommandOutput {
    pub line: String,
    pub stream: String, // "stdout" or "stderr"
}

/// Event payload for command status
#[derive(Clone, Serialize)]
pub struct CommandStatus {
    pub command: String,
    pub project: String,
    pub status: String, // "started", "finished", "error"
    pub message: Option<String>,
}

/// Basic project info from `ddev list`
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DdevProjectBasic {
    pub name: String,
    pub status: String,
    pub status_desc: String,
    #[serde(rename = "type")]
    pub project_type: String,
    pub approot: String,
    pub shortroot: String,
    pub docroot: String,
    pub primary_url: String,
    pub httpurl: String,
    pub httpsurl: String,
    pub mailpit_url: String,
    pub mailpit_https_url: String,
    pub xhgui_url: String,
    pub xhgui_https_url: String,
    pub router: String,
    pub router_disabled: bool,
    pub mutagen_enabled: bool,
    pub nodejs_version: String,
}

/// Host port mapping
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HostPortMapping {
    pub exposed_port: String,
    pub host_port: String,
}

/// Service information
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DdevService {
    pub short_name: String,
    pub full_name: String,
    pub image: String,
    pub status: String,
    pub exposed_ports: String,
    pub host_ports: String,
    #[serde(default)]
    pub host_ports_mapping: Vec<HostPortMapping>,
    pub http_url: Option<String>,
    pub https_url: Option<String>,
    pub host_http_url: Option<String>,
    pub host_https_url: Option<String>,
    pub virtual_host: Option<String>,
}

/// Database information
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DdevDatabaseInfo {
    pub database_type: String,
    pub database_version: String,
    pub host: String,
    #[serde(rename = "dbPort")]
    pub db_port: String,
    pub dbname: String,
    pub username: String,
    pub password: String,
    pub published_port: i32,
}

/// Detailed project info from `ddev describe`
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DdevProjectDetails {
    pub name: String,
    pub status: String,
    pub status_desc: String,
    #[serde(rename = "type")]
    pub project_type: String,
    pub approot: String,
    pub shortroot: String,
    pub docroot: String,
    pub primary_url: String,
    pub httpurl: String,
    pub httpsurl: String,
    pub hostname: String,
    #[serde(default)]
    pub hostnames: Vec<String>,
    #[serde(rename = "httpURLs", default)]
    pub http_urls: Vec<String>,
    #[serde(rename = "httpsURLs", default)]
    pub https_urls: Vec<String>,
    #[serde(default)]
    pub urls: Vec<String>,
    pub php_version: Option<String>,
    pub webserver_type: Option<String>,
    pub database_type: Option<String>,
    pub database_version: Option<String>,
    pub performance_mode: Option<String>,
    pub webimg: Option<String>,
    pub dbimg: Option<String>,
    pub router_http_port: Option<String>,
    pub router_https_port: Option<String>,
    pub router_status: Option<String>,
    pub router_status_log: Option<String>,
    pub ssh_agent_status: Option<String>,
    #[serde(default)]
    pub xdebug_enabled: bool,
    pub xhgui_status: Option<String>,
    pub xhprof_mode: Option<String>,
    #[serde(default)]
    pub fail_on_hook_fail: bool,
    pub mailpit_url: String,
    pub mailpit_https_url: String,
    pub xhgui_url: String,
    pub xhgui_https_url: String,
    pub router: String,
    #[serde(default)]
    pub router_disabled: bool,
    #[serde(default)]
    pub mutagen_enabled: bool,
    pub nodejs_version: String,
    pub dbinfo: Option<DdevDatabaseInfo>,
    #[serde(default)]
    pub services: std::collections::HashMap<String, DdevService>,
}

/// DDEV JSON response wrapper
#[derive(Debug, Deserialize)]
struct DdevJsonResponse<T> {
    #[allow(dead_code)]
    level: String,
    #[allow(dead_code)]
    msg: String,
    raw: T,
    #[allow(dead_code)]
    time: String,
}

/// Run a DDEV command and return the raw output
fn run_ddev_command(args: &[&str]) -> Result<String, DdevError> {
    let output = Command::new("ddev")
        .args(args)
        .output()
        .map_err(|e| DdevError::IoError(e.to_string()))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(DdevError::CommandFailed(stderr.to_string()))
    }
}

/// Run a DDEV command with streaming output to the frontend (non-blocking)
fn run_ddev_command_streaming(
    window: Window,
    command_name: &str,
    project_name: &str,
    args: &[&str],
) -> Result<(), DdevError> {
    let command_name = command_name.to_string();
    let project_name = project_name.to_string();
    let args: Vec<String> = args.iter().map(|s| s.to_string()).collect();

    // Emit start status
    let _ = window.emit(
        "command-status",
        CommandStatus {
            command: command_name.clone(),
            project: project_name.clone(),
            status: "started".to_string(),
            message: Some(format!("Running: ddev {}", args.join(" "))),
        },
    );

    // Spawn the command in a background thread
    thread::spawn(move || {
        let result = Command::new("ddev")
            .args(&args)
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
                    },
                );
                return;
            }
        };

        let stdout = child.stdout.take();
        let stderr = child.stderr.take();

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

        // Wait for process to complete
        let status = child.wait();

        match status {
            Ok(exit_status) if exit_status.success() => {
                let _ = window.emit(
                    "command-status",
                    CommandStatus {
                        command: command_name,
                        project: project_name,
                        status: "finished".to_string(),
                        message: Some("Command completed successfully".to_string()),
                    },
                );
            }
            _ => {
                let _ = window.emit(
                    "command-status",
                    CommandStatus {
                        command: command_name,
                        project: project_name,
                        status: "error".to_string(),
                        message: Some("Command failed".to_string()),
                    },
                );
            }
        }
    });

    Ok(())
}

/// Run a DDEV command with JSON output
fn run_ddev_json_command<T: for<'de> Deserialize<'de>>(args: &[&str]) -> Result<T, DdevError> {
    let mut full_args = vec!["--json-output"];
    full_args.extend_from_slice(args);

    let output = run_ddev_command(&full_args)?;

    // Parse the JSON response
    let response: DdevJsonResponse<T> =
        serde_json::from_str(&output).map_err(|e| DdevError::ParseError(e.to_string()))?;

    Ok(response.raw)
}

/// List all DDEV projects
#[tauri::command]
fn list_projects() -> Result<Vec<DdevProjectBasic>, DdevError> {
    run_ddev_json_command(&["list"])
}

/// Get detailed information about a specific project
#[tauri::command]
fn describe_project(name: String) -> Result<DdevProjectDetails, DdevError> {
    run_ddev_json_command(&["describe", &name])
}

/// Start a DDEV project (non-blocking, streams output via events)
#[tauri::command]
fn start_project(window: Window, name: String) -> Result<(), DdevError> {
    run_ddev_command_streaming(window, "start", &name, &["start", &name])
}

/// Stop a DDEV project (non-blocking, streams output via events)
#[tauri::command]
fn stop_project(window: Window, name: String) -> Result<(), DdevError> {
    run_ddev_command_streaming(window, "stop", &name, &["stop", &name])
}

/// Restart a DDEV project (non-blocking, streams output via events)
#[tauri::command]
fn restart_project(window: Window, name: String) -> Result<(), DdevError> {
    run_ddev_command_streaming(window, "restart", &name, &["restart", &name])
}

/// Power off all DDEV projects (non-blocking, streams output via events)
#[tauri::command]
fn poweroff(window: Window) -> Result<(), DdevError> {
    run_ddev_command_streaming(window, "poweroff", "all", &["poweroff"])
}

/// List snapshots for a project
#[tauri::command]
fn list_snapshots(project: String) -> Result<String, DdevError> {
    run_ddev_command(&["snapshot", "--list", &project])
}

/// Create a snapshot for a project
#[tauri::command]
fn create_snapshot(project: String, name: Option<String>) -> Result<String, DdevError> {
    let mut args = vec!["snapshot"];

    if let Some(ref snapshot_name) = name {
        args.push("--name");
        args.push(snapshot_name);
    }

    args.push(&project);
    run_ddev_command(&args)
}

/// Restore a snapshot for a project
#[tauri::command]
fn restore_snapshot(project: String, snapshot: String) -> Result<String, DdevError> {
    run_ddev_command(&["snapshot", "restore", &snapshot, &project])
}

/// Check if DDEV is installed
#[tauri::command]
fn check_ddev_installed() -> Result<bool, DdevError> {
    match Command::new("ddev").arg("version").output() {
        Ok(output) => Ok(output.status.success()),
        Err(_) => Ok(false),
    }
}

/// Get DDEV version information
#[tauri::command]
fn get_ddev_version() -> Result<String, DdevError> {
    run_ddev_command(&["version"])
}

/// Open project URL in default browser
#[tauri::command]
fn open_project_url(url: String) -> Result<(), DdevError> {
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
fn open_project_folder(path: String) -> Result<(), DdevError> {
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            list_projects,
            describe_project,
            start_project,
            stop_project,
            restart_project,
            poweroff,
            list_snapshots,
            create_snapshot,
            restore_snapshot,
            check_ddev_installed,
            get_ddev_version,
            open_project_url,
            open_project_folder,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
