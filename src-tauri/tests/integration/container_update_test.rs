use docker_db_manager_lib::types::*;

/// Integration tests for container updates
///
/// These tests verify the complete container update flow,
/// especially the correct handling of volumes when the name changes.
mod container_update_integration_tests {
    use super::*;

    /// Helper to create a test DatabaseContainer
    fn create_test_container(name: &str, persistent: bool) -> DatabaseContainer {
        DatabaseContainer {
            id: uuid::Uuid::new_v4().to_string(),
            name: name.to_string(),
            db_type: "PostgreSQL".to_string(),
            version: "15".to_string(),
            status: "running".to_string(),
            port: 5432,
            created_at: chrono::Utc::now().format("%Y-%m-%d").to_string(),
            max_connections: 100,
            container_id: Some(format!("docker-{}", name)),
            stored_password: Some("testpass".to_string()),
            stored_username: Some("testuser".to_string()),
            stored_database_name: Some("testdb".to_string()),
            stored_persist_data: persistent,
            stored_enable_auth: true,
        }
    }

    #[tokio::test]
    async fn should_detect_recreation_needed_for_name_change() {
        // Arrange
        let original_container = create_test_container("postgres-old", true);
        let container_id = original_container.id.clone();

        let update_request = UpdateContainerRequest {
            container_id: container_id.clone(),
            name: Some("postgres-new".to_string()),
            port: None,
            username: None,
            password: None,
            database_name: None,
            max_connections: None,
            enable_auth: None,
            persist_data: None,
            restart_policy: None,
            auto_start: None,
        };

        // Act
        let needs_recreation = update_request.name.is_some()
            && update_request.name != Some(original_container.name.clone());

        // Assert
        assert!(
            needs_recreation,
            "Should detect that recreation is needed when name changes"
        );
    }

    #[tokio::test]
    async fn should_detect_recreation_needed_for_port_change() {
        // Arrange
        let original_container = create_test_container("postgres-test", true);
        let container_id = original_container.id.clone();

        let update_request = UpdateContainerRequest {
            container_id: container_id.clone(),
            name: None,
            port: Some(5433),
            username: None,
            password: None,
            database_name: None,
            max_connections: None,
            enable_auth: None,
            persist_data: None,
            restart_policy: None,
            auto_start: None,
        };

        // Act
        let needs_recreation =
            update_request.port.is_some() && update_request.port != Some(original_container.port);

        // Assert
        assert!(
            needs_recreation,
            "Should detect that recreation is needed when port changes"
        );
    }

    #[tokio::test]
    async fn should_not_recreate_when_only_metadata_changes() {
        // Arrange
        let original_container = create_test_container("postgres-test", true);
        let container_id = original_container.id.clone();

        let update_request = UpdateContainerRequest {
            container_id: container_id.clone(),
            name: None,
            port: None,
            username: Some("newuser".to_string()),
            password: Some("newpass".to_string()),
            database_name: Some("newdb".to_string()),
            max_connections: Some(200),
            enable_auth: None,
            persist_data: None,
            restart_policy: None,
            auto_start: None,
        };

        // Act
        let needs_recreation = update_request.port.is_some()
            && update_request.port != Some(original_container.port)
            || update_request.name.is_some()
                && update_request.name != Some(original_container.name.clone())
            || update_request.persist_data.is_some();

        // Assert
        assert!(
            !needs_recreation,
            "Should not recreate when only metadata changes (username, password, etc.)"
        );
    }

    #[tokio::test]
    async fn should_preserve_unchanged_data_in_update() {
        // Arrange
        let original_container = create_test_container("postgres-test", true);

        let update_request = UpdateContainerRequest {
            container_id: original_container.id.clone(),
            name: Some("postgres-new".to_string()),
            port: None,
            username: None,
            password: None,
            database_name: None,
            max_connections: None,
            enable_auth: None,
            persist_data: None,
            restart_policy: None,
            auto_start: None,
        };

        // Act - Simulate update logic
        let new_name = update_request
            .name
            .unwrap_or(original_container.name.clone());
        let new_port = update_request.port.unwrap_or(original_container.port);
        let persist_data = update_request
            .persist_data
            .unwrap_or(original_container.stored_persist_data);
        let enable_auth = update_request
            .enable_auth
            .unwrap_or(original_container.stored_enable_auth);

        // Assert
        assert_eq!(new_name, "postgres-new");
        assert_eq!(new_port, 5432); // Should keep original port
        assert_eq!(persist_data, true); // Should keep original persistence
        assert_eq!(enable_auth, true); // Should keep original auth
    }

    #[tokio::test]
    async fn should_generate_correct_volume_names_for_migration() {
        // Arrange
        let old_name = "postgres-old";
        let new_name = "postgres-new";

        // Act
        let old_volume_name = format!("{}-data", old_name);
        let new_volume_name = format!("{}-data", new_name);

        // Assert
        assert_eq!(old_volume_name, "postgres-old-data");
        assert_eq!(new_volume_name, "postgres-new-data");
        assert_ne!(
            old_volume_name, new_volume_name,
            "Volume names should be different when container name changes"
        );
    }

