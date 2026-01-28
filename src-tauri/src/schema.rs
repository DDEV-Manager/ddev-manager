use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::time::{Duration, SystemTime};

use crate::error::DdevError;

const SCHEMA_URL: &str =
    "https://raw.githubusercontent.com/ddev/ddev/master/pkg/ddevapp/schema.json";
const SCHEMA_FILENAME: &str = "ddev-schema.json";
const SCHEMA_MAX_AGE_HOURS: u64 = 24;

/// Parsed DDEV schema with the fields we need
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DdevSchema {
    pub php_versions: Vec<String>,
    pub project_types: Vec<String>,
    pub database_types: Vec<String>,
    pub webserver_types: Vec<String>,
    pub nodejs_versions: Vec<String>,
}

/// Raw schema structure from DDEV
#[derive(Debug, Deserialize)]
struct RawSchema {
    #[serde(rename = "$defs")]
    defs: Option<RawDefs>,
}

#[derive(Debug, Deserialize)]
struct RawDefs {
    php_version: Option<EnumDef>,
    #[serde(rename = "type")]
    project_type: Option<EnumDef>,
    database_type: Option<EnumDef>,
    webserver_type: Option<EnumDef>,
    nodejs_version: Option<EnumDef>,
}

#[derive(Debug, Deserialize)]
struct EnumDef {
    #[serde(rename = "enum")]
    values: Option<Vec<serde_json::Value>>,
}

impl DdevSchema {
    /// Create a schema with hardcoded fallback values
    pub fn fallback() -> Self {
        DdevSchema {
            php_versions: vec![
                "5.6".to_string(),
                "7.0".to_string(),
                "7.1".to_string(),
                "7.2".to_string(),
                "7.3".to_string(),
                "7.4".to_string(),
                "8.0".to_string(),
                "8.1".to_string(),
                "8.2".to_string(),
                "8.3".to_string(),
                "8.4".to_string(),
            ],
            project_types: vec![
                "backdrop".to_string(),
                "craftcms".to_string(),
                "drupal".to_string(),
                "drupal6".to_string(),
                "drupal7".to_string(),
                "laravel".to_string(),
                "magento".to_string(),
                "magento2".to_string(),
                "php".to_string(),
                "shopware6".to_string(),
                "silverstripe".to_string(),
                "typo3".to_string(),
                "wordpress".to_string(),
            ],
            database_types: vec![
                "mariadb".to_string(),
                "mysql".to_string(),
                "postgres".to_string(),
            ],
            webserver_types: vec!["nginx-fpm".to_string(), "apache-fpm".to_string()],
            nodejs_versions: vec![
                "16".to_string(),
                "18".to_string(),
                "20".to_string(),
                "22".to_string(),
            ],
        }
    }

    /// Parse from raw DDEV schema JSON
    fn from_raw(raw: &RawSchema) -> Self {
        let extract_strings = |def: Option<&EnumDef>| -> Vec<String> {
            def.and_then(|d| d.values.as_ref())
                .map(|values| {
                    values
                        .iter()
                        .filter_map(|v| v.as_str().map(|s| s.to_string()))
                        .collect()
                })
                .unwrap_or_default()
        };

        let defs = raw.defs.as_ref();

        DdevSchema {
            php_versions: defs
                .map(|d| extract_strings(d.php_version.as_ref()))
                .unwrap_or_default(),
            project_types: defs
                .map(|d| extract_strings(d.project_type.as_ref()))
                .unwrap_or_default(),
            database_types: defs
                .map(|d| extract_strings(d.database_type.as_ref()))
                .unwrap_or_default(),
            webserver_types: defs
                .map(|d| extract_strings(d.webserver_type.as_ref()))
                .unwrap_or_default(),
            nodejs_versions: defs
                .map(|d| extract_strings(d.nodejs_version.as_ref()))
                .unwrap_or_default(),
        }
    }

    /// Validate that the schema has the essential data
    fn is_valid(&self) -> bool {
        !self.php_versions.is_empty() && !self.project_types.is_empty()
    }
}

