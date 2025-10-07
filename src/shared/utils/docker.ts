import { DockerStatus } from '../types/docker';

export const isDockerRunning = (status: DockerStatus): boolean =>
  status.status === 'running';

export const isDockerStopped = (status: DockerStatus): boolean =>
  status.status === 'stopped';

export const hasDockerError = (status: DockerStatus): boolean =>
  status.status === 'error';

export const isDockerConnecting = (status: DockerStatus): boolean =>
  status.status === 'connecting';

export const canInteractWithDocker = (status: DockerStatus): boolean =>
  status.status === 'running';

export const getDockerStatusMessage = (status: DockerStatus): string => {
  switch (status.status) {
    case 'running':
      return 'Docker is running correctly';
    case 'stopped':
      return 'Docker daemon is not running';
    case 'error':
      return status.error || 'Unknown Docker error';
    case 'connecting':
      return 'Connecting to Docker...';
    default:
      return 'Unknown status';
  }
};

export const getDockerDisplayInfo = (status: DockerStatus): string => {
  if (status.status === 'running' && status.containers) {
    return `${status.containers.running}/${status.containers.total} databases running`;
  }
  return getDockerStatusMessage(status);
};

export const dockerStatusFromJSON = (data: any): DockerStatus => ({
  status: data.status,
  version: data.version,
  host: data.host,
  containers: data.containers,
  images: data.images,
  uptime: data.uptime,
  error: data.error,
});
