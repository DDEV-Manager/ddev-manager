use tauri::Window;

use crate::ddev::run_ddev_command_streaming;
use crate::error::DdevError;

/// Select a database file to import (.sql, .sql.gz, .sql.tar.gz, .zip)
#[tauri::command]
pub async fn select_database_file(app: tauri::AppHandle) -> Result<Option<String>, DdevError> {
    use tauri_plugin_dialog::DialogExt;

    let (tx, rx) = tokio::sync::oneshot::channel();

    app.dialog()
        .file()
        .set_title("Select Database File")
        .add_filter("Database Files", &["sql", "gz", "zip"])
        .pick_file(move |file| {
            let result = file.map(|p| p.to_string());
            let _ = tx.send(result);
        });

    rx.await
        .map_err(|e| DdevError::CommandFailed(format!("Dialog channel error: {}", e)))
}

/// Select destination for database export
#[tauri::command]
pub async fn select_export_destination(
    app: tauri::AppHandle,
    default_name: String,
) -> Result<Option<String>, DdevError> {
    use tauri_plugin_dialog::DialogExt;

    let (tx, rx) = tokio::sync::oneshot::channel();

    app.dialog()
        .file()
        .set_title("Export Database")
        .set_file_name(&default_name)
        .add_filter("Gzipped SQL", &["gz"])
        .add_filter("SQL", &["sql"])
        .save_file(move |file| {
            let result = file.map(|p| p.to_string());
            let _ = tx.send(result);
        });

    rx.await
        .map_err(|e| DdevError::CommandFailed(format!("Dialog channel error: {}", e)))
}

/// Import a database file (streaming output)
#[tauri::command]
pub fn import_db(
    window: Window,
    project: String,
    file_path: String,
    database: Option<String>,
    no_drop: Option<bool>,
) -> Result<String, DdevError> {
    let mut args = vec!["import-db".to_string(), format!("--file={}", file_path)];

    if let Some(db) = database {
        if !db.is_empty() {
            args.push(format!("--database={}", db));
        }
    }

    if no_drop.unwrap_or(false) {
        args.push("--no-drop".to_string());
    }

    args.push(project.clone());

    let args_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    run_ddev_command_streaming(window, "import-db", &project, &args_refs)
}

/// Export database to file (streaming output)
#[tauri::command]
pub fn export_db(
    window: Window,
    project: String,
    file_path: String,
    database: Option<String>,
    compression: Option<String>,
) -> Result<String, DdevError> {
    let mut args = vec!["export-db".to_string(), format!("--file={}", file_path)];

    if let Some(db) = database {
        if !db.is_empty() {
            args.push(format!("--database={}", db));
        }
    }

    // Add compression flag (gzip is default, only add flag for bzip2 or xz)
    if let Some(comp) = compression {
        match comp.as_str() {
            "bzip2" => args.push("--bzip2".to_string()),
            "xz" => args.push("--xz".to_string()),
            _ => {} // gzip is default, no flag needed
        }
    }

    args.push(project.clone());

    let args_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    run_ddev_command_streaming(window, "export-db", &project, &args_refs)
}
