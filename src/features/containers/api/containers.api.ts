import { invoke } from '../../../core/tauri/invoke';
import type {
  Container,
  CreateContainerRequest,
  UpdateContainerRequest,
} from '../../../shared/types/container';
import {
  containerFromJSON,
  createRequestToTauri,
  updateRequestToTauri,
} from '../../../shared/utils/container';

/**
 * API Layer - All Tauri calls for containers
 * Pure layer without business logic, only data transformations
 */
export const containersApi = {
  /**
   * Get all containers
   */
  async getAll(): Promise<Container[]> {
    const result = await invoke<unknown[]>('get_all_databases');
    return result.map(containerFromJSON);
  },

  /**
   * Get a container by ID
   */
  async getById(id: string): Promise<Container> {
    // For now, get all and filter (no individual get_database command)
    const all = await this.getAll();
    const container = all.find((c) => c.id === id);
    if (!container) {
      throw new Error(`Container with id ${id} not found`);
    }
    return container;
  },

  /**
   * Create a new container
   */
  async create(request: CreateContainerRequest): Promise<Container> {
    const tauriRequest = createRequestToTauri(request);
    const result = await invoke<unknown>('create_database_container', {
      request: tauriRequest,
    });
    return containerFromJSON(result);
  },

  /**
   * Update an existing container
   */
  async update(request: UpdateContainerRequest): Promise<Container> {
    const tauriRequest = updateRequestToTauri(request);
    const result = await invoke<unknown>('update_container_config', {
      request: tauriRequest,
    });
    return containerFromJSON(result);
  },

  /**
   * Start a container
   */
  async start(id: string): Promise<void> {
    await invoke('start_container', { containerId: id });
  },

  /**
   * Stop a container
   */
  async stop(id: string): Promise<void> {
    await invoke('stop_container', { containerId: id });
  },

  /**
   * Remove a container
   */
  async remove(id: string): Promise<void> {
    await invoke('remove_container', { containerId: id });
  },

  /**
   * Synchronize containers with Docker
   */
  async sync(): Promise<Container[]> {
    const result = await invoke<unknown[]>('sync_containers_with_docker');
    return result.map(containerFromJSON);
  },
};
