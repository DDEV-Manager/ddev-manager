use once_cell::sync::Lazy;
use std::collections::HashMap;
use std::process::Child;
use std::sync::Mutex;
use tauri::{Emitter, Window};

use crate::error::DdevError;
use crate::types::CommandStatus;

/// Entry in the process registry containing the child process and metadata
/// The child is Option because between sequential commands in a multi-step task,
/// the entry remains but there's no active process to kill.
pub struct ProcessEntry {
    pub child: Option<Child>,
    pub command: String,
    pub project: String,
}

// Global process registry - stores active child processes by ID
pub static PROCESS_REGISTRY: Lazy<Mutex<HashMap<String, ProcessEntry>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

// Counter for generating unique process IDs
static PROCESS_COUNTER: Lazy<Mutex<u64>> = Lazy::new(|| Mutex::new(0));

pub fn generate_process_id() -> String {
    let mut counter = PROCESS_COUNTER.lock().unwrap();
    *counter += 1;
    format!("proc_{}", *counter)
}

/// Check if a process/task has been cancelled (removed from registry by cancel_command)
pub fn is_process_cancelled(process_id: &str) -> bool {
    let registry = PROCESS_REGISTRY.lock().unwrap();
    !registry.contains_key(process_id)
}

/// Create an entry in the registry for a multi-step task (no active child yet)
pub fn create_task_entry(process_id: &str, command: &str, project: &str) {
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
pub fn register_child_process(process_id: &str, child: Child, command: &str, project: &str) {
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
pub fn take_child_process(process_id: &str) -> Option<Child> {
    let mut registry = PROCESS_REGISTRY.lock().unwrap();
    if let Some(entry) = registry.get_mut(process_id) {
        entry.child.take()
    } else {
        None
    }
}

/// Completely remove a task entry from the registry
/// Call this when a multi-step task completes (success or error)
pub fn remove_task_entry(process_id: &str) {
    let mut registry = PROCESS_REGISTRY.lock().unwrap();
    registry.remove(process_id);
}

/// Cancel a running DDEV command by its process ID
#[tauri::command]
pub fn cancel_command(window: Window, process_id: String) -> Result<(), DdevError> {
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
