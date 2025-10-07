import { Toaster } from 'sonner';
import { DatabaseConfigPanel } from '../../shared/components/DatabaseConfigPanel';
import { DeleteConfirmationDialog } from '../../shared/components/DeleteConfirmationDialog';
import { DockerUnavailableOverlay } from '../../shared/components/DockerUnavailableOverlay';
import { DatabaseManager } from './components/DatabaseManager';
import { useContainerSearch } from './hooks/use-container-search';
import { useContainerStats } from './hooks/use-container-stats';
import { useMainPage } from './hooks/use-main-page';

export function MainPage() {
  const page = useMainPage();
  const search = useContainerSearch(page.containers);
  const stats = useContainerStats(page.containers);

  return (
    <div className="h-screen w-full bg-background">
      <DatabaseManager
        containers={search.filteredContainers}
        stats={stats}
        searchQuery={search.searchQuery}
        onSearchChange={search.setSearchQuery}
        hasActiveSearch={search.hasActiveSearch}
        loading={page.containersLoading}
        onStatusToggle={page.handleStatusToggle}
        onDelete={page.handleDelete}
        onCreateContainer={page.openCreateWindow}
        onEditContainer={page.openEditWindow}
        disabled={page.containersLoading || !page.isDockerAvailable}
      />

      <DatabaseConfigPanel
        open={page.configPanelOpen}
        onOpenChange={page.setConfigPanelOpen}
        container={page.selectedContainer}
        onContainerUpdate={async (command) => {
          await page.updateContainer(command);
        }}
      />

      <DeleteConfirmationDialog
        open={page.deleteDialogOpen}
        container={page.containerToDelete}
        onConfirm={page.handleConfirmDelete}
        onCancel={page.handleCancelDelete}
        loading={page.containersLoading}
      />

      {page.showDockerOverlay && (
        <DockerUnavailableOverlay
          status={
            page.dockerStatus?.status === 'running'
              ? 'connecting'
              : page.dockerStatus?.status || 'error'
          }
          error={page.dockerStatus?.error}
          onRetry={page.refreshDockerStatus}
          isRetrying={page.dockerRefreshing}
        />
      )}

      <Toaster
        position="bottom-right"
        richColors
        theme={'dark'}
        visibleToasts={3}
      />
    </div>
  );
}
