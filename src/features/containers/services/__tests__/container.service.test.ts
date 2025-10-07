import { describe, expect, it } from 'vitest';
import type { Container } from '../../../../shared/types/container';
import { ContainerService } from '../container.service';

describe('ContainerService', () => {
  const mockContainers: Container[] = [
    {
      id: '1',
      name: 'postgres-1',
      dbType: 'PostgreSQL',
      version: '15',
      status: 'running',
      port: 5432,
      createdAt: new Date(),
      maxConnections: 100,
      persistData: true,
      enableAuth: true,
    },
    {
      id: '2',
      name: 'mysql-1',
      dbType: 'MySQL',
      version: '8.0',
      status: 'stopped',
      port: 3306,
      createdAt: new Date(),
      maxConnections: 100,
      persistData: true,
      enableAuth: true,
    },
  ];

  describe('isPortAvailable', () => {
    it('should return false when port is in use', () => {
      const result = ContainerService.isPortAvailable(5432, mockContainers);
      expect(result).toBe(false);
    });

    it('should return true when port is available', () => {
      const result = ContainerService.isPortAvailable(9999, mockContainers);
      expect(result).toBe(true);
    });

    it('should exclude container when checking availability', () => {
      const result = ContainerService.isPortAvailable(
        5432,
        mockContainers,
        '1',
      );
      expect(result).toBe(true);
    });
  });

  describe('isNameAvailable', () => {
    it('should return false when name is in use', () => {
      const result = ContainerService.isNameAvailable(
        'postgres-1',
        mockContainers,
      );
      expect(result).toBe(false);
    });

    it('should return true when name is available', () => {
      const result = ContainerService.isNameAvailable(
        'redis-1',
        mockContainers,
      );
      expect(result).toBe(true);
    });
  });

  describe('generateUniqueName', () => {
    it('should generate unique name with counter when name exists', () => {
      // Add a container that occupies the base name
      const containersWithPostgres = [
        ...mockContainers,
        {
          id: '3',
          name: 'postgresql',
          dbType: 'PostgreSQL' as const,
          version: '15',
          status: 'running' as const,
          port: 5433,
          createdAt: new Date(),
          maxConnections: 100,
          persistData: true,
          enableAuth: true,
        },
      ];
      const result = ContainerService.generateUniqueName(
        'postgresql',
        containersWithPostgres,
      );
      expect(result).toBe('postgresql-1');
    });

    it('should return base name if available', () => {
      const result = ContainerService.generateUniqueName(
        'Redis',
        mockContainers,
      );
      expect(result).toBe('redis');
    });
  });

  describe('getDefaultPort', () => {
    it('should return correct default port for PostgreSQL', () => {
      expect(ContainerService.getDefaultPort('PostgreSQL')).toBe(5432);
    });

    it('should return correct default port for MySQL', () => {
      expect(ContainerService.getDefaultPort('MySQL')).toBe(3306);
    });

    it('should return correct default port for Redis', () => {
      expect(ContainerService.getDefaultPort('Redis')).toBe(6379);
    });

    it('should return correct default port for MongoDB', () => {
      expect(ContainerService.getDefaultPort('MongoDB')).toBe(27017);
    });

    it('should return fallback port for unknown database', () => {
      expect(ContainerService.getDefaultPort('Unknown')).toBe(5432);
    });
  });

  describe('findAvailablePort', () => {
    it('should find next available port when default is taken', () => {
      const result = ContainerService.findAvailablePort(
        'PostgreSQL',
        mockContainers,
      );
      expect(result).toBe(5433); // 5432 is taken
    });

    it('should return default port when available', () => {
      const result = ContainerService.findAvailablePort(
        'Redis',
        mockContainers,
      );
      expect(result).toBe(6379); // Redis default, not taken
    });
  });

  describe('generateSecurePassword', () => {
    it('should generate password of specified length', () => {
      const password = ContainerService.generateSecurePassword(16);
      expect(password).toHaveLength(16);
    });

    it('should generate different passwords', () => {
      const pass1 = ContainerService.generateSecurePassword(16);
      const pass2 = ContainerService.generateSecurePassword(16);
      expect(pass1).not.toBe(pass2);
    });

    it('should contain valid characters', () => {
      const password = ContainerService.generateSecurePassword(20);
      const validChars = /^[a-zA-Z0-9!@#$%^&*]+$/;
      expect(password).toMatch(validChars);
    });
  });

  describe('getConnectionString', () => {
    it('should generate correct PostgreSQL connection string', () => {
      const container: Container = {
        ...mockContainers[0],
        username: 'postgres',
        password: 'pass123',
        databaseName: 'mydb',
      };

      const result = ContainerService.getConnectionString(container);
      expect(result).toBe('postgresql://postgres:pass123@localhost:5432/mydb');
    });

    it('should generate correct MySQL connection string', () => {
      const container: Container = {
        ...mockContainers[1],
        username: 'root',
        password: 'pass123',
        databaseName: 'mydb',
      };

      const result = ContainerService.getConnectionString(container);
      expect(result).toBe('mysql://root:pass123@localhost:3306/mydb');
    });
  });

  describe('validateCreateRequest', () => {
    it('should validate correct request', () => {
      const request = {
        name: 'new-container',
        dbType: 'PostgreSQL' as const,
        version: '15',
        port: 9999,
        password: 'password',
        username: 'user',
        persistData: true,
        enableAuth: true,
      };

      const result = ContainerService.validateCreateRequest(
        request,
        mockContainers,
      );
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when name is empty', () => {
      const request = {
        name: '',
        dbType: 'PostgreSQL' as const,
        version: '15',
        port: 9999,
        password: 'password',
        username: 'user',
        persistData: true,
        enableAuth: true,
      };

      const result = ContainerService.validateCreateRequest(
        request,
        mockContainers,
      );
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Name is required');
    });

    it('should fail when name is already in use', () => {
      const request = {
        name: 'postgres-1',
        dbType: 'PostgreSQL' as const,
        version: '15',
        port: 9999,
        password: 'password',
        username: 'user',
        persistData: true,
        enableAuth: true,
      };

      const result = ContainerService.validateCreateRequest(
        request,
        mockContainers,
      );
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'A database with that name already exists',
      );
    });

    it('should fail when port is already in use', () => {
      const request = {
        name: 'new-container',
        dbType: 'PostgreSQL' as const,
        version: '15',
        port: 5432,
        password: 'password',
        username: 'user',
        persistData: true,
        enableAuth: true,
      };

      const result = ContainerService.validateCreateRequest(
        request,
        mockContainers,
      );
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Port is already in use');
    });
  });

  describe('filterContainers', () => {
    it('should filter by name', () => {
      const result = ContainerService.filterContainers(
        mockContainers,
        'postgres',
      );
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('postgres-1');
    });

    it('should filter by db type', () => {
      const result = ContainerService.filterContainers(mockContainers, 'mysql');
      expect(result).toHaveLength(1);
      expect(result[0].dbType).toBe('MySQL');
    });

    it('should return all when query is empty', () => {
      const result = ContainerService.filterContainers(mockContainers, '');
      expect(result).toHaveLength(2);
    });

    it('should be case insensitive', () => {
      const result = ContainerService.filterContainers(
        mockContainers,
        'POSTGRES',
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('sortContainers', () => {
    it('should sort by name ascending', () => {
      const result = ContainerService.sortContainers(
        mockContainers,
        'name',
        'asc',
      );
      expect(result[0].name).toBe('mysql-1');
      expect(result[1].name).toBe('postgres-1');
    });

    it('should sort by name descending', () => {
      const result = ContainerService.sortContainers(
        mockContainers,
        'name',
        'desc',
      );
      expect(result[0].name).toBe('postgres-1');
      expect(result[1].name).toBe('mysql-1');
    });

    it('should sort by type', () => {
      const result = ContainerService.sortContainers(
        mockContainers,
        'type',
        'asc',
      );
      expect(result[0].dbType).toBe('MySQL');
      expect(result[1].dbType).toBe('PostgreSQL');
    });
  });

  describe('countByStatus', () => {
    it('should count containers by status', () => {
      const result = ContainerService.countByStatus(mockContainers);
      expect(result.running).toBe(1);
      expect(result.stopped).toBe(1);
    });
  });
});
