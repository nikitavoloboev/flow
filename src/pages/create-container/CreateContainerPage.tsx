import { Toaster } from 'sonner';
import { DatabaseSelectionForm } from './components/DatabaseSelectionForm';

export function CreateContainerPage() {
  return (
    <div className="h-screenflex flex-col">
      {/* Titlebar space */}
      <div className="h-6 bg-transparent" />

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <DatabaseSelectionForm />
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
