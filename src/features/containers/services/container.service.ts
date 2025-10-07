import type {
  Container,
  CreateContainerRequest,
} from '../../../shared/types/container';

/**
 * Container Service - Pure business logic (without React, 100% testable)
 */
export class ContainerService {
  /**
   * Validate if a port is available
   */
  static isPortAvailable(
    port: number,
    existingContainers: Container[],
    excludeId?: string,
  ): boolean {
    return !existingContainers.some(
      (container) => container.port === port && container.id !== excludeId,
    );
  }

  /**
   * Validate if a name is available
   */
  static isNameAvailable(
    name: string,
    existingContainers: Container[],
    excludeId?: string,
  ): boolean {
    return !existingContainers.some(
      (container) => container.name === name && container.id !== excludeId,
    );
  }

  /**
   * Generate a unique name for a container
   */
  static generateUniqueName(
    dbType: string,
    existingContainers: Container[],
  ): string {
    const baseName = dbType.toLowerCase();
    let counter = 1;
    let name = baseName;

    while (!ContainerService.isNameAvailable(name, existingContainers)) {
      name = `${baseName}-${counter}`;
      counter++;
    }

    return name;
  }

  /**
   * Get the default port according to database type
   */
  static getDefaultPort(dbType: string): number {
    const defaultPorts: Record<string, number> = {
      PostgreSQL: 5432,
      MySQL: 3306,
      Redis: 6379,
      MongoDB: 27017,
    };

    return defaultPorts[dbType] || 5432;
  }

  /**
   * Find an available port based on the default port
   */
  static findAvailablePort(
    dbType: string,
    existingContainers: Container[],
  ): number {
    let port = ContainerService.getDefaultPort(dbType);

    while (!ContainerService.isPortAvailable(port, existingContainers)) {
      port++;
    }

    return port;
  }

  /**
   * Generate a secure random password
   */
  static generateSecurePassword(length = 16): string {
    const charset =
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    const array = new Uint32Array(length);
    crypto.getRandomValues(array);

    for (let i = 0; i < length; i++) {
      password += charset[array[i] % charset.length];
    }

    return password;
  }

  /**
   * Generate connection string for a container
   */
  static getConnectionString(container: Container): string {
    const { dbType, username, password, port, databaseName } = container;

    switch (dbType) {
      case 'PostgreSQL':
        return `postgresql://${username}:${password}@localhost:${port}/${databaseName}`;
      case 'MySQL':
        return `mysql://${username}:${password}@localhost:${port}/${databaseName}`;
      case 'MongoDB':
        return `mongodb://${username}:${password}@localhost:${port}/${databaseName}`;
      case 'Redis':
        return `redis://${password ? `:${password}@` : ''}localhost:${port}`;
      default:
        return '';
    }
  }

  /**
   * Validate a container creation request
   */
  static validateCreateRequest(
    request: CreateContainerRequest,
    existingContainers: Container[],
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate name
    if (!request.name || request.name.trim() === '') {
      errors.push('Name is required');
    } else if (
      !ContainerService.isNameAvailable(request.name, existingContainers)
    ) {
      errors.push('A database with that name already exists');
    }

    // Validate port
    if (!request.port || request.port < 1 || request.port > 65535) {
      errors.push('Port must be between 1 and 65535');
    } else if (
      !ContainerService.isPortAvailable(request.port, existingContainers)
    ) {
      errors.push('Port is already in use');
    }

    // Validate credentials (except for Redis which is optional)
    if (request.dbType !== 'Redis') {
      if (!request.username) {
        errors.push('Username is required');
      }
      if (!request.password) {
        errors.push('Password is required');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Filter containers by search query
   */
  static filterContainers(containers: Container[], query: string): Container[] {
    if (!query.trim()) {
      return containers;
    }

    const lowerQuery = query.toLowerCase();
    return containers.filter(
      (container) =>
        container.name.toLowerCase().includes(lowerQuery) ||
        container.dbType.toLowerCase().includes(lowerQuery) ||
        container.status.toLowerCase().includes(lowerQuery),
    );
  }

  /**
   * Sort containers by criteria
   */
  static sortContainers(
    containers: Container[],
    sortBy: 'name' | 'type' | 'status' | 'createdAt',
    order: 'asc' | 'desc' = 'asc',
  ): Container[] {
    const sorted = [...containers].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'type':
          comparison = a.dbType.localeCompare(b.dbType);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'createdAt':
          comparison =
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }

      return order === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }

  /**
   * Count containers by status
   */
  static countByStatus(containers: Container[]): Record<string, number> {
    return containers.reduce(
      (acc, container) => {
        acc[container.status] = (acc[container.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }
}
