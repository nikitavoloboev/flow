import {
  Activity,
  Database,
  Download,
  Loader2,
  Play,
  Plus,
  Search,
  Settings,
  Square,
  Trash2,
  Zap,
} from 'lucide-react';
import { useAppVersion } from '../../../features/app/hooks/use-app-version';
import { Badge } from '../../../shared/components/ui/badge';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import { Container } from '../../../shared/types/container';
import type { ContainerStats } from '../hooks/use-container-stats';
import logoImage from '../../../../public/logo.avif';
import { useAppUpdater } from '@/features/app/hooks/use-app-updater';

interface DatabaseManagerProps {
  containers: Container[];
  stats: ContainerStats;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  hasActiveSearch: boolean;
  loading: boolean;
  onStatusToggle: (containerId: string) => void;
  onDelete: (container: Container) => void;
  onCreateContainer: () => void;
  onEditContainer: (containerId: string) => void;
  disabled?: boolean;
}

/**
 * Presentational component for database manager
 * Only handles rendering, all logic comes from props
 */
export function DatabaseManager({
  containers,
  stats,
  searchQuery,
  onSearchChange,
  hasActiveSearch,
  loading,
  onStatusToggle,
  onDelete,
  onCreateContainer,
  onEditContainer,
  disabled = false,
}: DatabaseManagerProps) {
  const { version } = useAppVersion();
  const { checking, downloading, checkForUpdates } = useAppUpdater();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'creating':
      case 'removing':
        return 'bg-muted text-muted-foreground border-border';
      case 'error':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Activity className="w-3 h-3 animate-pulse text-green-500" />;
      case 'creating':
      case 'removing':
        return <Square className="w-3 h-3" />;
      case 'error':
        return <Zap className="w-3 h-3" />;
      default:
        return <Square className="w-3 h-3" />;
    }
  };

  const getDatabaseIcon = (_type: string) => {
    return <Database className="w-6 h-6 text-primary" />;
  };

  return (
    <div className="h-full bg-background flex overflow-hidden">
      {/* Sidebar */}
      <div className="min-w-56 w-56 flex-shrink-0 bg-card border-r border-border flex flex-col">
        {/* Logo Section */}
        <div className="p-6 pt-10 border-b border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center">
              <img
                src={logoImage}
                alt="DockerDB Logo"
                className="w-10 h-10 object-contain rounded-lg"
              />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">DockerDB</h1>
              <p className="text-xs text-muted-foreground">v{version}</p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Running</span>
              <span className="text-green-500 font-medium">
                {stats.running}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Stopped</span>
              <span className="text-muted-foreground font-medium">
                {stats.stopped}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Errors</span>
              <span className="text-destructive font-medium">
                {stats.errors}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 space-y-2">
          <Button
            className="w-full justify-start gap-2"
            onClick={onCreateContainer}
            disabled={disabled}
          >
            <Plus className="w-4 h-4" />
            New Database
          </Button>
          <Button
            className="w-full justify-start gap-2"
            variant="outline"
            onClick={checkForUpdates}
            disabled={disabled || checking || downloading}
          >
            {checking || downloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {checking
              ? 'Checking...'
              : downloading
                ? 'Downloading...'
                : 'Check for Updates'}
          </Button>
        </div>

        <div className="flex-1" />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header with Search */}
        <div className="p-4 border-b border-border bg-card">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search databases..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
              disabled={disabled}
            />
          </div>
        </div>

        {/* Database List */}
        <div className="flex-1 overflow-auto p-4 space-y-1">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">Loading databases...</p>
            </div>
          ) : containers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Database className="w-12 h-12 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">
                {hasActiveSearch
                  ? 'No databases match your search'
                  : 'No databases found'}
              </p>
              {!hasActiveSearch && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={onCreateContainer}
                  disabled={disabled}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create your first database
                </Button>
              )}
            </div>
          ) : (
            containers.map((container) => (
              <div key={container.id} className="relative">
                <div className="group flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-all duration-200">
                  {getDatabaseIcon(container.dbType)}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-foreground truncate">
                        {container.name}
                      </h3>
                      <Badge
                        className={`text-xs px-2 py-0.5 gap-1 ${getStatusColor(container.status)}`}
                      >
                        {getStatusIcon(container.status)}
                        {container.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      localhost:{container.port} • {container.dbType}{' '}
                      {container.version}
                    </p>
                  </div>

                  {/* Action Buttons - always visible */}
                  <div className="flex items-center gap-2">
                    {container.status === 'running' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => onStatusToggle(container.id)}
                        disabled={disabled}
                      >
                        <Square className="w-3 h-3" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => onStatusToggle(container.id)}
                        disabled={disabled}
                      >
                        <Play className="w-3 h-3" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0"
                      onClick={() => onEditContainer(container.id)}
                      disabled={disabled}
                    >
                      <Settings className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => onDelete(container)}
                      disabled={disabled}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