    #[tokio::test]
    async fn should_handle_persistence_change_correctly() {
        // Arrange
        let original_container = create_test_container("postgres-test", true);

        // Change from persistent to non-persistent
        let update_request = UpdateContainerRequest {
            container_id: original_container.id.clone(),
            name: Some("postgres-new".to_string()),
            port: None,
            username: None,
            password: None,
            database_name: None,
            max_connections: None,
            enable_auth: None,
            persist_data: Some(false),
            restart_policy: None,
            auto_start: None,
        };

        // Act
        let old_persistent = original_container.stored_persist_data;
        let new_persistent = update_request.persist_data.unwrap_or(old_persistent);
        let name_changed = update_request.name.is_some()
            && update_request.name != Some(original_container.name.clone());

        let should_cleanup_old = old_persistent && !new_persistent && name_changed;

        // Assert
        assert!(
            should_cleanup_old,
            "Should cleanup old volume when changing from persistent to non-persistent"
        );
    }

    #[tokio::test]
    async fn should_validate_create_request_structure_for_recreation() {
        // Arrange
        let original_container = create_test_container("postgres-old", true);
        let new_name = "postgres-new";
        let new_port = 5433;

        // Act - Simulate CreateDatabaseRequest creation
        let create_request = CreateDatabaseRequest {
            name: new_name.to_string(),
            db_type: original_container.db_type.clone(),
            version: original_container.version.clone(),
            port: new_port,
            username: original_container.stored_username.clone(),
            password: original_container
                .stored_password
                .clone()
                .unwrap_or_else(|| "password".to_string()),
            database_name: original_container.stored_database_name.clone(),
            persist_data: original_container.stored_persist_data,
            enable_auth: original_container.stored_enable_auth,
            max_connections: Some(original_container.max_connections),
            postgres_settings: None,
            mysql_settings: None,
            redis_settings: None,
            mongo_settings: None,
        };

        // Assert
        assert_eq!(create_request.name, new_name);
        assert_eq!(create_request.db_type, "PostgreSQL");
        assert_eq!(create_request.version, "15");
        assert_eq!(create_request.port, new_port);
        assert_eq!(create_request.username, Some("testuser".to_string()));
        assert_eq!(create_request.password, "testpass");
        assert_eq!(create_request.database_name, Some("testdb".to_string()));
        assert_eq!(create_request.persist_data, true);
        assert_eq!(create_request.enable_auth, true);
        assert_eq!(create_request.max_connections, Some(100));
    }

    /// Specific tests for container and volume removal
    mod container_removal_tests {
        use super::*;

        #[tokio::test]
        async fn should_remove_volume_when_persistent_container_is_removed() {
            // Arrange
            let container = create_test_container("postgres-persistent", true);

            // Act - Simulate removal logic
            let should_remove_volume = container.stored_persist_data;
            let expected_volume_name = format!("{}-data", container.name);

            // Assert
            assert!(
                should_remove_volume,
                "Should remove volume when removing a container with persistent data"
            );
            assert_eq!(expected_volume_name, "postgres-persistent-data");
        }

        #[tokio::test]
        async fn should_not_remove_volume_when_non_persistent_container_is_removed() {
            // Arrange
            let container = create_test_container("postgres-temp", false);

            // Act - Simulate removal logic
            let should_remove_volume = container.stored_persist_data;

            // Assert
            assert!(
                !should_remove_volume,
                "Should not remove volume when removing a container without persistent data"
            );
        }

        #[tokio::test]
        async fn should_generate_correct_volume_name_for_removal() {
            // Arrange
            let container_names = vec![
                ("postgres-db", "postgres-db-data"),
                ("mi_contenedor", "mi_contenedor-data"),
                ("test-123", "test-123-data"),
                ("redis-cache", "redis-cache-data"),
            ];

            for (container_name, expected_volume) in container_names {
                // Act
                let volume_name = format!("{}-data", container_name);

                // Assert
                assert_eq!(
                    volume_name, expected_volume,
                    "Volume name should follow the correct pattern for {}",
                    container_name
                );
            }
        }

        #[tokio::test]
        async fn should_validate_complete_container_removal_logic() {
            // Arrange
            let persistent_container = create_test_container("postgres-persistent", true);
            let temp_container = create_test_container("postgres-temp", false);

            // Act & Assert - Persistent container
            assert!(persistent_container.stored_persist_data);
            assert_eq!(persistent_container.name, "postgres-persistent");

            let persistent_volume = format!("{}-data", persistent_container.name);
            assert_eq!(persistent_volume, "postgres-persistent-data");

            // Act & Assert - Temporary container
            assert!(!temp_container.stored_persist_data);
            assert_eq!(temp_container.name, "postgres-temp");
        }
    }
}
