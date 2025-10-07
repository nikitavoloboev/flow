const path = require('node:path');
const fs = require('node:fs');

const version = process.env.DOCKER_DB_MANAGER_VERSION?.replace('v', '');
if (!version) {
  throw new Error('DOCKER_DB_MANAGER_VERSION environment variable not set');
}

// Update tauri.conf.json
const tauriConfigPath = path.join(__dirname, '../src-tauri/tauri.conf.json');
const tauriConfig = JSON.parse(fs.readFileSync(tauriConfigPath, 'utf8'));

tauriConfig.version = version;

console.log('Writing version ' + version + ' to ' + tauriConfigPath);
fs.writeFileSync(tauriConfigPath, JSON.stringify(tauriConfig, null, 2));

// Update Cargo.toml
const cargoTomlPath = path.join(__dirname, '../src-tauri/Cargo.toml');
let cargoToml = fs.readFileSync(cargoTomlPath, 'utf8');

// Replace version line in [package] section
cargoToml = cargoToml.replace(/^version = ".*"$/m, `version = "${version}"`);

console.log('Writing version ' + version + ' to ' + cargoTomlPath);
fs.writeFileSync(cargoTomlPath, cargoToml);
