import { beforeEach, describe, expect, it, vi } from 'vitest';
import { invoke } from '../../../../core/tauri/invoke';
import { appApi } from '../app.api';

// Mock invoke
vi.mock('../../../../core/tauri/invoke', () => ({
  invoke: vi.fn(),
}));

describe('appApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getVersion', () => {
    it('should fetch app version', async () => {
      const mockVersion = '1.2.3';
      vi.mocked(invoke).mockResolvedValue(mockVersion);

      const result = await appApi.getVersion();

      expect(invoke).toHaveBeenCalledWith('get_app_version');
      expect(result).toBe(mockVersion);
    });

    it('should handle errors from invoke', async () => {
      const error = new Error('Failed to get version');
      vi.mocked(invoke).mockRejectedValue(error);

      await expect(appApi.getVersion()).rejects.toThrow(
        'Failed to get version',
      );
    });
  });
});
