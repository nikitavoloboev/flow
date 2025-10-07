import { invoke } from '@tauri-apps/api/core';
import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../../../features/app/use-app';
import type { Container } from '../../../shared/types/container';

/**
 * Main hook for MainPage
 * Handles:
 * - Tauri event listeners (container-created, container-updated)
 * - Dialog state (config, delete)
 * - Navigation to creation/edit windows
 * - Container actions (start, stop, delete)
 */
export function useMainPage() {
  const app = useApp();

  // Dialog state
  const [configPanelOpen, setConfigPanelOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState<Container | null>(
    null,
  );
  const [containerToDelete, setContainerToDelete] = useState<Container | null>(
    null,
  );

  /**
   * Setup Tauri event listeners
   */
  useEffect(() => {
    let unlistenContainerCreated: (() => void) | undefined;
    let unlistenContainerUpdated: (() => void) | undefined;

    const setupListeners = async () => {
      try {
        const { listen } = await import('@tauri-apps/api/event');

        unlistenContainerCreated = await listen('container-created', () => {
          app.loadContainers();
        });

        unlistenContainerUpdated = await listen('container-updated', () => {
          app.loadContainers();
        });
      } catch (error) {
        console.error('Error setting up container listeners:', error);
      }
    };

    setupListeners();

    return () => {
      unlistenContainerCreated?.();
      unlistenContainerUpdated?.();
    };
  }, [app.loadContainers]);

  /**
   * Open container creation window
   */
  const openCreateWindow = useCallback(async () => {
    try {
      await invoke('open_container_creation_window');
    } catch (error) {
      console.error('Failed to open container creation window:', error);
    }
  }, []);

  /**
   * Open container edit window
   */
  const openEditWindow = useCallback(async (containerId: string) => {
    try {
      await invoke('open_container_edit_window', { containerId });
    } catch (error) {
      console.error('Failed to open container edit window:', error);
    }
  }, []);

  /**
   * Toggle container status (start/stop)
   */
  const handleStatusToggle = useCallback(
    async (containerId: string) => {
      const container = app.containers.find((c) => c.id === containerId);
      if (!container) return;

      try {
        if (container.status === 'running') {
          await app.stopContainer(containerId);
        } else {
          await app.startContainer(containerId);
        }
      } catch (error) {
        console.error('Failed to toggle container status:', error);
      }
    },
    [app],
  );

  /**
   * Open deletion confirmation dialog
   */
  const handleDelete = useCallback((container: Container) => {
    setContainerToDelete(container);
    setDeleteDialogOpen(true);
  }, []);

  /**
   * Confirm container deletion
   */
  const handleConfirmDelete = useCallback(async () => {
    if (!containerToDelete) return;

    try {
      await app.removeContainer(containerToDelete.id);
      setDeleteDialogOpen(false);
      setContainerToDelete(null);
    } catch (error) {
      console.error('Failed to delete container:', error);
    }
  }, [containerToDelete, app.removeContainer]);

  /**
   * Cancel container deletion
   */
  const handleCancelDelete = useCallback(() => {
    setDeleteDialogOpen(false);
    setContainerToDelete(null);
  }, []);

  /**
   * Open configuration panel
   */
  const openConfigPanel = useCallback((container: Container) => {
    setSelectedContainer(container);
    setConfigPanelOpen(true);
  }, []);

  /**
   * Close configuration panel
   */
  const closeConfigPanel = useCallback(() => {
    setConfigPanelOpen(false);
    setSelectedContainer(null);
  }, []);

  return {
    // App state
    containers: app.containers,
    containersLoading: app.containersLoading,
    dockerStatus: app.dockerStatus,
    dockerRefreshing: app.dockerRefreshing,
    isDockerAvailable: app.isDockerAvailable,
    showDockerOverlay: app.showDockerOverlay,

    // App actions
    refreshDockerStatus: app.refreshDockerStatus,
    updateContainer: app.updateContainer,

    // Window navigation
    openCreateWindow,
    openEditWindow,

    // Container actions
    handleStatusToggle,
    handleDelete,
    handleConfirmDelete,
    handleCancelDelete,

    // Config panel
    configPanelOpen,
    selectedContainer,
    openConfigPanel,
    closeConfigPanel,
    setConfigPanelOpen,

    // Delete dialog
    deleteDialogOpen,
    containerToDelete,
  };
}
