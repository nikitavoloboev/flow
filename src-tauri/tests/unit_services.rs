/// Unit tests for services
///
/// This file includes all unit tests related to the services
/// of the Docker DB Manager project.

#[path = "unit/services/docker_service_test.rs"]
mod docker_service_test;

#[path = "unit/services/docker_command_builder_test.rs"]
mod docker_command_builder_test;

#[path = "unit/services/volume_migration_test.rs"]
mod volume_migration_test;
