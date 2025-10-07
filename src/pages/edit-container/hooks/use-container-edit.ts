import { zodResolver } from '@hookform/resolvers/zod';
import { emit } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useContainerActions } from '../../../features/containers/hooks/use-container-actions';
import type {
  Container,
  UpdateContainerRequest,
} from '../../../shared/types/container';

const editContainerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  port: z
    .number()
    .min(1, 'Port must be greater than 0')
    .max(65535, 'Port must be less than 65535'),
  username: z.string().optional(),
  password: z.string().optional(),
  databaseName: z.string().optional(),
});

type EditContainerFormData = z.infer<typeof editContainerSchema>;

/**
 * Hook to manage container editing
 * Responsibility: Loading, updating and submission logic
 */
export function useContainerEdit(containerId: string) {
  const [container, setContainer] = useState<Container | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { getById, update } = useContainerActions();

  // Form setup
  const form = useForm<EditContainerFormData>({
    resolver: zodResolver(editContainerSchema),
    defaultValues: {
      name: '',
      port: 5432,
      username: '',
      password: '',
      databaseName: '',
    },
  });

  const { reset } = form;

  /**
   * Load container by ID
   */
  const loadContainer = useCallback(async () => {
    setLoading(true);
    try {
      const loadedContainer = await getById(containerId);
      setContainer(loadedContainer);

      // Update form with container data
      reset({
        name: loadedContainer.name,
        port: loadedContainer.port,
        username: loadedContainer.username || '',
        password: loadedContainer.password || '',
        databaseName: loadedContainer.databaseName || '',
      });
    } catch (error) {
      console.error('Error loading container:', error);
    } finally {
      setLoading(false);
    }
  }, [containerId, getById, reset]);

  /**
   * Initial load
   */
  useEffect(() => {
    loadContainer();
  }, [loadContainer]);

  /**
   * Cancel and close window
   */
  const cancel = useCallback(async () => {
    try {
      const currentWindow = getCurrentWindow();
      await currentWindow.close();
    } catch (error) {
      console.error('Error closing window:', error);
    }
  }, []);

  /**
   * Save changes and close window
   */
  const save = useCallback(
    async (data: EditContainerFormData) => {
      if (!container) return;

      setSaving(true);
      try {
        const updateRequest: UpdateContainerRequest = {
          containerId: container.id,
          name: data.name,
          port: data.port,
          username: data.username,
          password: data.password,
          databaseName: data.databaseName,
        };

        const updatedContainer = await update(updateRequest);

        // Emit event to notify main window
        try {
          await emit('container-updated', { container: updatedContainer });
        } catch (eventError) {
          console.warn('Error emitting event:', eventError);
        }

        // Close window
        const currentWindow = getCurrentWindow();
        await currentWindow.close();
      } catch (error) {
        console.error('Error updating container:', error);
      } finally {
        setSaving(false);
      }
    },
    [container, update],
  );

  return {
    container,
    loading,
    saving,
    form,
    save,
    cancel,
  };
}
