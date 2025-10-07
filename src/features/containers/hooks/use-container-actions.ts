import { useCallback } from 'react';
import { toast } from 'sonner';
import { handleContainerError } from '../../../core/errors/error-handler';
import type {
  Container,
  CreateContainerRequest,
  UpdateContainerRequest,
} from '../../../shared/types/container';
import { containersApi } from '../api/containers.api';

/**
 * Hook for container actions (CRUD)
 * Responsibility: Individual operations without global state management
 */
export function useContainerActions() {
  /**
   * Create a new container
   */
  const create = useCallback(
    async (request: CreateContainerRequest): Promise<Container> => {
      try {
        const container = await containersApi.create(request);
        toast.success('Database created', {
          description: `${container.name} has been created successfully`,
        });
        return container;
      } catch (error) {
        handleContainerError(error);
      }
    },
    [],
  );

  /**
   * Update an existing container
   */
  const update = useCallback(
    async (request: UpdateContainerRequest): Promise<Container> => {
      try {
        const container = await containersApi.update(request);
        toast.success('Database updated', {
          description: `${container.name} has been updated`,
        });
        return container;
      } catch (error) {
        handleContainerError(error);
      }
    },
    [],
  );

  /**
   * Start a container
   */
  const start = useCallback(async (containerId: string): Promise<void> => {
    try {
      await containersApi.start(containerId);
      toast.success('Database started');
    } catch (error) {
      handleContainerError(error);
    }
  }, []);

  /**
   * Stop a container
   */
  const stop = useCallback(async (containerId: string): Promise<void> => {
    try {
      await containersApi.stop(containerId);
      toast.success('Database stopped');
    } catch (error) {
      handleContainerError(error);
    }
  }, []);

  /**
   * Remove a container
   */
  const remove = useCallback(async (containerId: string): Promise<void> => {
    try {
      await containersApi.remove(containerId);
      toast.success('Database removed');
    } catch (error) {
      handleContainerError(error);
    }
  }, []);

  /**
   * Get a container by ID
   */
  const getById = useCallback(
    async (containerId: string): Promise<Container> => {
      try {
        return await containersApi.getById(containerId);
      } catch (error) {
        handleContainerError(error);
      }
    },
    [],
  );

  return {
    create,
    update,
    start,
    stop,
    remove,
    getById,
  };
}
