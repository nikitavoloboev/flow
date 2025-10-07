import { invoke } from '../../../core/tauri/invoke';
import type { DockerStatus } from '../../../shared/types/docker';

/**
 * API Layer - All Tauri calls for Docker
 */
export const dockerApi = {
  /**
   * Get Docker status
   */
  async getStatus(): Promise<DockerStatus> {
    return await invoke<DockerStatus>('get_docker_status');
  },

  /**
   * Check if Docker is available
   */
  async checkAvailability(): Promise<boolean> {
    try {
      const status = await dockerApi.getStatus();
      return status.status === 'running';
    } catch {
      return false;
    }
  },
};
