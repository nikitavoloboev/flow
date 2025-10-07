import {
  Container,
  ContainerStatus,
  CreateContainerRequest,
  DatabaseType,
  UpdateContainerRequest,
} from '../types/container';

export const isContainerRunning = (container: Container): boolean =>
  container.status === 'running';

export const isContainerStopped = (container: Container): boolean =>
  container.status === 'stopped';

export const canStartContainer = (container: Container): boolean =>
  container.status === 'stopped';

export const canStopContainer = (container: Container): boolean =>
  container.status === 'running';

export const canRemoveContainer = (container: Container): boolean =>
  container.status === 'stopped';

export const getContainerIcon = (dbType: DatabaseType): string => {
  const icons = {
    PostgreSQL: '🐘',
    MySQL: '🐬',
    Redis: '🔴',
    MongoDB: '🍃',
  };
  return icons[dbType] || '🗄️';
};

export const getContainerStatusColor = (status: ContainerStatus): string => {
  const colors = {
    running: 'green',
    stopped: 'gray',
    error: 'red',
    creating: 'blue',
    removing: 'orange',
  };
  return colors[status] || 'gray';
};

export const containerFromJSON = (data: any): Container => ({
  id: data.id,
  name: data.name,
  dbType: data.db_type,
  version: data.version,
  status: data.status,
  port: data.port,
  createdAt: new Date(data.created_at),
  maxConnections: data.max_connections,
  containerId: data.container_id,
  username: data.stored_username,
  password: data.stored_password,
  databaseName: data.stored_database_name,
  persistData: data.stored_persist_data,
  enableAuth: data.stored_enable_auth,
});

export const createRequestToTauri = (request: CreateContainerRequest): any => ({
  name: request.name,
  db_type: request.dbType,
  version: request.version,
  port: request.port,
  username: request.username,
  password: request.password,
  database_name: request.databaseName,
  persist_data: request.persistData,
  enable_auth: request.enableAuth,
  max_connections: request.maxConnections,
  postgres_settings: request.postgresSettings
    ? {
        initdb_args: request.postgresSettings.initdbArgs,
        host_auth_method: request.postgresSettings.hostAuthMethod || 'md5',
        shared_preload_libraries:
          request.postgresSettings.sharedPreloadLibraries,
      }
    : undefined,
  mysql_settings: request.mysqlSettings
    ? {
        root_host: request.mysqlSettings.rootHost || '%',
        character_set: request.mysqlSettings.characterSet || 'utf8mb4',
        collation: request.mysqlSettings.collation || 'utf8mb4_unicode_ci',
        sql_mode: request.mysqlSettings.sqlMode || 'TRADITIONAL',
      }
    : undefined,
  redis_settings: request.redisSettings
    ? {
        max_memory: request.redisSettings.maxMemory || '256mb',
        max_memory_policy:
          request.redisSettings.maxMemoryPolicy || 'allkeys-lru',
        append_only: request.redisSettings.appendOnly || false,
        require_pass: request.redisSettings.requirePass || false,
      }
    : undefined,
  mongo_settings: request.mongoSettings
    ? {
        auth_source: request.mongoSettings.authSource || 'admin',
        enable_sharding: request.mongoSettings.enableSharding || false,
        oplog_size: request.mongoSettings.oplogSize || '512',
      }
    : undefined,
});

export const updateRequestToTauri = (request: UpdateContainerRequest): any => ({
  container_id: request.containerId,
  name: request.name,
  port: request.port,
  username: request.username,
  password: request.password,
  database_name: request.databaseName,
  persist_data: request.persistData,
  enable_auth: request.enableAuth,
  max_connections: request.maxConnections,
  restart_policy: request.restartPolicy,
  auto_start: request.autoStart,
});

export const validateCreateRequest = (
  request: CreateContainerRequest,
): string[] => {
  const errors: string[] = [];

  if (!request.name.trim()) {
    errors.push('Name is required');
  }

  if (request.name.length > 50) {
    errors.push('Name cannot exceed 50 characters');
  }

  if (!request.password.trim()) {
    errors.push('Password is required');
  }

  if (request.password.length < 4) {
    errors.push('Password must be at least 4 characters');
  }

  if (request.port < 1024 || request.port > 65535) {
    errors.push('Port must be between 1024 and 65535');
  }

  if (request.maxConnections && request.maxConnections < 1) {
    errors.push('Maximum number of connections must be greater than 0');
  }

  return errors;
};

export const validateUpdateRequest = (
  request: UpdateContainerRequest,
): string[] => {
  const errors: string[] = [];

  if (!request.containerId.trim()) {
    errors.push('Container ID is required');
  }

  if (request.name !== undefined && !request.name.trim()) {
    errors.push('Name cannot be empty');
  }

  if (request.name !== undefined && request.name.length > 50) {
    errors.push('Name cannot exceed 50 characters');
  }

  if (
    request.port !== undefined &&
    (request.port < 1024 || request.port > 65535)
  ) {
    errors.push('Port must be between 1024 and 65535');
  }

  if (request.password !== undefined && request.password.length < 4) {
    errors.push('Password must be at least 4 characters');
  }

  if (request.maxConnections !== undefined && request.maxConnections < 1) {
    errors.push('Maximum number of connections must be greater than 0');
  }

  return errors;
};

export const generateConnectionString = (container: Container): string => {
  const host = 'localhost';
  const port = container.port;
  const username = container.username || '';
  const password = container.password || '';
  const databaseName = container.databaseName || '';

  switch (container.dbType) {
    case 'PostgreSQL':
      return `postgresql://${username}:${password}@${host}:${port}/${databaseName}`;
    case 'MySQL':
      return `mysql://${username}:${password}@${host}:${port}/${databaseName}`;
    case 'MongoDB':
      return `mongodb://${username}:${password}@${host}:${port}/${databaseName}`;
    case 'Redis':
      return `redis://${password ? `:${password}@` : ''}${host}:${port}`;
    default:
      return '';
  }
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    const { writeText } = await import('@tauri-apps/plugin-clipboard-manager');
    await writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};
