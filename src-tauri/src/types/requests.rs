use super::settings::*;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateDatabaseRequest {
    pub name: String,
    pub db_type: String,
    pub version: String,
    pub port: i32,
    pub username: Option<String>,
    pub password: String,
    pub database_name: Option<String>,
    pub persist_data: bool,
    pub enable_auth: bool,
    pub max_connections: Option<i32>,
    pub postgres_settings: Option<PostgresSettings>,
    pub mysql_settings: Option<MysqlSettings>,
    pub redis_settings: Option<RedisSettings>,
    pub mongo_settings: Option<MongoSettings>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateContainerRequest {
    pub container_id: String,
    pub name: Option<String>,
    pub port: Option<i32>,
    pub username: Option<String>,
    pub password: Option<String>,
    pub database_name: Option<String>,
    pub max_connections: Option<i32>,
    pub enable_auth: Option<bool>,
    pub persist_data: Option<bool>,
    pub restart_policy: Option<String>,
    pub auto_start: Option<bool>,
}
