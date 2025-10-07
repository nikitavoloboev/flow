export interface ContainerSettings {
  postgres?: {
    initdb_args?: string;
    host_auth_method: string;
    shared_preload_libraries?: string;
  };
  mysql?: {
    root_host: string;
    character_set: string;
    collation: string;
    sql_mode: string;
  };
  redis?: {
    max_memory: string;
    max_memory_policy: string;
    append_only: boolean;
    require_pass: boolean;
  };
  mongo?: {
    auth_source: string;
    enable_sharding: boolean;
    oplog_size: string;
  };
}

export type ContainerStatus =
  | 'running'
  | 'stopped'
  | 'error'
  | 'creating'
  | 'removing';

export type DatabaseType = 'PostgreSQL' | 'MySQL' | 'Redis' | 'MongoDB';

export interface Container {
  id: string;
  name: string;
  dbType: DatabaseType;
  version: string;
  status: ContainerStatus;
  port: number;
  createdAt: Date;
  maxConnections: number;
  containerId?: string;
  username?: string;
  password?: string;
  databaseName?: string;
  persistData: boolean;
  enableAuth: boolean;
  settings?: ContainerSettings;
}

export interface CreateContainerRequest {
  name: string;
  dbType: DatabaseType;
  version: string;
  port: number;
  username?: string;
  password: string;
  databaseName?: string;
  persistData: boolean;
  enableAuth: boolean;
  maxConnections?: number;
  // Database-specific settings
  postgresSettings?: {
    initdbArgs?: string;
    hostAuthMethod?: string;
    sharedPreloadLibraries?: string;
  };
  mysqlSettings?: {
    rootHost?: string;
    characterSet?: string;
    collation?: string;
    sqlMode?: string;
  };
  redisSettings?: {
    maxMemory?: string;
    maxMemoryPolicy?: string;
    appendOnly?: boolean;
    requirePass?: boolean;
  };
  mongoSettings?: {
    authSource?: string;
    enableSharding?: boolean;
    oplogSize?: string;
  };
}

export interface UpdateContainerRequest {
  containerId: string;
  name?: string;
  port?: number;
  username?: string;
  password?: string;
  databaseName?: string;
  maxConnections?: number;
  enableAuth?: boolean;
  persistData?: boolean;
  restartPolicy?: string;
  autoStart?: boolean;
}

export interface ContainerError {
  error_type: string;
  message: string;
  port?: number;
  details?: string;
}
