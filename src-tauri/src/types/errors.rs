use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateContainerError {
    pub error_type: String,
    pub message: String,
    pub port: Option<i32>,
    pub details: Option<String>,
}