/// Get the path to the cached schema file
fn get_schema_path() -> Result<PathBuf, DdevError> {
    let data_dir = dirs::data_dir()
        .ok_or_else(|| DdevError::IoError("Could not determine app data directory".to_string()))?;

    let app_dir = data_dir.join("ddev-manager");
    if !app_dir.exists() {
        fs::create_dir_all(&app_dir).map_err(|e| {
            DdevError::IoError(format!("Failed to create app data directory: {}", e))
        })?;
    }

    Ok(app_dir.join(SCHEMA_FILENAME))
}

/// Check if the cached schema is older than the max age
fn is_schema_stale(path: &PathBuf) -> bool {
    if !path.exists() {
        return true;
    }

    match fs::metadata(path) {
        Ok(metadata) => match metadata.modified() {
            Ok(modified) => {
                let age = SystemTime::now()
                    .duration_since(modified)
                    .unwrap_or(Duration::MAX);
                age > Duration::from_secs(SCHEMA_MAX_AGE_HOURS * 3600)
            }
            Err(_) => true,
        },
        Err(_) => true,
    }
}

/// Fetch the schema from GitHub
pub async fn fetch_schema() -> Result<DdevSchema, DdevError> {
    let response = reqwest::get(SCHEMA_URL)
        .await
        .map_err(|e| DdevError::CommandFailed(format!("Failed to fetch schema: {}", e)))?;

    if !response.status().is_success() {
        return Err(DdevError::CommandFailed(format!(
            "Failed to fetch schema: HTTP {}",
            response.status()
        )));
    }

    let text = response
        .text()
        .await
        .map_err(|e| DdevError::CommandFailed(format!("Failed to read schema response: {}", e)))?;

    let raw: RawSchema = serde_json::from_str(&text)
        .map_err(|e| DdevError::ParseError(format!("Failed to parse schema: {}", e)))?;

    let schema = DdevSchema::from_raw(&raw);

    if !schema.is_valid() {
        return Err(DdevError::ParseError(
            "Schema is missing required fields".to_string(),
        ));
    }

    // Save to cache
    if let Ok(path) = get_schema_path() {
        let _ = save_schema(&schema, &path);
    }

    Ok(schema)
}

/// Load the schema from cache
pub fn load_cached_schema() -> Result<DdevSchema, DdevError> {
    let path = get_schema_path()?;

    if !path.exists() {
        return Err(DdevError::IoError("Cached schema not found".to_string()));
    }

    let content = fs::read_to_string(&path)
        .map_err(|e| DdevError::IoError(format!("Failed to read cached schema: {}", e)))?;

    let schema: DdevSchema = serde_json::from_str(&content)
        .map_err(|e| DdevError::ParseError(format!("Failed to parse cached schema: {}", e)))?;

    Ok(schema)
}

/// Save the schema to cache
fn save_schema(schema: &DdevSchema, path: &PathBuf) -> Result<(), DdevError> {
    let content = serde_json::to_string_pretty(schema)
        .map_err(|e| DdevError::ParseError(format!("Failed to serialize schema: {}", e)))?;

    fs::write(path, content)
        .map_err(|e| DdevError::IoError(format!("Failed to write schema cache: {}", e)))?;

    Ok(())
}

/// Get the schema, preferring cache but falling back to fetch or hardcoded
pub async fn get_schema() -> DdevSchema {
    // Try to load from cache first
    if let Ok(schema) = load_cached_schema() {
        return schema;
    }

    // Try to fetch from GitHub
    if let Ok(schema) = fetch_schema().await {
        return schema;
    }

    // Fall back to hardcoded values
    DdevSchema::fallback()
}

/// Ensure the schema is updated if it's stale (called on app startup)
/// This runs in the background and doesn't block
pub fn ensure_schema_updated() {
    tauri::async_runtime::spawn(async {
        if let Ok(path) = get_schema_path() {
            if is_schema_stale(&path) {
                // Fetch silently in background, ignore errors
                let _ = fetch_schema().await;
            }
        }
    });
}
