use docker_db_manager_lib::services::DockerService;
use docker_db_manager_lib::types::CreateDatabaseRequest;
use std::process::Command;

mod utils;
use utils::*;

/// Integration tests specific to PostgreSQL
///
/// These tests verify that PostgreSQL functionality works correctly
/// with real Docker, including container creation, configuration, and cleanup.

#[tokio::test]
async fn test_create_basic_postgresql_container() {
    // Skip if Docker is not available
    if !docker_available() {
        println!("⚠️ Docker is not available, skipping PostgreSQL test");
        return;
    }

    let container_name = "test-postgres-basic-integration";

    // Initial cleanup
    clean_container(container_name).await;

    // Arrange - Basic PostgreSQL configuration
    let service = DockerService::new();
    let request = CreateDatabaseRequest {
        name: container_name.to_string(),
        db_type: "PostgreSQL".to_string(),
        version: "13-alpine".to_string(),
        port: 5435,
        persist_data: false,
        username: Some("testuser".to_string()),
        password: "testpass123".to_string(),
        database_name: Some("testdb".to_string()),
        enable_auth: true,
        max_connections: Some(50),
        postgres_settings: None,
        mysql_settings: None,
        redis_settings: None,
        mongo_settings: None,
    };

    // Act - Build and execute command
    let command_result = service.build_docker_command(&request, &None);
    assert!(
        command_result.is_ok(),
        "DockerService should build valid PostgreSQL command"
    );

    let command = command_result.unwrap();
    println!("🐳 PostgreSQL command generated: {:?}", command);

    // Verify PostgreSQL-specific elements
    assert!(
        command.contains(&"postgres:13-alpine".to_string()),
        "Should use correct PostgreSQL image"
    );
    assert!(
        command.contains(&"5435:5432".to_string()),
        "Should map PostgreSQL port correctly"
    );
    assert!(
        command.contains(&"POSTGRES_PASSWORD=testpass123".to_string()),
        "Should include PostgreSQL password"
    );
    assert!(
        command.contains(&"POSTGRES_USER=testuser".to_string()),
        "Should include PostgreSQL user"
    );
    assert!(
        command.contains(&"POSTGRES_DB=testdb".to_string()),
        "Should include PostgreSQL database name"
    );

    // Execute Docker command
    let output = Command::new("docker")
        .args(&command)
        .output()
        .expect("Failed to execute PostgreSQL command");

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        clean_container(container_name).await;
        panic!("Docker failed to create PostgreSQL container: {}", error);
    }

    let container_id = String::from_utf8_lossy(&output.stdout).trim().to_string();
    println!("✅ PostgreSQL container created with ID: {}", container_id);

    // Verify that the container exists and is running
    wait_for_container(3).await;

    assert!(
        container_exists(container_name).await,
        "PostgreSQL container should exist"
    );

    // Verify status using utility
    if let Some(status) = get_container_status(container_name).await {
        println!("📊 PostgreSQL container status: {}", status);
    }

    // Cleanup
    clean_container(container_name).await;
    assert!(
        !container_exists(container_name).await,
        "PostgreSQL container should be deleted"
    );

    println!("✅ Basic PostgreSQL test completed successfully");
}

#[tokio::test]
async fn test_create_postgresql_container_with_volume() {
    if !docker_available() {
        println!("⚠️ Docker is not available, skipping PostgreSQL test with volume");
        return;
    }

    let container_name = "test-postgres-volume-integration";
    let volume_name = format!("{}-data", container_name);

    // Initial cleanup
    clean_container(container_name).await;
    clean_volume(&volume_name).await;

    let service = DockerService::new();
    let request = CreateDatabaseRequest {
        name: container_name.to_string(),
        db_type: "PostgreSQL".to_string(),
        version: "13-alpine".to_string(),
        port: 5436,
        persist_data: true, // With persistence
        username: Some("voluser".to_string()),
        password: "volpass123".to_string(),
        database_name: Some("voldb".to_string()),
        enable_auth: true,
        max_connections: Some(100),
        postgres_settings: None,
        mysql_settings: None,
        redis_settings: None,
        mongo_settings: None,
    };

    // Build command with volume
    let command_result = service.build_docker_command(&request, &Some(volume_name.clone()));
    assert!(
        command_result.is_ok(),
        "Should build PostgreSQL command with volume"
    );

    let command = command_result.unwrap();
    println!("🐳 PostgreSQL command with volume: {:?}", command);

    // Verify that it includes the volume
    assert!(
        command.contains(&"-v".to_string()),
        "Should include volume flag"
    );
    assert!(
        command.contains(&format!("{}:/var/lib/postgresql/data", volume_name)),
        "Should map PostgreSQL volume correctly"
    );

    // Create volume using utility
    if let Err(e) = create_volume(&volume_name).await {
        println!("⚠️ Warning when creating volume: {}", e);
    }

    // Execute command
    let output = Command::new("docker")
        .args(&command)
        .output()
        .expect("Failed to execute PostgreSQL command with volume");

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        clean_container(container_name).await;
        let _ = Command::new("docker")
            .args(&["volume", "rm", &volume_name])
            .output();
        panic!(
            "Docker failed to create PostgreSQL container with volume: {}",
            error
        );
    }

    println!("✅ PostgreSQL container with volume created successfully");

    wait_for_container(2).await;

    // Cleanup
    clean_container(container_name).await;
    clean_volume(&volume_name).await;

    println!("✅ PostgreSQL test with volume completed");
}
