export interface Settings {
  theme: 'light' | 'dark' | 'system';
  autoStartContainers: boolean;
  showNotifications: boolean;
  refreshInterval: number;
  dockerPath?: string;
}
