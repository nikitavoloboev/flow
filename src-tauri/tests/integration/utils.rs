use std::process::Command;

/// Shared utilities for Docker integration tests
///
/// This module contains helper functions that are used by multiple
/// integration test files to avoid code duplication.

/// Verifies if Docker is available and running
pub fn docker_available() -> bool {
    Command::new("docker")
        .args(&["version"])
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

/// Cleans up a container by name (forces stop and removal)
pub async fn clean_container(name: &str) {
    println!("🧹 Cleaning up container: {}", name);

    // Try to stop the container (ignore errors)
    let _ = Command::new("docker").args(&["stop", name]).output();

    // Try to remove the container (ignore errors)
    let _ = Command::new("docker").args(&["rm", "-f", name]).output();

    println!("✅ Container {} cleaned up", name);
}

/// Verifies if a container exists (running or stopped)
pub async fn container_exists(name: &str) -> bool {
    Command::new("docker")
        .args(&[
            "ps",
            "-a",
            "--filter",
            &format!("name={}", name),
            "--format",
            "{{.Names}}",
        ])
        .output()
        .map(|output| {
            let stdout = String::from_utf8_lossy(&output.stdout);
            stdout.trim() == name
        })
        .unwrap_or(false)
}

/// Gets the status of a container
pub async fn get_container_status(name: &str) -> Option<String> {
    Command::new("docker")
        .args(&[
            "ps",
            "-a",
            "--filter",
            &format!("name={}", name),
            "--format",
            "{{.Status}}",
        ])
        .output()
        .ok()
        .and_then(|output| {
            if output.status.success() {
                let status = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if !status.is_empty() {
                    Some(status)
                } else {
                    None
                }
            } else {
                None
            }
        })
}

/// Waits a specified time for the container to initialize
pub async fn wait_for_container_ready(seconds: u64) {
    println!(
        "⏳ Waiting {} seconds for the container to initialize...",
        seconds
    );
    tokio::time::sleep(tokio::time::Duration::from_secs(seconds)).await;
}

/// Shorter alias to wait for container
pub async fn wait_for_container(seconds: u64) {
    wait_for_container_ready(seconds).await;
}

/// Creates a Docker volume
pub async fn create_volume(name: &str) -> Result<String, String> {
    let output = Command::new("docker")
        .args(&["volume", "create", name])
        .output()
        .map_err(|e| format!("Error creating volume: {}", e))?;

    if output.status.success() {
        println!("📦 Volume {} created", name);
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).trim().to_string())
    }
}

/// Cleans up a Docker volume
pub async fn clean_volume(name: &str) {
    println!("🧹 Cleaning up volume: {}", name);

    // Try to remove the volume (ignore errors)
    let _ = Command::new("docker")
        .args(&["volume", "rm", name])
        .output();

    println!("✅ Volume {} cleaned up", name);
}
