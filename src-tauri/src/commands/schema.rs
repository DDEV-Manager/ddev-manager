use crate::error::DdevError;
use crate::schema::{fetch_schema, get_schema, DdevSchema};

/// Get the DDEV schema (from cache or fetch)
#[tauri::command]
pub async fn get_ddev_schema() -> Result<DdevSchema, DdevError> {
    Ok(get_schema().await)
}

/// Force refresh the DDEV schema from GitHub
#[tauri::command]
pub async fn refresh_ddev_schema() -> Result<DdevSchema, DdevError> {
    fetch_schema().await
}
