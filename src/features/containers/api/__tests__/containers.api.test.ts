import { beforeEach, describe, expect, it, vi } from 'vitest';
import { invoke } from '../../../../core/tauri/invoke';
import { containersApi } from '../containers.api';

// Mock del invoke
vi.mock('../../../../core/tauri/invoke', () => ({
  invoke: vi.fn(),
}));

describe('containersApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('should fetch and transform all containers', async () => {
      const mockResponse = [
        {
          id: '1',
          name: 'postgres-1',
          db_type: 'PostgreSQL',
          version: '15',
          status: 'running',
          port: 5432,
          created_at: '2024-01-01T00:00:00Z',
          max_connections: 100,
          persist_data: true,
          enable_auth: true,
        },
      ];

      vi.mocked(invoke).mockResolvedValue(mockResponse);

      const result = await containersApi.getAll();

      expect(invoke).toHaveBeenCalledWith('get_all_databases');
      expect(result).toHaveLength(1);
      expect(result[0].dbType).toBe('PostgreSQL'); // Transformed to camelCase
    });
  });

  describe('create', () => {
    it('should create a container and transform response', async () => {
      const request = {
        name: 'test-db',
        dbType: 'PostgreSQL' as const,
        version: '15',
        port: 5432,
        password: 'password',
        username: 'postgres',
        persistData: true,
        enableAuth: true,
      };

      const mockResponse = {
        id: '1',
        name: 'test-db',
        db_type: 'PostgreSQL',
        version: '15',
        status: 'creating',
        port: 5432,
        created_at: '2024-01-01T00:00:00Z',
        max_connections: 100,
        persist_data: true,
        enable_auth: true,
      };

      vi.mocked(invoke).mockResolvedValue(mockResponse);

      const result = await containersApi.create(request);

      expect(invoke).toHaveBeenCalledWith('create_database_container', {
        request: expect.objectContaining({
          name: 'test-db',
          db_type: 'PostgreSQL', // Transformed to snake_case
          version: '15',
          port: 5432,
          password: 'password',
          username: 'postgres',
          persist_data: true,
          enable_auth: true,
        }),
      });
      expect(result.dbType).toBe('PostgreSQL');
    });
  });

  describe('start', () => {
    it('should start a container', async () => {
      vi.mocked(invoke).mockResolvedValue(undefined);

      await containersApi.start('container-id');

      expect(invoke).toHaveBeenCalledWith('start_container', {
        containerId: 'container-id',
      });
    });
  });

  describe('stop', () => {
    it('should stop a container', async () => {
      vi.mocked(invoke).mockResolvedValue(undefined);

      await containersApi.stop('container-id');

      expect(invoke).toHaveBeenCalledWith('stop_container', {
        containerId: 'container-id',
      });
    });
  });

  describe('remove', () => {
    it('should remove a container', async () => {
      vi.mocked(invoke).mockResolvedValue(undefined);

      await containersApi.remove('container-id');

      expect(invoke).toHaveBeenCalledWith('remove_container', {
        containerId: 'container-id',
      });
    });
  });

  describe('sync', () => {
    it('should sync containers with Docker', async () => {
      const mockResponse = [
        {
          id: '1',
          name: 'synced-container',
          db_type: 'MySQL',
          version: '8.0',
          status: 'running',
          port: 3306,
          created_at: '2024-01-01T00:00:00Z',
          max_connections: 100,
          persist_data: true,
          enable_auth: true,
        },
      ];

      vi.mocked(invoke).mockResolvedValue(mockResponse);

      const result = await containersApi.sync();

      expect(invoke).toHaveBeenCalledWith('sync_containers_with_docker');
      expect(result).toHaveLength(1);
      expect(result[0].dbType).toBe('MySQL');
    });
  });
});
