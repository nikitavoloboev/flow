import { useCallback, useEffect } from 'react';
import type {
  CreateContainerRequest,
  UpdateContainerRequest,
} from '../../shared/types/container';
import { useContainerActions } from '../containers/hooks/use-container-actions';
import { useContainerList } from '../containers/hooks/use-container-list';
import { useDockerStatus } from '../docker/hooks/use-docker-status';

/**
 * Main orchestration hook
 * Combines containers + docker status and coordinates their interactions
 *
 * This hook replaces the old useApp, but with clearer responsibilities
 */
export function useApp() {
  // Container state and actions
  const containerList = useContainerList();
  const containerActions = useContainerActions();

  // Docker status
  const docker = useDockerStatus();

  /**
   * Initial container loading
   */
  useEffect(() => {
    if (docker.isDockerAvailable) {
      containerList.load();
    }
  }, [docker.isDockerAvailable]);

  /**
   * Toggle container status (start/stop)
   */
  const toggleContainerStatus = useCallback(
    async (containerId: string) => {
      const container = containerList.containers.find(
        (c) => c.id === containerId,
      );
      if (!container) return;

      if (container.status === 'running') {
        await containerActions.stop(containerId);
      } else {
        await containerActions.start(containerId);
      }

      // Synchronize after status change
      await containerList.sync();
    },
    [containerList, containerActions],
  );

  /**
   * Create container and update list
   */
  const createContainer = useCallback(
    async (request: CreateContainerRequest) => {
      const newContainer = await containerActions.create(request);
      containerList.addLocal(newContainer);
      return newContainer;
    },
    [containerActions, containerList],
  );

  /**
   * Update container and synchronize list
   */
  const updateContainer = useCallback(
    async (request: UpdateContainerRequest) => {
      const updatedContainer = await containerActions.update(request);
      containerList.updateLocal(updatedContainer);
      return updatedContainer;
    },
    [containerActions, containerList],
  );

  /**
   * Remove container and update list
   */
  const removeContainer = useCallback(
    async (containerId: string) => {
      await containerActions.remove(containerId);
      containerList.removeLocal(containerId);
    },
    [containerActions, containerList],
  );

  return {
    // Container state
    containers: containerList.containers,
    containersLoading: containerList.loading,

    // Container actions
    createContainer,
    updateContainer,
    removeContainer,
    startContainer: containerActions.start,
    stopContainer: containerActions.stop,
    toggleContainerStatus,
    loadContainers: containerList.load,
    syncContainers: containerList.sync,

    // Docker status
    dockerStatus: docker.dockerStatus,
    dockerRefreshing: docker.isRefreshing,
    refreshDockerStatus: docker.refreshStatus,
    isDockerAvailable: docker.isDockerAvailable,
    showDockerOverlay: docker.shouldShowOverlay,
  };
}
