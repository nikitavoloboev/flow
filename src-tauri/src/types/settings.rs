use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PostgresSettings {
    pub initdb_args: Option<String>,
    pub host_auth_method: String,
    pub shared_preload_libraries: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MysqlSettings {
    pub root_host: String,
    pub character_set: String,
    pub collation: String,
    pub sql_mode: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RedisSettings {
    pub max_memory: String,
    pub max_memory_policy: String,
    pub append_only: bool,
    pub require_pass: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MongoSettings {
    pub auth_source: String,
    pub enable_sharding: bool,
    pub oplog_size: String,
}
