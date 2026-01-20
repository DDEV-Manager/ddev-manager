use serde::{Deserialize, Deserializer, Serialize};
use std::collections::HashMap;

/// Helper to deserialize a field that can be null or an array into Vec<T>
pub fn deserialize_null_as_empty_vec<'de, D, T>(deserializer: D) -> Result<Vec<T>, D::Error>
where
    D: Deserializer<'de>,
    T: Deserialize<'de>,
{
    let opt: Option<Vec<T>> = Option::deserialize(deserializer)?;
    Ok(opt.unwrap_or_default())
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
    #[serde(default)]
    pub docroot: String,
    #[serde(default)]
    pub primary_url: String,
    #[serde(default)]
    pub httpurl: String,
    #[serde(default)]
    pub httpsurl: String,
    #[serde(default)]
    pub mailpit_url: String,
    #[serde(default)]
    pub mailpit_https_url: String,
    #[serde(default)]
    pub xhgui_url: String,
    #[serde(default)]
    pub xhgui_https_url: String,
    #[serde(default)]
    pub router: String,
    #[serde(default)]
    pub router_disabled: bool,
    #[serde(default)]
    pub mutagen_enabled: bool,
    #[serde(default)]
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
    #[serde(default)]
    pub docroot: String,
    #[serde(default)]
    pub primary_url: String,
    #[serde(default)]
    pub httpurl: String,
    #[serde(default)]
    pub httpsurl: String,
    #[serde(default)]
    pub hostname: String,
    #[serde(default, deserialize_with = "deserialize_null_as_empty_vec")]
    pub hostnames: Vec<String>,
    #[serde(
        rename = "httpURLs",
        default,
        deserialize_with = "deserialize_null_as_empty_vec"
    )]
    pub http_urls: Vec<String>,
    #[serde(
        rename = "httpsURLs",
        default,
        deserialize_with = "deserialize_null_as_empty_vec"
    )]
    pub https_urls: Vec<String>,
    #[serde(default, deserialize_with = "deserialize_null_as_empty_vec")]
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
    #[serde(default)]
    pub mailpit_url: String,
    #[serde(default)]
    pub mailpit_https_url: String,
    #[serde(default)]
    pub xhgui_url: String,
    #[serde(default)]
    pub xhgui_https_url: String,
    #[serde(default)]
    pub router: String,
    #[serde(default)]
    pub router_disabled: bool,
    #[serde(default)]
    pub mutagen_enabled: bool,
    #[serde(default)]
    pub nodejs_version: String,
    pub dbinfo: Option<DdevDatabaseInfo>,
    #[serde(default)]
    pub services: HashMap<String, DdevService>,
}

/// DDEV JSON response wrapper
#[derive(Debug, Deserialize)]
pub struct DdevJsonResponse<T> {
    #[allow(dead_code)]
    pub level: String,
    #[allow(dead_code)]
    pub msg: String,
    pub raw: T,
    #[allow(dead_code)]
    pub time: String,
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
pub fn deserialize_tag_name<'de, D>(deserializer: D) -> Result<Option<String>, D::Error>
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

/// Output structure for log events
#[derive(Clone, Serialize)]
pub struct LogOutput {
    pub line: String,
    pub stream: String, // "stdout" or "stderr"
    pub project: String,
    pub service: String,
}

/// Status structure for log streaming
#[derive(Clone, Serialize)]
pub struct LogStatus {
    pub project: String,
    pub service: String,
    pub status: String, // "started", "finished", "error", "cancelled"
    pub message: Option<String>,
    pub process_id: Option<String>,
}

/// Status structure for screenshot capture
#[derive(Clone, Serialize)]
pub struct ScreenshotStatus {
    pub project: String,
    pub status: String, // "started", "capturing", "finished", "error"
    pub path: Option<String>,
    pub message: Option<String>,
}

/// CMS installation instruction
#[derive(Debug, Deserialize)]
pub struct CmsInstall {
    #[serde(rename = "type")]
    pub install_type: String, // "composer" or "wordpress"
    pub package: Option<String>, // composer package name
}

/// Result of install_cms - can be success, failure, or cancelled
pub enum CmsInstallResult {
    Success,
    Failed,
    Cancelled,
}
