use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseContainer {
    pub id: String,
    pub name: String,
    pub db_type: String,
    pub version: String,
    pub status: String,
    pub port: i32,
    pub created_at: String,
    pub max_connections: i32,
    pub container_id: Option<String>,
    // Store these to recreate container when needed
    pub stored_password: Option<String>,
    pub stored_username: Option<String>,
    pub stored_database_name: Option<String>,
    pub stored_persist_data: bool,
    pub stored_enable_auth: bool,
}

pub type DatabaseStore = std::sync::Mutex<std::collections::HashMap<String, DatabaseContainer>>;
