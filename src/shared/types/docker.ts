export type DockerStatusType = 'running' | 'stopped' | 'error' | 'connecting';

export interface DockerContainerStats {
  total: number;
  running: number;
  stopped: number;
}

export interface DockerStatus {
  status: DockerStatusType;
  version?: string;
  host?: string;
  containers?: DockerContainerStats;
  images?: number;
  uptime?: string;
  error?: string;
}
