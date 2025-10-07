use docker_db_manager_lib::services::DockerService;
use docker_db_manager_lib::types::{settings::RedisSettings, CreateDatabaseRequest};
use std::process::Command;

mod utils;
use utils::*;

/// Integration tests specific to Redis
///
/// These tests verify that Redis functionality works correctly
/// with real Docker, including creation with and without authentication.

#[tokio::test]
async fn test_create_redis_container_without_auth() {
    // Skip if Docker is not available
    if !docker_available() {
        println!("⚠️ Docker is not available, skipping Redis test");
        return;
    }

    let container_name = "test-redis-no-auth-integration";

    // Initial cleanup
    clean_container(container_name).await;

    // Arrange - Redis configuration without authentication
    let service = DockerService::new();
    let request = CreateDatabaseRequest {
        name: container_name.to_string(),
        db_type: "Redis".to_string(),
        version: "7-alpine".to_string(),
        port: 6381,
        persist_data: false,
        username: None,
        password: "".to_string(), // No password
        database_name: None,
        enable_auth: false, // No authentication
        max_connections: Some(100),
        postgres_settings: None,
        mysql_settings: None,
        redis_settings: None,
        mongo_settings: None,
    };

    // Act - Build and execute command
    let command_result = service.build_docker_command(&request, &None);
    assert!(
        command_result.is_ok(),
        "DockerService should build valid Redis command"
    );

    let command = command_result.unwrap();
    println!("🐳 Redis command without auth generated: {:?}", command);

    // Verify Redis-specific elements
    assert!(
        command.contains(&"redis:7-alpine".to_string()),
        "Should use correct Redis image"
    );
    assert!(
        command.contains(&"6381:6379".to_string()),
        "Should map Redis port correctly"
    );
    // Without auth, should not contain requirepass
    assert!(
        !command.iter().any(|arg| arg.contains("requirepass")),
        "Redis without auth should not have requirepass"
    );

    // Execute Docker command
    let output = Command::new("docker")
        .args(&command)
        .output()
        .expect("Failed to execute Redis command");

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        clean_container(container_name).await;
        panic!("Docker failed to create Redis container: {}", error);
    }

    let container_id = String::from_utf8_lossy(&output.stdout).trim().to_string();
    println!("✅ Redis container created with ID: {}", container_id);

    // Verify that the container exists and is running
    tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;

    assert!(
        container_exists(container_name).await,
        "Redis container should exist"
    );

    // Verify status
    let status_output = Command::new("docker")
        .args(&[
            "ps",
            "--filter",
            &format!("name={}", container_name),
            "--format",
            "{{.Status}}",
        ])
        .output()
        .expect("Failed to get Redis status");

    let status = String::from_utf8_lossy(&status_output.stdout)
        .trim()
        .to_string();
    println!("📊 Redis container status: {}", status);

    // Cleanup
    clean_container(container_name).await;
    assert!(
        !container_exists(container_name).await,
        "Redis container should be deleted"
    );

    println!("✅ Redis test without auth completed successfully");
}

