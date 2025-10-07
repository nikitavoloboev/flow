import {
  AlertTriangle,
  CheckCircle,
  Copy,
  Database,
  Eye,
  EyeOff,
  Network,
  RotateCcw,
  Save,
  Settings,
  Shield,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Container, UpdateContainerRequest } from '../types/container';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Switch } from './ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface DatabaseConfigPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  container: Container | null;
  onContainerUpdate: (command: UpdateContainerRequest) => Promise<void>;
}

const databaseIcons = {
  PostgreSQL: '🐘',
  MySQL: '🐬',
  Redis: '🔴',
  MongoDB: '🍃',
};

export function DatabaseConfigPanel({
  open,
  onOpenChange,
  container,
  onContainerUpdate,
}: DatabaseConfigPanelProps) {
  const [config, setConfig] = useState({
    name: '',
    port: '',
    username: '',
    password: '',
    databaseName: '',
    version: '',
    maxConnections: '',
    enableAuth: true,
    persistData: true,
    autoStart: false,
    restartPolicy: 'unless-stopped',
  });

  const [originalConfig, setOriginalConfig] = useState(config);
  const [showPassword, setShowPassword] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Initialize config when container changes
  useEffect(() => {
    if (container) {
      const initialConfig = {
        name: container.name || '',
        port: container.port?.toString() || '',
        username: container.username || getDefaultUsername(container.dbType),
        password: container.password || '',
        databaseName:
          container.databaseName || getDefaultDatabaseName(container.dbType),
        version: container.version || '',
        maxConnections: container.maxConnections?.toString() || '',
        enableAuth: container.enableAuth ?? true,
        persistData: container.persistData ?? true,
        autoStart: false,
        restartPolicy: 'unless-stopped',
      };
      setConfig(initialConfig);
      setOriginalConfig(initialConfig);
      setHasChanges(false);
      setValidationErrors({});
      setSaveSuccess(false);
    }
  }, [container]);

  // Track changes
  useEffect(() => {
    const changed = JSON.stringify(config) !== JSON.stringify(originalConfig);
    setHasChanges(changed);
    if (changed) {
      setSaveSuccess(false);
    }
  }, [config, originalConfig]);

  const getDefaultUsername = (dbType: string) => {
    switch (dbType) {
      case 'PostgreSQL':
        return 'postgres';
      case 'MySQL':
        return 'root';
      case 'MongoDB':
        return 'admin';
      case 'Redis':
        return '';
      default:
        return '';
    }
  };

  const getDefaultDatabaseName = (dbType: string) => {
    switch (dbType) {
      case 'PostgreSQL':
        return 'postgres';
      case 'MySQL':
        return 'mysql';
      case 'MongoDB':
        return 'admin';
      case 'Redis':
        return '';
      default:
        return '';
    }
  };

  const validateConfig = () => {
    const errors: Record<string, string> = {};

    // Validate container name
    if (!config.name.trim()) {
      errors.name = 'Container name is required';
    } else if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(config.name)) {
      errors.name = 'Invalid container name format';
    }

    // Validate port
    const port = Number.parseInt(config.port);
    if (!config.port) {
      errors.port = 'Port is required';
    } else if (Number.isNaN(port) || port < 1 || port > 65535) {
      errors.port = 'Port must be between 1 and 65535';
    } else if (port < 1024 && port !== container?.port) {
      errors.port = 'Ports below 1024 require elevated privileges';
    }

    // Validate max connections
    if (config.maxConnections) {
      const maxConn = Number.parseInt(config.maxConnections);
      if (Number.isNaN(maxConn) || maxConn < 1) {
        errors.maxConnections = 'Max connections must be a positive number';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateConfig() || !container) {
      return;
    }

    setIsSaving(true);

    try {
      const command: UpdateContainerRequest = {
        containerId: container.id,
        name: config.name !== originalConfig.name ? config.name : undefined,
        port:
          config.port !== originalConfig.port
            ? Number.parseInt(config.port)
            : undefined,
        username:
          config.username !== originalConfig.username
            ? config.username
            : undefined,
        password:
          config.password !== originalConfig.password
            ? config.password
            : undefined,
        databaseName:
          config.databaseName !== originalConfig.databaseName
            ? config.databaseName
            : undefined,
        maxConnections:
          config.maxConnections !== originalConfig.maxConnections
            ? Number.parseInt(config.maxConnections)
            : undefined,
        enableAuth:
          config.enableAuth !== originalConfig.enableAuth
            ? config.enableAuth
            : undefined,
        persistData:
          config.persistData !== originalConfig.persistData
            ? config.persistData
            : undefined,
        restartPolicy:
          config.restartPolicy !== originalConfig.restartPolicy
            ? config.restartPolicy
            : undefined,
        autoStart:
          config.autoStart !== originalConfig.autoStart
            ? config.autoStart
            : undefined,
      };

      await onContainerUpdate(command);
      setOriginalConfig(config);
      setHasChanges(false);
      setSaveSuccess(true);

      // Hide success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save configuration:', error);
      setValidationErrors({ general: `Error: ${error}` });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setConfig(originalConfig);
    setValidationErrors({});
    setSaveSuccess(false);
  };

  const copyConnectionString = async () => {
    let connectionString = '';
    const host = 'localhost';
    const port = config.port;

    switch (container?.dbType) {
      case 'PostgreSQL':
        connectionString = `postgresql://${config.username}:${config.password}@${host}:${port}/${config.databaseName}`;
        break;
      case 'MySQL':
        connectionString = `mysql://${config.username}:${config.password}@${host}:${port}/${config.databaseName}`;
        break;
      case 'MongoDB':
        connectionString = `mongodb://${config.username}:${config.password}@${host}:${port}/${config.databaseName}`;
        break;
      case 'Redis':
        connectionString = `redis://${config.password ? `:${config.password}@` : ''}${host}:${port}`;
        break;
    }

    try {
      await navigator.clipboard.writeText(connectionString);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const generatePassword = () => {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let result = '';
    for (let i = 0; i < 16; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setConfig({ ...config, password: result });
  };

  if (!container) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] h-full flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-lg">
              {databaseIcons[container.dbType as keyof typeof databaseIcons] ||
                '💾'}
            </div>
            <div>
              <span className="text-xl">Database Configuration</span>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant={
                    container.status === 'running' ? 'default' : 'secondary'
                  }
                  className={
                    container.status === 'running'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                  }
                >
                  {container.status}
                </Badge>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {container.dbType} {container.version}
                </span>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Success/Error Alerts */}
        {saveSuccess && (
          <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              Configuration saved successfully!
            </AlertDescription>
          </Alert>
        )}

        {Object.keys(validationErrors).length > 0 && (
          <Alert className="bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800 dark:text-red-200">
              {validationErrors.general ||
                'Please fix the validation errors before saving.'}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="general" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
              <TabsTrigger value="general" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                General
              </TabsTrigger>
              <TabsTrigger
                value="connection"
                className="flex items-center gap-2"
              >
                <Network className="w-4 h-4" />
                Connection
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Security
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-4">
              <TabsContent value="general" className="space-y-6 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      Basic Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="containerName">Database Name</Label>
                        <Input
                          id="containerName"
                          value={config.name}
                          onChange={(e) =>
                            setConfig({ ...config, name: e.target.value })
                          }
                          className={
                            validationErrors.name ? 'border-red-500' : ''
                          }
                        />
                        {validationErrors.name && (
                          <p className="text-sm text-red-600">
                            {validationErrors.name}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="version">Version</Label>
                        <Input
                          id="version"
                          value={config.version}
                          disabled
                          className="bg-gray-50 dark:bg-gray-800"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="dbType">Database Type</Label>
                        <Input
                          id="dbType"
                          value={container.dbType}
                          disabled
                          className="bg-gray-50 dark:bg-gray-800"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="createdAt">Created</Label>
                        <Input
                          id="createdAt"
                          value={container.createdAt.toLocaleDateString()}
                          disabled
                          className="bg-gray-50 dark:bg-gray-800"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="restartPolicy">Restart Policy</Label>
                      <Select
                        value={config.restartPolicy}
                        onValueChange={(value) =>
                          setConfig({ ...config, restartPolicy: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no">No</SelectItem>
                          <SelectItem value="always">Always</SelectItem>
                          <SelectItem value="unless-stopped">
                            Unless Stopped
                          </SelectItem>
                          <SelectItem value="on-failure">On Failure</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div>
                        <Label className="font-medium">
                          Auto-start on boot
                        </Label>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Start container automatically when system boots
                        </p>
                      </div>
                      <Switch
                        checked={config.autoStart}
                        onCheckedChange={(checked) =>
                          setConfig({ ...config, autoStart: checked })
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="connection" className="space-y-6 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Network className="w-4 h-4" />
                      Connection Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="port">Port</Label>
                        <Input
                          id="port"
                          type="number"
                          value={config.port}
                          onChange={(e) =>
                            setConfig({ ...config, port: e.target.value })
                          }
                          className={
                            validationErrors.port ? 'border-red-500' : ''
                          }
                        />
                        {validationErrors.port && (
                          <p className="text-sm text-red-600">
                            {validationErrors.port}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="maxConnections">Max Connections</Label>
                        <Input
                          id="maxConnections"
                          type="number"
                          value={config.maxConnections}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              maxConnections: e.target.value,
                            })
                          }
                          className={
                            validationErrors.maxConnections
                              ? 'border-red-500'
                              : ''
                          }
                        />
                        {validationErrors.maxConnections && (
                          <p className="text-sm text-red-600">
                            {validationErrors.maxConnections}
                          </p>
                        )}
                      </div>
                    </div>

                    {container.dbType !== 'Redis' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="username">Username</Label>
                          <Input
                            id="username"
                            value={config.username}
                            onChange={(e) =>
                              setConfig({ ...config, username: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="databaseName">Database Name</Label>
                          <Input
                            id="databaseName"
                            value={config.databaseName}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                databaseName: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                    )}

                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="font-medium text-blue-900 dark:text-blue-100">
                          Connection String
                        </Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={copyConnectionString}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                      <code className="text-sm text-blue-800 dark:text-blue-200 break-all">
                        {container.dbType === 'PostgreSQL' &&
                          `postgresql://${config.username}:••••••••@localhost:${config.port}/${config.name}`}
                        {container.dbType === 'MySQL' &&
                          `mysql://${config.username}:••••••••@localhost:${config.port}/${config.name}`}
                        {container.dbType === 'MongoDB' &&
                          `mongodb://${config.username}:••••••••@localhost:${config.port}/${config.name}`}
                        {container.dbType === 'Redis' &&
                          `redis://:••••••••@localhost:${config.port}`}
                      </code>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="security" className="space-y-6 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Security Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div>
                        <Label className="font-medium">
                          Enable Authentication
                        </Label>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Require password for database connections
                        </p>
                      </div>
                      <Switch
                        checked={config.enableAuth}
                        onCheckedChange={(checked) =>
                          setConfig({ ...config, enableAuth: checked })
                        }
                      />
                    </div>

                    {config.enableAuth && (
                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Input
                              id="password"
                              type={showPassword ? 'text' : 'password'}
                              value={config.password}
                              onChange={(e) =>
                                setConfig({
                                  ...config,
                                  password: e.target.value,
                                })
                              }
                              className="pr-10"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                            >
                              {showPassword ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                          <Button variant="outline" onClick={generatePassword}>
                            Generate
                          </Button>
                        </div>
                        {validationErrors.password && (
                          <p className="text-sm text-red-600">
                            {validationErrors.password}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div>
                        <Label className="font-medium">Persist Data</Label>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Keep data when container is removed
                        </p>
                      </div>
                      <Switch
                        checked={config.persistData}
                        onCheckedChange={(checked) =>
                          setConfig({ ...config, persistData: checked })
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-2">
            {hasChanges && (
              <Badge
                variant="secondary"
                className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
              >
                Unsaved changes
              </Badge>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {hasChanges && (
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={
                !hasChanges ||
                Object.keys(validationErrors).length > 0 ||
                isSaving
              }
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
