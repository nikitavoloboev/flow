# Docker DB Manager - AI Agent Instructions

## Project Overview
A Tauri v2 desktop app for managing Docker database containers (PostgreSQL, MySQL, Redis, MongoDB). Built with React + TypeScript frontend and Rust backend, using a multi-window architecture.

## Architecture

### Multi-Window System
The app uses **separate HTML entry points** for different windows:
- `index.html` → MainPage (container list)
- `create-container.html` → CreateContainerPage (wizard)
- `edit-container.html` → EditContainerPage (edit existing)

Windows communicate via Tauri events (`container-created`, `container-updated`) rather than shared state. See `src-tauri/src/commands/window.rs` for window management.

### Frontend-Backend Bridge
- **Typed wrapper**: All Tauri commands go through `src/core/tauri/invoke.ts` for centralized error handling
- **Command pattern**: Rust commands in `src-tauri/src/commands/` are invoked by name string from TypeScript
- **State management**: `useApp()` orchestrates container list + Docker status; hooks are split by responsibility (see `src/features/`)

### Data Flow
1. **Storage**: `tauri-plugin-store` persists containers to `databases.json` (key-value store)
2. **Synchronization**: Auto-sync every 5s via `useContainerList` to reconcile with actual Docker state
3. **Docker commands**: Shell execution through `tauri-plugin-shell` (see `DockerService::run_container`)
4. **Error handling**: Rust returns JSON-encoded errors; TypeScript parses via `core/errors/error-handler.ts`

## Critical Patterns

### Container Lifecycle
When updating containers (port/name changes):
1. Container is **recreated** (removed and re-run with new config)
2. Volume migration happens if `persist_data=true` and name changed
3. Always cleanup volumes on errors (see `create_database_container` cleanup logic)

### Database-Specific Configuration
Each DB type has unique settings stored in `CreateDatabaseRequest`:
- PostgreSQL: `postgres_settings` (host_auth_method, initdb_args)
- MySQL: `mysql_settings` (character_set, collation)
- Redis: `redis_settings` (max_memory, append_only)
- MongoDB: `mongo_settings` (auth_source, enable_sharding)

Default ports are defined in `DockerService::get_default_port()`.

### Form Validation
Multi-step wizard uses `react-hook-form` + `zod` schemas:
- Schemas in `src/pages/create-container/schemas/`
- Step validation via `isCurrentStepValid` in wizard hook
- Form state persists across steps (single form instance)

## Development Commands

```bash
# Development (starts both Vite + Tauri)
npm run dev

# Linting (uses Biome, not ESLint)
npm run lint        # check only
npm run lint:fix    # auto-fix

# Testing
npm test           # watch mode
npm run test:run   # CI mode
npm run test:ui    # Vitest UI

# Rust tests
cd src-tauri && cargo test
```

### Build System
- **Vite**: Multi-entry build in `vite.config.ts` (rollupOptions.input)
- **Alias**: `@/` maps to `src/` in both Vite and tsconfig
- **Tauri dev**: Runs on port 1420 (strict port enforcement)

## Code Conventions

### File Naming
- **Enforced**: `kebab-case` for all files (Biome rule `useFilenamingConvention`)
- Hooks: `use-*.ts` (e.g., `use-container-list.ts`)
- Components: `PascalCase.tsx` (e.g., `MainPage.tsx`)

### Hook Composition
- **Separation of concerns**: Split hooks by responsibility
  - `use-container-list.ts`: State + sync
  - `use-container-actions.ts`: CRUD operations
  - `use-app.ts`: Orchestration layer
- Avoid monolithic hooks; prefer composition

### Error Handling
```typescript
// Frontend: Always use error handler
import { handleContainerError } from '@/core/errors/error-handler';
try {
  await containersApi.create(data);
} catch (error) {
  handleContainerError(error); // Parses JSON errors, shows toast
}

// Backend: Return Result<T, String> with JSON error structs
return Err(serde_json::to_string(&CreateContainerError {
    error_type: "PORT_IN_USE".to_string(),
    message: format!("Port {} is already in use", port),
    details: Some("Change the port...".to_string()),
}).unwrap());
```

## Testing Strategy

### Frontend
- **Vitest** with jsdom environment (`src/test/setup.ts`)
- Test files: `**/*.{test,spec}.{ts,tsx}` (not in `src-tauri/`)
- Coverage excludes: `src/test/`, `*.config.*`, type definitions

### Backend
- Unit tests: `src-tauri/tests/unit_services.rs`
- Integration tests: `src-tauri/tests/integration_tests.rs`
- Mock Docker commands when testing services

## Common Gotchas

1. **Window events**: Main window needs listeners for `container-created`/`container-updated` to refresh list
2. **Volume naming**: Always `{container-name}-data` format; handle renames carefully
3. **Docker status overlay**: Shown when Docker is unavailable; check `useDockerStatus` hook
4. **Rust mutex locks**: Always clone before async operations to avoid holding locks across await points
5. **Port validation**: Check both Docker availability AND port conflicts before creation

## Dependencies Notes

- **Biome**: Used instead of ESLint/Prettier (single config in `biome.json`)
- **Shadcn/ui**: Components in `src/shared/components/ui/` (Radix UI + Tailwind)
- **Framer Motion**: Animations in wizard steps (see `pageVariants` in `DatabaseSelectionForm`)
- **tauri-plugin-store**: Key-value persistence (NOT a database)

## Adding New Database Types

1. Add type to `DatabaseType` in `src/shared/types/container.ts`
2. Update `DockerService::build_docker_command()` with env vars
3. Add default port in `get_default_port()`
4. Add data path in `get_data_path()`
5. Create settings interface in `CreateContainerRequest`
6. Update wizard form validation schemas

## When in Doubt

- **Type mismatches**: Check both Rust types (`src-tauri/src/types/`) and TypeScript types (`src/shared/types/`)
- **Docker issues**: Run `docker version` and `docker info` commands used by `check_docker_status`
- **State sync**: Containers auto-sync every 5s; force reload with `loadContainers()`
