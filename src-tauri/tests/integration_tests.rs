/// Integration tests for Docker DB Manager
///
/// These tests verify the complete functionality by interacting with real components.
/// Some require Docker to be running on the system.

#[path = "integration/postgresql_integration_test.rs"]
mod postgresql_integration_test;

#[path = "integration/redis_integration_test.rs"]
mod redis_integration_test;

#[path = "integration/container_update_test.rs"]
mod container_update_test;
