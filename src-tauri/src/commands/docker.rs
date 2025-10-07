use crate::services::*;
use crate::types::*;
use tauri::{AppHandle, State};

#[tauri::command]
pub async fn get_docker_status(app: AppHandle) -> Result<serde_json::Value, String> {
    let docker_service = DockerService::new();
    docker_service.check_docker_status(&app).await
}

#[tauri::command]
pub async fn sync_containers_with_docker(
    app: AppHandle,
    databases: State<'_, DatabaseStore>,
) -> Result<Vec<DatabaseContainer>, String> {
    let docker_service = DockerService::new();
    let storage_service = StorageService::new();

    // Sync with Docker
    let mut container_map = {
        let db_map = databases.lock().unwrap();
        db_map.clone()
    };
    docker_service
        .sync_containers_with_docker(&app, &mut container_map)
        .await?;

    // Update the database store with synced data
    {
        let mut db_map = databases.lock().unwrap();
        *db_map = container_map.clone();
    }

    // Save updated state
    storage_service
        .save_databases_to_store(&app, &container_map)
        .await?;

    Ok(container_map.values().cloned().collect())
}
