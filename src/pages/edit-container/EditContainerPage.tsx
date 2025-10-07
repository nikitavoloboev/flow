import { Toaster } from 'sonner';
import { EditContainerForm } from './components/EditContainerForm';

export function EditContainerPage() {
  // Extract container ID from query parameters
  const containerId = new URLSearchParams(window.location.search).get('id');

  if (!containerId) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive">No database specified for editing</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Titlebar space */}
      <div className="h-6 bg-transparent" />

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <EditContainerForm containerId={containerId} />
      </div>

      <Toaster
        position="bottom-right"
        richColors
        theme={'dark'}
        visibleToasts={3}
      />
    </div>
  );
}
