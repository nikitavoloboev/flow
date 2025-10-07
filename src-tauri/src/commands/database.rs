use crate::services::*;
use crate::types::*;
use tauri::{AppHandle, State};
use uuid::Uuid;

#[tauri::command]
pub async fn create_database_container(
    request: CreateDatabaseRequest,
    app: AppHandle,
    databases: State<'_, DatabaseStore>,
) -> Result<DatabaseContainer, String> {
    let docker_service = DockerService::new();
    let storage_service = StorageService::new();

    // Generate container ID
    let container_id = Uuid::new_v4().to_string();
    let volume_name = if request.persist_data {
        Some(format!("{}-data", request.name))
    } else {
        None
    };

    // Create volume if needed
    if let Some(vol_name) = &volume_name {
        docker_service
            .create_volume_if_needed(&app, vol_name)
            .await?;
    }

    // Build Docker command
    let docker_args = docker_service.build_docker_command(&request, &volume_name)?;

    // Execute Docker run command
    let real_container_id = match docker_service.run_container(&app, &docker_args).await {
        Ok(container_id) => container_id,
        Err(error) => {
            // Cleanup resources on error - do this synchronously to ensure cleanup before returning
            let _ = docker_service
                .force_remove_container_by_name(&app, &request.name)
                .await;

            if let Some(vol_name) = &volume_name {
                let _ = docker_service.remove_volume_if_exists(&app, vol_name).await;
            }

            // Check if it's a port already in use error
            if error.contains("port is already allocated") || error.contains("Bind for") {
                let port_error = CreateContainerError {
                    error_type: "PORT_IN_USE".to_string(),
                    message: format!("Port {} is already in use", request.port),
                    port: Some(request.port),
                    details: Some("You can change the port in the configuration and try again. The port can be modified later if needed.".to_string()),
                };
                return Err(serde_json::to_string(&port_error)
                    .unwrap_or_else(|_| "Port in use error".to_string()));
            }

            // Check if it's a container name already exists error
            if error.contains("name is already in use") || error.contains("already exists") {
                let name_error = CreateContainerError {
                    error_type: "NAME_IN_USE".to_string(),
                    message: format!(
                        "A container with the name '{}' already exists",
                        request.name
                    ),
                    port: None,
                    details: Some("Change the container name and try again.".to_string()),
                };
                return Err(serde_json::to_string(&name_error)
                    .unwrap_or_else(|_| "Name in use error".to_string()));
            }

            // Generic Docker error
            let generic_error = CreateContainerError {
                error_type: "DOCKER_ERROR".to_string(),
                message: "Error creating container".to_string(),
                port: None,
                details: Some(error.to_string()),
            };
            return Err(serde_json::to_string(&generic_error)
                .unwrap_or_else(|_| format!("Docker command failed: {}", error)));
        }
    };

    // Create database object
    let database = DatabaseContainer {
        id: container_id.clone(),
        name: request.name.clone(),
        db_type: request.db_type,
        version: request.version,
        status: "running".to_string(),
        port: request.port,
        created_at: chrono::Utc::now().format("%Y-%m-%d").to_string(),
        max_connections: request.max_connections.unwrap_or(100),
        container_id: Some(real_container_id.clone()),
        stored_password: Some(request.password.clone()),
        stored_username: request.username.clone(),
        stored_database_name: request.database_name.clone(),
        stored_persist_data: request.persist_data,
        stored_enable_auth: request.enable_auth,
    };

    // Store in memory
    databases
        .lock()
        .unwrap()
        .insert(container_id.clone(), database.clone());

    // Persist to store
    let db_map = {
        let map = databases.lock().unwrap();
        map.clone()
    };

    // If saving to store fails, cleanup the created container
    if let Err(store_error) = storage_service.save_databases_to_store(&app, &db_map).await {
        // Remove from memory
        databases.lock().unwrap().remove(&container_id);

        // Cleanup Docker resources
        let _ = docker_service
            .remove_container(&app, &real_container_id)
            .await;

        if let Some(vol_name) = &volume_name {
            let _ = docker_service.remove_volume_if_exists(&app, vol_name).await;
        }

        return Err(format!("Error saving configuration: {}", store_error));
    }

    Ok(database)
}

