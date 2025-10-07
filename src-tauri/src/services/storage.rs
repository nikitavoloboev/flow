use crate::types::*;
use serde_json::json;
use std::collections::HashMap;
use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

pub struct StorageService;

impl StorageService {
    pub fn new() -> Self {
        Self
    }

    pub async fn save_databases_to_store(
        &self,
        app: &AppHandle,
        databases: &HashMap<String, DatabaseContainer>,
    ) -> Result<(), String> {
        let path = std::path::PathBuf::from("databases.json");

        let store = app
            .store(path)
            .map_err(|e| format!("Failed to access store: {}", e))?;

        let databases_vec: Vec<DatabaseContainer> = databases.values().cloned().collect();

        store.set("databases".to_string(), json!(databases_vec));
        store
            .save()
            .map_err(|e| format!("Failed to save store: {}", e))?;

        Ok(())
    }

    pub async fn load_databases_from_store(
        &self,
        app: &AppHandle,
    ) -> Result<HashMap<String, DatabaseContainer>, String> {
        let path = std::path::PathBuf::from("databases.json");

        let store = app
            .store(path)
            .map_err(|e| format!("Failed to access store: {}", e))?;

        let mut database_map = HashMap::new();

        if let Some(value) = store.get("databases") {
            let databases_vec: Vec<DatabaseContainer> = serde_json::from_value(value.clone())
                .map_err(|e| format!("Failed to deserialize databases: {}", e))?;

            for db in databases_vec {
                database_map.insert(db.id.clone(), db);
            }
        }

        Ok(database_map)
    }
}