#[tokio::test]
async fn test_create_redis_container_with_auth() {
    if !docker_available() {
        println!("⚠️ Docker is not available, skipping Redis test with auth");
        return;
    }

    let container_name = "test-redis-auth-integration";

    // Initial cleanup
    clean_container(container_name).await;

    // Arrange - Redis configuration with authentication
    let service = DockerService::new();
    let request = CreateDatabaseRequest {
        name: container_name.to_string(),
        db_type: "Redis".to_string(),
        version: "7-alpine".to_string(),
        port: 6382,
        persist_data: false,
        username: None,
        password: "redis_secure_pass_123".to_string(),
        database_name: None,
        enable_auth: true, // With authentication
        max_connections: Some(200),
        postgres_settings: None,
        mysql_settings: None,
        redis_settings: None,
        mongo_settings: None,
    };

    // Act - Build command with authentication
    let command_result = service.build_docker_command(&request, &None);
    assert!(
        command_result.is_ok(),
        "Should build Redis command with auth"
    );

    let command = command_result.unwrap();
    println!("🐳 Redis command with auth: {:?}", command);

    // Verify Redis-specific elements with auth
    assert!(
        command.contains(&"redis:7-alpine".to_string()),
        "Should use correct Redis image"
    );
    assert!(
        command.contains(&"6382:6379".to_string()),
        "Should map Redis port correctly"
    );
    assert!(
        command.contains(&"redis-server".to_string()),
        "Should include redis-server for configuration"
    );
    assert!(
        command.contains(&"--requirepass".to_string()),
        "Should include requirepass for auth"
    );
    assert!(
        command.contains(&"redis_secure_pass_123".to_string()),
        "Should include the password"
    );

    // Execute command
    let output = Command::new("docker")
        .args(&command)
        .output()
        .expect("Failed to execute Redis command with auth");

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        clean_container(container_name).await;
        panic!(
            "Docker failed to create Redis container with auth: {}",
            error
        );
    }

    let container_id = String::from_utf8_lossy(&output.stdout).trim().to_string();
    println!(
        "✅ Redis container with auth created with ID: {}",
        container_id
    );

    // Verify functionality
    tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
    assert!(
        container_exists(container_name).await,
        "Redis container with auth should exist"
    );

    // Cleanup
    clean_container(container_name).await;
    assert!(
        !container_exists(container_name).await,
        "Redis container should be deleted"
    );

    println!("✅ Redis test with auth completed successfully");
}

#[tokio::test]
async fn test_create_redis_container_with_advanced_configuration() {
    if !docker_available() {
        println!("⚠️ Docker is not available, skipping advanced Redis test");
        return;
    }

    let container_name = "test-redis-advanced-integration";

    // Initial cleanup
    clean_container(container_name).await;

    // Arrange - Redis with advanced configuration using redis_settings
    let service = DockerService::new();
    let redis_settings = RedisSettings {
        max_memory: "256mb".to_string(),
        max_memory_policy: "allkeys-lru".to_string(),
        append_only: true,
        require_pass: true,
    };

    let request = CreateDatabaseRequest {
        name: container_name.to_string(),
        db_type: "Redis".to_string(),
        version: "7-alpine".to_string(),
        port: 6383,
        persist_data: false,
        username: None,
        password: "advanced_pass".to_string(),
        database_name: None,
        enable_auth: true,
        max_connections: Some(500),
        postgres_settings: None,
        mysql_settings: None,
        redis_settings: Some(redis_settings),
        mongo_settings: None,
    };

    // Act - Build command with advanced configuration
    let command_result = service.build_docker_command(&request, &None);
    assert!(
        command_result.is_ok(),
        "Should build advanced Redis command"
    );

    let command = command_result.unwrap();
    println!("🐳 Advanced Redis command: {:?}", command);

    // Verify advanced configuration
    assert!(
        command.contains(&"--maxmemory".to_string()),
        "Should include maxmemory"
    );
    assert!(
        command.contains(&"256mb".to_string()),
        "Should include memory limit"
    );
    assert!(
        command.contains(&"--maxmemory-policy".to_string()),
        "Should include memory policy"
    );
    assert!(
        command.contains(&"allkeys-lru".to_string()),
        "Should include LRU policy"
    );
    assert!(
        command.contains(&"--appendonly".to_string()),
        "Should include appendonly"
    );
    assert!(
        command.contains(&"yes".to_string()),
        "Should enable appendonly"
    );

    // Execute command
    let output = Command::new("docker")
        .args(&command)
        .output()
        .expect("Failed to execute advanced Redis command");

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        clean_container(container_name).await;
        panic!(
            "Docker failed to create advanced Redis container: {}",
            error
        );
    }

    println!("✅ Advanced Redis container created successfully");

    tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;

    // Cleanup
    clean_container(container_name).await;

    println!("✅ Advanced Redis test completed successfully");
}
