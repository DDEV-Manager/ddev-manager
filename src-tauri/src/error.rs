use serde::Serialize;

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
