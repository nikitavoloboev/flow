use docker_db_manager_lib::services::DockerService;

/// Unit tests for DockerService
///
/// These tests verify the basic functionality of the Docker service
/// without interacting with real Docker, only testing pure logic.
mod docker_service_unit_tests {
    use super::*;

    /// Test to verify that the correct default ports are returned
    /// for each supported database type
    mod default_ports {
        use super::*;

        #[test]
        fn should_return_port_5432_for_postgresql() {
            // Arrange - Prepare
            let service = DockerService::new();

            // Act - Execute
            let puerto = service.get_default_port("PostgreSQL");

            // Assert - Verify
            assert_eq!(puerto, 5432, "PostgreSQL should use port 5432");
        }

        #[test]
        fn should_return_port_3306_for_mysql() {
            let service = DockerService::new();
            let puerto = service.get_default_port("MySQL");
            assert_eq!(puerto, 3306, "MySQL should use port 3306");
        }

        #[test]
        fn should_return_port_6379_for_redis() {
            let service = DockerService::new();
            let puerto = service.get_default_port("Redis");
            assert_eq!(puerto, 6379, "Redis should use port 6379");
        }

        #[test]
        fn should_return_port_27017_for_mongodb() {
            let service = DockerService::new();
            let puerto = service.get_default_port("MongoDB");
            assert_eq!(puerto, 27017, "MongoDB should use port 27017");
        }

        #[test]
        fn should_return_default_port_for_unknown_database() {
            let service = DockerService::new();
            let puerto = service.get_default_port("BaseDesconocida");
            assert_eq!(
                puerto, 5432,
                "An unknown database should use the default port (PostgreSQL)"
            );
        }

        #[test]
        fn should_handle_empty_string() {
            let service = DockerService::new();
            let puerto = service.get_default_port("");
            assert_eq!(puerto, 5432, "An empty string should use the default port");
        }
    }

    /// Tests to verify the default data paths
    /// for each database type
    mod data_paths {
        use super::*;

        #[test]
        fn should_return_correct_path_for_postgresql() {
            let service = DockerService::new();
            let ruta = service.get_data_path("PostgreSQL");
            assert_eq!(
                ruta, "/var/lib/postgresql/data",
                "PostgreSQL should use its standard data path"
            );
        }

        #[test]
        fn should_return_correct_path_for_mysql() {
            let service = DockerService::new();
            let ruta = service.get_data_path("MySQL");
            assert_eq!(
                ruta, "/var/lib/mysql",
                "MySQL should use its standard data path"
            );
        }

        #[test]
        fn should_return_correct_path_for_redis() {
            let service = DockerService::new();
            let ruta = service.get_data_path("Redis");
            assert_eq!(ruta, "/data", "Redis should use /data as path");
        }

        #[test]
        fn should_return_correct_path_for_mongodb() {
            let service = DockerService::new();
            let ruta = service.get_data_path("MongoDB");
            assert_eq!(ruta, "/data/db", "MongoDB should use /data/db as path");
        }

        #[test]
        fn should_return_default_path_for_unknown_database() {
            let service = DockerService::new();
            let ruta = service.get_data_path("BaseDesconocida");
            assert_eq!(
                ruta, "/data",
                "An unknown database should use /data by default"
            );
        }
    }
}
