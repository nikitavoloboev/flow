import { useCallback, useEffect, useRef, useState } from 'react';
import { handleContainerError } from '../../../core/errors/error-handler';
import type { Container } from '../../../shared/types/container';
import { containersApi } from '../api/containers.api';

/**
 * Hook to manage the list of containers
 * Responsibility: State and periodic synchronization
 */
export function useContainerList() {
  const [containers, setContainers] = useState<Container[]>([]);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Load the complete list of containers
   */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await containersApi.getAll();
      setContainers(data);
    } catch (error) {
      handleContainerError(error);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Synchronize containers with Docker
   */
  const sync = useCallback(async () => {
    try {
      const data = await containersApi.sync();
      setContainers(data);
    } catch (error) {
      console.error('Error syncing containers:', error);
    }
  }, []);

  /**
   * Update a container in the local list
   */
  const updateLocal = useCallback((updatedContainer: Container) => {
    setContainers((prev) =>
      prev.map((c) => (c.id === updatedContainer.id ? updatedContainer : c)),
    );
  }, []);

  /**
   * Remove a container from the local list
   */
  const removeLocal = useCallback((containerId: string) => {
    setContainers((prev) => prev.filter((c) => c.id !== containerId));
  }, []);

  /**
   * Add a container to the local list
   */
  const addLocal = useCallback((newContainer: Container) => {
    setContainers((prev) => [...prev, newContainer]);
  }, []);

  /**
   * Start periodic synchronization (every 5 seconds)
   */
  const startSync = useCallback(() => {
    if (intervalRef.current) return;

    intervalRef.current = setInterval(() => {
      sync();
    }, 5000);
  }, [sync]);

  /**
   * Stop periodic synchronization
   */
  const stopSync = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Auto-start sync on mount
  useEffect(() => {
    startSync();
    return () => stopSync();
  }, [startSync, stopSync]);

  return {
    containers,
    loading,
    load,
    sync,
    updateLocal,
    removeLocal,
    addLocal,
    startSync,
    stopSync,
  };
}
