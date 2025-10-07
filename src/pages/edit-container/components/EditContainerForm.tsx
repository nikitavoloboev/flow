import { Copy, Loader2, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { ContainerService } from '../../../features/containers/services/container.service';
import { Badge } from '../../../shared/components/ui/badge';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import { Label } from '../../../shared/components/ui/label';
import { useContainerEdit } from '../hooks/use-container-edit';

interface EditContainerFormProps {
  containerId: string;
}

/**
 * Presentation component for editing container
 * Responsibility: Only rendering and UI events
 */
export function EditContainerForm({ containerId }: EditContainerFormProps) {
  const { container, loading, saving, form, save, cancel } =
    useContainerEdit(containerId);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = form;

  const handleCopyConnectionString = async () => {
    if (!container) return;

    const connectionString = ContainerService.getConnectionString(container);

    try {
      await navigator.clipboard.writeText(connectionString);
      toast.success('Connection string copied to clipboard');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast.error('Error copying connection string');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!container) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Database not found</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{container.name}</h1>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline">{container.dbType}</Badge>
              <Badge
                variant={
                  container.status === 'running' ? 'default' : 'secondary'
                }
              >
                {container.status}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <form onSubmit={handleSubmit(save)} className="space-y-6 max-w-2xl">
          {/* Container Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Database Name</Label>
              <Input
                id="name"
                {...register('name')}
                disabled={saving}
                className="mt-1"
              />
              {errors.name && (
                <p className="text-sm text-destructive mt-1">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="port">Port</Label>
              <Input
                id="port"
                type="number"
                {...register('port', { valueAsNumber: true })}
                disabled={saving}
                className="mt-1"
              />
              {errors.port && (
                <p className="text-sm text-destructive mt-1">
                  {errors.port.message}
                </p>
              )}
            </div>
          </div>

          {/* Database Credentials */}
          {container.dbType !== 'Redis' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Database Credentials</h3>

              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  {...register('username')}
                  disabled={saving}
                  className="mt-1"
                />
                {errors.username && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.username.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="password">New Password (optional)</Label>
                <Input
                  id="password"
                  type="password"
                  {...register('password')}
                  disabled={saving}
                  placeholder="Leave empty to keep current"
                  className="mt-1"
                />
                {errors.password && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.password.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Will only be updated if you provide a new password
                </p>
              </div>

              <div>
                <Label htmlFor="databaseName">Database Name</Label>
                <Input
                  id="databaseName"
                  {...register('databaseName')}
                  disabled={saving}
                  className="mt-1"
                />
                {errors.databaseName && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.databaseName.message}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Connection String */}
          <div className="space-y-2">
            <Label>Connection String</Label>
            <div className="flex gap-2">
              <Input
                value={ContainerService.getConnectionString(container)}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleCopyConnectionString}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 px-6 py-4 border-t border-border bg-background">
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={cancel}
            disabled={saving}
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit(save)}
            disabled={saving || !isDirty}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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
    </div>
  );
}
