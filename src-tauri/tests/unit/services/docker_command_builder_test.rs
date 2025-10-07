use docker_db_manager_lib::services::DockerService;
use docker_db_manager_lib::types::CreateDatabaseRequest;

/// Unit tests for Docker command building
///
/// These tests verify that Docker commands are built correctly
/// according to input parameters, without executing real Docker.
mod docker_command_builder_tests {
    use super::*;

    /// Helper function to create a basic PostgreSQL request
    fn create_basic_postgresql_request() -> CreateDatabaseRequest {
        CreateDatabaseRequest {
            name: "test-postgres".to_string(),
            db_type: "PostgreSQL".to_string(),
            version: "15".to_string(),
            port: 5432,
            persist_data: false,
            username: Some("testuser".to_string()),
            password: "testpass".to_string(),
            database_name: Some("testdb".to_string()),
            enable_auth: true,
            max_connections: Some(100),
            postgres_settings: None,
            mysql_settings: None,
            redis_settings: None,
            mongo_settings: None,
        }
    }

    #[test]
    fn should_build_basic_postgresql_command_without_volume() {
        // Arrange
        let service = DockerService::new();
        let request = create_basic_postgresql_request();
        let volume_name = None;

        // Act
        let resultado = service.build_docker_command(&request, &volume_name);

        // Assert
        assert!(resultado.is_ok(), "Command building should be successful");

        let comando = resultado.unwrap();

        // Verify basic command elements
        assert_eq!(comando[0], "run", "First argument should be 'run'");
        assert_eq!(comando[1], "-d", "Should run in daemon mode");
        assert!(
            comando.contains(&"--name".to_string()),
            "Should include --name"
        );
        assert!(
            comando.contains(&"test-postgres".to_string()),
            "Should include container name"
        );
        assert!(
            comando.contains(&"-p".to_string()),
            "Should include port mapping"
        );
        assert!(
            comando.contains(&"5432:5432".to_string()),
            "Should map port correctly"
        );
    }

    #[test]
    fn should_include_volume_when_persist_data_is_true() {
        // Arrange
        let service = DockerService::new();
        let mut request = create_basic_postgresql_request();
        request.persist_data = true;
        let volume_name = Some("test-postgres-data".to_string());

        // Act
        let resultado = service.build_docker_command(&request, &volume_name);

        // Assert
        assert!(resultado.is_ok(), "Command building should be successful");

        let comando = resultado.unwrap();

        // Verify that it includes the volume
        assert!(
            comando.contains(&"-v".to_string()),
            "Should include volume flag"
        );
        assert!(
            comando.contains(&"test-postgres-data:/var/lib/postgresql/data".to_string()),
            "Should map volume correctly"
        );
    }

    #[test]
    fn should_use_custom_port_when_specified() {
        // Arrange
        let service = DockerService::new();
        let mut request = create_basic_postgresql_request();
        request.port = 5433; // Custom port
        let volume_name = None;

        // Act
        let resultado = service.build_docker_command(&request, &volume_name);

        // Assert
        assert!(resultado.is_ok(), "Command building should be successful");

        let comando = resultado.unwrap();

        // Verify that it uses the custom port
        assert!(
            comando.contains(&"5433:5432".to_string()),
            "Should map custom port to correct internal port"
        );
    }

    #[test]
    fn should_include_postgresql_environment_variables() {
        // Arrange
        let service = DockerService::new();
        let request = create_basic_postgresql_request();
        let volume_name = None;

        // Act
        let resultado = service.build_docker_command(&request, &volume_name);

        // Assert
        assert!(resultado.is_ok(), "Command building should be successful");

        let comando = resultado.unwrap();

        // Verify PostgreSQL environment variables
        assert!(
            comando.contains(&"-e".to_string()),
            "Should include environment variables"
        );
        assert!(
            comando.contains(&"POSTGRES_USER=testuser".to_string()),
            "Should include username"
        );
        assert!(
            comando.contains(&"POSTGRES_PASSWORD=testpass".to_string()),
            "Should include password"
        );
        assert!(
            comando.contains(&"POSTGRES_DB=testdb".to_string()),
            "Should include database name"
        );
    }

    /// Helper to create MySQL request
    fn create_basic_mysql_request() -> CreateDatabaseRequest {
        CreateDatabaseRequest {
            name: "test-mysql".to_string(),
            db_type: "MySQL".to_string(),
            version: "8.0".to_string(),
            port: 3306,
            persist_data: false,
            username: Some("root".to_string()),
            password: "rootpass".to_string(),
            database_name: Some("testdb".to_string()),
            enable_auth: true,
            max_connections: Some(151),
            postgres_settings: None,
            mysql_settings: None,
            redis_settings: None,
            mongo_settings: None,
        }
    }

    #[test]
    fn should_build_mysql_command_correctly() {
        // Arrange
        let service = DockerService::new();
        let request = create_basic_mysql_request();
        let volume_name = None;

        // Act
        let resultado = service.build_docker_command(&request, &volume_name);

        // Assert
        assert!(
            resultado.is_ok(),
            "MySQL command building should be successful"
        );

        let comando = resultado.unwrap();

        // Verify MySQL-specific elements
        assert!(
            comando.contains(&"3306:3306".to_string()),
            "Should map MySQL port"
        );
        assert!(
            comando.contains(&"MYSQL_ROOT_PASSWORD=rootpass".to_string()),
            "Should include root password"
        );
        assert!(
            comando.contains(&"MYSQL_DATABASE=testdb".to_string()),
            "Should include database name"
        );
        assert!(
            comando.contains(&"mysql:8.0".to_string()),
            "Should use correct MySQL image"
        );
    }
}
