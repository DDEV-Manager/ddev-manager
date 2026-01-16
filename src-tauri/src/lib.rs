use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::env;
use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::thread;
use tauri::{Emitter, Window};
use tokio::process::Command as AsyncCommand;

/// Entry in the process registry containing the child process and metadata
/// The child is Option because between sequential commands in a multi-step task,
/// the entry remains but there's no active process to kill.
struct ProcessEntry {
    child: Option<Child>,
    command: String,
    project: String,
}

// Global process registry - stores active child processes by ID
static PROCESS_REGISTRY: Lazy<Mutex<HashMap<String, ProcessEntry>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

// Counter for generating unique process IDs
static PROCESS_COUNTER: Lazy<Mutex<u64>> = Lazy::new(|| Mutex::new(0));

fn generate_process_id() -> String {
    let mut counter = PROCESS_COUNTER.lock().unwrap();
    *counter += 1;
    format!("proc_{}", *counter)
}

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
    pub status: String, // "started", "finished", "error", "cancelled"
    pub message: Option<String>,
    pub process_id: Option<String>, // Present when status="started"
}

/// Common paths where DDEV might be installed
/// macOS app bundles don't inherit shell PATH, so we need to search common locations
fn get_common_paths() -> Vec<&'static str> {
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
fn find_ddev_path() -> Option<PathBuf> {
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
fn get_enhanced_path() -> String {
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
fn get_ddev_command() -> String {
    find_ddev_path()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| "ddev".to_string())
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

/// Installed addon information from `ddev add-on list`
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct InstalledAddon {
    #[serde(alias = "Name")]
    pub name: String,
    #[serde(alias = "Repository")]
    pub repository: String,
    #[serde(alias = "Version")]
    pub version: Option<String>,
}

/// Helper to deserialize tag_name which can be string, number, or null
fn deserialize_tag_name<'de, D>(deserializer: D) -> Result<Option<String>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    use serde::de::{self, Visitor};
    use std::fmt;

    struct TagNameVisitor;

    impl<'de> Visitor<'de> for TagNameVisitor {
        type Value = Option<String>;

        fn expecting(&self, formatter: &mut fmt::Formatter) -> fmt::Result {
            formatter.write_str("a string, number, or null")
        }

        fn visit_str<E: de::Error>(self, v: &str) -> Result<Self::Value, E> {
            Ok(Some(v.to_string()))
        }

        fn visit_string<E: de::Error>(self, v: String) -> Result<Self::Value, E> {
            Ok(Some(v))
        }

        fn visit_i64<E: de::Error>(self, v: i64) -> Result<Self::Value, E> {
            Ok(Some(v.to_string()))
        }

        fn visit_u64<E: de::Error>(self, v: u64) -> Result<Self::Value, E> {
            Ok(Some(v.to_string()))
        }

        fn visit_f64<E: de::Error>(self, v: f64) -> Result<Self::Value, E> {
            Ok(Some(v.to_string()))
        }

        fn visit_none<E: de::Error>(self) -> Result<Self::Value, E> {
            Ok(None)
        }

        fn visit_unit<E: de::Error>(self) -> Result<Self::Value, E> {
            Ok(None)
        }
    }

    deserializer.deserialize_any(TagNameVisitor)
}

/// Available addon from registry API
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RegistryAddon {
    pub title: String,
    pub github_url: String,
    pub description: String,
    pub user: String,
    pub repo: String,
    pub repo_id: i64,
    pub default_branch: String,
    #[serde(default, deserialize_with = "deserialize_tag_name")]
    pub tag_name: Option<String>,
    #[serde(default)]
    pub ddev_version_constraint: String,
    #[serde(default)]
    pub dependencies: Vec<String>,
    #[serde(rename = "type")]
    pub addon_type: String,
    pub created_at: String,
    pub updated_at: String,
    pub workflow_status: Option<String>,
    #[serde(default)]
    pub stars: i32,
}

/// Registry response structure from addons.ddev.com
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AddonRegistry {
    pub updated_datetime: String,
    pub total_addons_count: i32,
    pub official_addons_count: i32,
    pub contrib_addons_count: i32,
    pub addons: Vec<RegistryAddon>,
}

/// Run a DDEV command and return the raw output (async version)
async fn run_ddev_command_async(args: &[&str]) -> Result<String, DdevError> {
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
fn run_ddev_command_streaming(
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
                ProcessEntry {
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
            if let Some(entry) = registry.remove(&process_id_clone) {
                // Entry exists - take child and wait on it
                if let Some(mut child) = entry.child {
                    Some(child.wait())
                } else {
                    // Child was already taken (shouldn't happen for single-command tasks)
                    None
                }
            } else {
                // Process was cancelled and removed from registry
                None
            }
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
async fn run_ddev_json_command_async<T: for<'de> Deserialize<'de>>(
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

/// List all DDEV projects
#[tauri::command]
async fn list_projects() -> Result<Vec<DdevProjectBasic>, DdevError> {
    run_ddev_json_command_async(&["list"]).await
}

/// Get detailed information about a specific project
#[tauri::command]
async fn describe_project(name: String) -> Result<DdevProjectDetails, DdevError> {
    run_ddev_json_command_async(&["describe", &name]).await
}

/// Start a DDEV project (non-blocking, streams output via events)
/// Returns a process ID that can be used to cancel the command
#[tauri::command]
fn start_project(window: Window, name: String) -> Result<String, DdevError> {
    run_ddev_command_streaming(window, "start", &name, &["start", &name])
}

/// Stop a DDEV project (non-blocking, streams output via events)
/// Returns a process ID that can be used to cancel the command
#[tauri::command]
fn stop_project(window: Window, name: String) -> Result<String, DdevError> {
    run_ddev_command_streaming(window, "stop", &name, &["stop", &name])
}

/// Restart a DDEV project (non-blocking, streams output via events)
/// Returns a process ID that can be used to cancel the command
#[tauri::command]
fn restart_project(window: Window, name: String) -> Result<String, DdevError> {
    run_ddev_command_streaming(window, "restart", &name, &["restart", &name])
}

/// Power off all DDEV projects (non-blocking, streams output via events)
/// Returns a process ID that can be used to cancel the command
#[tauri::command]
fn poweroff(window: Window) -> Result<String, DdevError> {
    run_ddev_command_streaming(window, "poweroff", "all", &["poweroff"])
}

/// Delete a DDEV project (removes containers and config, keeps files)
/// Returns a process ID that can be used to cancel the command
#[tauri::command]
fn delete_project(window: Window, name: String) -> Result<String, DdevError> {
    run_ddev_command_streaming(
        window,
        "delete",
        &name,
        &["delete", "--omit-snapshot", "--yes", &name],
    )
}

/// List snapshots for a project
#[tauri::command]
async fn list_snapshots(project: String) -> Result<String, DdevError> {
    run_ddev_command_async(&["snapshot", "--list", &project]).await
}

/// Create a snapshot for a project
#[tauri::command]
async fn create_snapshot(project: String, name: Option<String>) -> Result<String, DdevError> {
    let args = match &name {
        Some(snapshot_name) => vec!["snapshot", "--name", snapshot_name, &project],
        None => vec!["snapshot", &project],
    };
    run_ddev_command_async(&args).await
}

/// Restore a snapshot for a project
#[tauri::command]
async fn restore_snapshot(project: String, snapshot: String) -> Result<String, DdevError> {
    run_ddev_command_async(&["snapshot", "restore", &snapshot, &project]).await
}

/// Check if DDEV is installed
#[tauri::command]
async fn check_ddev_installed() -> Result<bool, DdevError> {
    let ddev_cmd = get_ddev_command();
    let enhanced_path = get_enhanced_path();

    match AsyncCommand::new(&ddev_cmd)
        .arg("version")
        .env("PATH", &enhanced_path)
        .output()
        .await
    {
        Ok(output) => Ok(output.status.success()),
        Err(_) => Ok(false),
    }
}

/// Get DDEV version information
#[tauri::command]
async fn get_ddev_version() -> Result<String, DdevError> {
    run_ddev_command_async(&["version"]).await
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

/// List installed addons for a project
#[tauri::command]
async fn list_installed_addons(project: String) -> Result<Vec<InstalledAddon>, DdevError> {
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
async fn fetch_addon_registry() -> Result<AddonRegistry, DdevError> {
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
fn install_addon(window: Window, project: String, addon: String) -> Result<String, DdevError> {
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
fn remove_addon(window: Window, project: String, addon: String) -> Result<String, DdevError> {
    run_ddev_command_streaming(
        window,
        "addon-remove",
        &project,
        &["add-on", "remove", &addon, "--project", &project],
    )
}

/// Cancel a running DDEV command by its process ID
#[tauri::command]
fn cancel_command(window: Window, process_id: String) -> Result<(), DdevError> {
    let mut registry = PROCESS_REGISTRY.lock().unwrap();

    if let Some(entry) = registry.remove(&process_id) {
        // Kill the process if there's an active one
        if let Some(mut child) = entry.child {
            // Ignore errors - process might have already exited
            let _ = child.kill();
            // Wait for process to actually terminate (cleanup)
            let _ = child.wait();
        }

        // Emit cancelled status with the original command and project info
        let _ = window.emit(
            "command-status",
            CommandStatus {
                command: entry.command,
                project: entry.project,
                status: "cancelled".to_string(),
                message: Some("Command was cancelled by user".to_string()),
                process_id: Some(process_id),
            },
        );

        Ok(())
    } else {
        Err(DdevError::CommandFailed(format!(
            "Process {} not found or already completed",
            process_id
        )))
    }
}

/// Check if a folder is empty (completely empty, no files at all)
/// Composer create-project requires a truly empty folder
#[tauri::command]
async fn check_folder_empty(path: String) -> Result<bool, DdevError> {
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
async fn check_composer_installed() -> Result<bool, DdevError> {
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
async fn check_wpcli_installed() -> Result<bool, DdevError> {
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
async fn select_folder(app: tauri::AppHandle) -> Result<Option<String>, DdevError> {
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

/// CMS installation instruction
#[derive(Debug, Deserialize)]
struct CmsInstall {
    #[serde(rename = "type")]
    install_type: String, // "composer" or "wordpress"
    package: Option<String>, // composer package name
}

/// Helper to run a command with streaming output
/// If process_id is provided, registers the child process for cancellation support
fn run_streaming_command(
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

/// Result of install_cms - can be success, failure, or cancelled
enum CmsInstallResult {
    Success,
    Failed,
    Cancelled,
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

/// Check if a process/task has been cancelled (removed from registry by cancel_command)
fn is_process_cancelled(process_id: &str) -> bool {
    let registry = PROCESS_REGISTRY.lock().unwrap();
    !registry.contains_key(process_id)
}

/// Create an entry in the registry for a multi-step task (no active child yet)
fn create_task_entry(process_id: &str, command: &str, project: &str) {
    let mut registry = PROCESS_REGISTRY.lock().unwrap();
    registry.insert(
        process_id.to_string(),
        ProcessEntry {
            child: None,
            command: command.to_string(),
            project: project.to_string(),
        },
    );
}

/// Store a child process in the registry for cancellation support
/// Updates an existing entry or creates a new one
fn register_child_process(process_id: &str, child: Child, command: &str, project: &str) {
    let mut registry = PROCESS_REGISTRY.lock().unwrap();
    registry.insert(
        process_id.to_string(),
        ProcessEntry {
            child: Some(child),
            command: command.to_string(),
            project: project.to_string(),
        },
    );
}

/// Take the child process out of the registry entry (for waiting on it)
/// The entry remains in the registry with child=None
/// Returns None if entry doesn't exist (was cancelled) or if child was already taken
fn take_child_process(process_id: &str) -> Option<Child> {
    let mut registry = PROCESS_REGISTRY.lock().unwrap();
    if let Some(entry) = registry.get_mut(process_id) {
        entry.child.take()
    } else {
        None
    }
}

/// Completely remove a task entry from the registry
/// Call this when a multi-step task completes (success or error)
fn remove_task_entry(process_id: &str) {
    let mut registry = PROCESS_REGISTRY.lock().unwrap();
    registry.remove(process_id);
}

/// Create a new DDEV project (streaming output)
#[tauri::command]
fn create_project(
    window: Window,
    path: String,
    name: String,
    project_type: String,
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
        format!("--project-type={}", project_type),
        "--create-docroot".to_string(),
    ];

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
                return;
            }
        }
    });

    Ok(process_id)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            list_projects,
            describe_project,
            start_project,
            stop_project,
            restart_project,
            delete_project,
            poweroff,
            list_snapshots,
            create_snapshot,
            restore_snapshot,
            check_ddev_installed,
            get_ddev_version,
            open_project_url,
            open_project_folder,
            list_installed_addons,
            fetch_addon_registry,
            install_addon,
            remove_addon,
            cancel_command,
            select_folder,
            create_project,
            check_folder_empty,
            check_composer_installed,
            check_wpcli_installed,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