#[tauri::command]
pub async fn get_all_databases(
    app: AppHandle,
    databases: State<'_, DatabaseStore>,
) -> Result<Vec<DatabaseContainer>, String> {
    let docker_service = DockerService::new();
    let storage_service = StorageService::new();

    // Load from store first
    let loaded_databases = storage_service.load_databases_from_store(&app).await?;

    // Update in-memory store
    {
        let mut db_map = databases.lock().unwrap();
        *db_map = loaded_databases;
    }

    // Sync with Docker to get real status
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
        *db_map = container_map;
    }

    // Save updated state and return results
    let (db_map_clone, result) = {
        let db_map = databases.lock().unwrap();
        let clone = db_map.clone();
        let result = db_map.values().cloned().collect();
        (clone, result)
    };
    storage_service
        .save_databases_to_store(&app, &db_map_clone)
        .await?;

    Ok(result)
}

#[tauri::command]
pub async fn start_container(
    container_id: String,
    app: AppHandle,
    databases: State<'_, DatabaseStore>,
) -> Result<(), String> {
    let docker_service = DockerService::new();
    let storage_service = StorageService::new();

    // Get container info
    let real_container_id = {
        let db_map = databases.lock().unwrap();
        db_map
            .values()
            .find(|db| db.id == container_id)
            .and_then(|db| db.container_id.as_ref())
            .cloned()
            .ok_or("Container not found")?
    };

    docker_service
        .start_container(&app, &real_container_id)
        .await?;

    // Update status
    {
        let mut db_map = databases.lock().unwrap();
        if let Some(db) = db_map.values_mut().find(|db| db.id == container_id) {
            db.status = "running".to_string();
        }
    }

    let db_map = {
        let map = databases.lock().unwrap();
        map.clone()
    };
    storage_service
        .save_databases_to_store(&app, &db_map)
        .await?;

    Ok(())
}

#[tauri::command]
pub async fn stop_container(
    container_id: String,
    app: AppHandle,
    databases: State<'_, DatabaseStore>,
) -> Result<(), String> {
    let docker_service = DockerService::new();
    let storage_service = StorageService::new();

    // Get container info
    let real_container_id = {
        let db_map = databases.lock().unwrap();
        db_map
            .values()
            .find(|db| db.id == container_id)
            .and_then(|db| db.container_id.as_ref())
            .cloned()
            .ok_or("Container not found")?
    };

    docker_service
        .stop_container(&app, &real_container_id)
        .await?;

    // Update status
    {
        let mut db_map = databases.lock().unwrap();
        if let Some(db) = db_map.values_mut().find(|db| db.id == container_id) {
            db.status = "stopped".to_string();
        }
    }

    let db_map = {
        let map = databases.lock().unwrap();
        map.clone()
    };
    storage_service
        .save_databases_to_store(&app, &db_map)
        .await?;

    Ok(())
}

#[tauri::command]
pub async fn remove_container(
    container_id: String,
    app: AppHandle,
    databases: State<'_, DatabaseStore>,
) -> Result<(), String> {
    let docker_service = DockerService::new();
    let storage_service = StorageService::new();

    // Get container info before removing it
    let (real_container_id, container_info) = {
        let db_map = databases.lock().unwrap();
        let container = db_map.values().find(|db| db.id == container_id).cloned();
        let real_id = container
            .as_ref()
            .and_then(|db| db.container_id.as_ref())
            .cloned();
        (real_id, container)
    };

    // If we have a real container ID, try to remove it
    if let Some(real_id) = real_container_id {
        docker_service.remove_container(&app, &real_id).await?;
    }

    // If the container had persistent data, remove its volume
    if let Some(container) = &container_info {
        if container.stored_persist_data {
            let volume_name = format!("{}-data", container.name);
            docker_service
                .remove_volume_if_exists(&app, &volume_name)
                .await?;
        }
    }

    // Always remove from memory and store
    databases.lock().unwrap().remove(&container_id);

    let db_map = {
        let map = databases.lock().unwrap();
        map.clone()
    };
    storage_service
        .save_databases_to_store(&app, &db_map)
        .await?;

    Ok(())
}

