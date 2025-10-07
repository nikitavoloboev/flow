import { invoke } from '../../../core/tauri/invoke';

/**
 * API Layer - All Tauri calls for app-level commands
 */
export const appApi = {
  /**
   * Get app version from Rust backend
   */
  async getVersion(): Promise<string> {
    return await invoke<string>('get_app_version');
  },
};