#[tauri::command]
pub async fn update_container_config(
    request: UpdateContainerRequest,
    app: AppHandle,
    databases: State<'_, DatabaseStore>,
) -> Result<DatabaseContainer, String> {
    let docker_service = DockerService::new();
    let storage_service = StorageService::new();

    // Store values we need to check later
    let password_provided = request.password.is_some();
    let username_provided = request.username.is_some();
    let database_name_provided = request.database_name.is_some();

    // Get current container info
    let mut container = {
        let db_map = databases.lock().unwrap();
        db_map
            .get(&request.container_id)
            .cloned()
            .ok_or("Container not found")?
    };

    // Determine if we need to recreate the container
    let needs_recreation = request.port.is_some() && request.port != Some(container.port)
        || request.name.is_some() && request.name != Some(container.name.clone())
        || request.persist_data.is_some();

    if needs_recreation {
        // Remove old container
        if let Some(old_id) = &container.container_id {
            docker_service.remove_container(&app, old_id).await?;
        }

        // Create new container request with updated values
        let new_name = request.name.unwrap_or(container.name.clone());
        let new_port = request.port.unwrap_or(container.port);
        let persist_data = request
            .persist_data
            .unwrap_or(container.stored_persist_data);
        let enable_auth = request.enable_auth.unwrap_or(container.stored_enable_auth);

        let password = request.password.unwrap_or_else(|| {
            container
                .stored_password
                .clone()
                .unwrap_or_else(|| "password".to_string())
        });
        let username = request
            .username
            .or_else(|| container.stored_username.clone());
        let database_name = request
            .database_name
            .or_else(|| container.stored_database_name.clone());

        let create_request = CreateDatabaseRequest {
            name: new_name.clone(),
            db_type: container.db_type.clone(),
            version: container.version.clone(),
            port: new_port,
            username: username.clone(),
            password: password.clone(),
            database_name: database_name.clone(),
            persist_data,
            enable_auth,
            max_connections: request.max_connections.or(Some(container.max_connections)),
            postgres_settings: None,
            mysql_settings: None,
            redis_settings: None,
            mongo_settings: None,
        };

        // Handle volume migration if needed
        let volume_name = if persist_data {
            let old_volume_name = format!("{}-data", container.name);
            let new_volume_name = format!("{}-data", new_name);

            // If the container name is changing and we have persistent data,
            // we need to migrate the volume data
            if container.name != new_name && container.stored_persist_data {
                let data_path = docker_service.get_data_path(&container.db_type);
                docker_service
                    .migrate_volume_data(&app, &old_volume_name, &new_volume_name, data_path)
                    .await?;

                // Remove old volume after successful migration
                docker_service
                    .remove_volume_if_exists(&app, &old_volume_name)
                    .await?;
            } else {
                // Just create the new volume if needed
                docker_service
                    .create_volume_if_needed(&app, &new_volume_name)
                    .await?;
            }

            Some(new_volume_name)
        } else {
            // If we're changing from persistent to non-persistent, clean up old volume
            if container.stored_persist_data && container.name != new_name {
                let old_volume_name = format!("{}-data", container.name);
                docker_service
                    .remove_volume_if_exists(&app, &old_volume_name)
                    .await?;
            }
            None
        };

        // Build and run Docker command
        let docker_args = docker_service.build_docker_command(&create_request, &volume_name)?;
        let real_container_id = docker_service.run_container(&app, &docker_args).await?;

        // Update container info
        container.name = new_name;
        container.port = new_port;
        container.container_id = Some(real_container_id);
        container.status = "running".to_string();
        container.stored_persist_data = persist_data;
        container.stored_enable_auth = enable_auth;

        if password_provided {
            container.stored_password = Some(password);
        }
        if username_provided {
            container.stored_username = username;
        }
        if database_name_provided {
            container.stored_database_name = database_name;
        }

        if let Some(max_conn) = request.max_connections {
            container.max_connections = max_conn;
        }
    } else {
        // For non-recreating changes, just update the metadata
        if let Some(max_conn) = request.max_connections {
            container.max_connections = max_conn;
        }
    }

    // Update in memory store
    {
        let mut db_map = databases.lock().unwrap();
        db_map.insert(container.id.clone(), container.clone());
    }

    // Save to persistent store
    let db_map = {
        let map = databases.lock().unwrap();
        map.clone()
    };
    storage_service
        .save_databases_to_store(&app, &db_map)
        .await?;

    Ok(container)
}
