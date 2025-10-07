import { zodResolver } from '@hookform/resolvers/zod';
import { emit } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useContainerActions } from '../../../features/containers/hooks/use-container-actions';
import { ContainerService } from '../../../features/containers/services/container.service';
import type { CreateContainerRequest } from '../../../shared/types/container';
import {
  type CreateDatabaseFormValidation,
  createDatabaseFormSchema,
} from '../schemas/database-form.schema';
import { FORM_STEPS } from '../types/form-steps';

/**
 * Hook to manage the container creation wizard
 * Responsibility: Wizard logic (steps, validation, submit)
 */
export function useContainerCreationWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const { create } = useContainerActions();

  // Form setup
  const form = useForm<CreateDatabaseFormValidation>({
    resolver: zodResolver(createDatabaseFormSchema),
    defaultValues: {
      databaseSelection: {
        dbType: undefined,
      },
      containerConfiguration: {
        name: '',
        port: 5432,
        version: '',
        username: '',
        password: '',
        databaseName: '',
        persistData: true,
        enableAuth: true,
        maxConnections: undefined,
        postgresSettings: {},
        mysqlSettings: {},
        redisSettings: {},
        mongoSettings: {},
      },
    },
    mode: 'onChange',
  });

  const { handleSubmit, trigger, watch } = form;

  /**
   * Advance to next step if validation is correct
   */
  const nextStep = useCallback(async () => {
    let isValid = false;

    if (currentStep === 1) {
      isValid = await trigger('databaseSelection');
    } else if (currentStep === 2) {
      isValid = await trigger('containerConfiguration');
    }

    if (isValid) {
      if (!completedSteps.includes(currentStep)) {
        setCompletedSteps((prev) => [...prev, currentStep]);
      }
      if (currentStep < FORM_STEPS.length) {
        setCurrentStep((prev) => prev + 1);
      }
    }
  }, [currentStep, completedSteps, trigger]);

  /**
   * Go back to previous step
   */
  const previousStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

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
   * Validate if current step is complete
   */
  const isCurrentStepValid = useCallback(() => {
    switch (currentStep) {
      case 1:
        return Boolean(watch('databaseSelection.dbType'));
      case 2:
        const config = watch('containerConfiguration');
        return !!(config.name && config.port && config.version);
      case 3:
        return true;
      default:
        return true;
    }
  }, [currentStep, watch]);

  /**
   * Transform form data to API format
   */
  const transformFormToRequest = useCallback(
    (data: CreateDatabaseFormValidation): CreateContainerRequest => {
      const { databaseSelection, containerConfiguration } = data;

      return {
        name: containerConfiguration.name,
        dbType: databaseSelection.dbType,
        version: containerConfiguration.version,
        port: containerConfiguration.port!,
        username: containerConfiguration.username,
        password: containerConfiguration.password || '',
        databaseName: containerConfiguration.databaseName,
        persistData: containerConfiguration.persistData ?? true,
        enableAuth: containerConfiguration.enableAuth ?? true,
        maxConnections:
          containerConfiguration.maxConnections ||
          ContainerService.getDefaultPort(databaseSelection.dbType),
        // Include DB-specific settings if they exist
        ...(databaseSelection.dbType === 'PostgreSQL' &&
          containerConfiguration.postgresSettings && {
            postgresSettings: containerConfiguration.postgresSettings,
          }),
        ...(databaseSelection.dbType === 'MySQL' &&
          containerConfiguration.mysqlSettings && {
            mysqlSettings: containerConfiguration.mysqlSettings,
          }),
        ...(databaseSelection.dbType === 'Redis' &&
          containerConfiguration.redisSettings && {
            redisSettings: containerConfiguration.redisSettings,
          }),
        ...(databaseSelection.dbType === 'MongoDB' &&
          containerConfiguration.mongoSettings && {
            mongoSettings: containerConfiguration.mongoSettings,
          }),
      };
    },
    [],
  );

  /**
   * Final submit - create container and close window
   */
  const submit = useCallback(
    async (data: CreateDatabaseFormValidation) => {
      try {
        const request = transformFormToRequest(data);
        const newContainer = await create(request);

        // Mark all steps as completed
        setCompletedSteps([1, 2, 3]);

        // Emit event to notify main window
        try {
          await emit('container-created', { container: newContainer });
        } catch (eventError) {
          console.warn('Error emitting event:', eventError);
        }

        // Close window
        const currentWindow = getCurrentWindow();
        await currentWindow.close();
      } catch (error) {
        // Error is already handled in useContainerActions
        console.error('Error creating container:', error);
      }
    },
    [create, transformFormToRequest],
  );

  return {
    // Form
    form,
    handleSubmit,

    // Steps
    currentStep,
    completedSteps,
    nextStep,
    previousStep,
    isCurrentStepValid: isCurrentStepValid(),

    // Actions
    submit,
    cancel,

    // Computed
    hasSelectedDatabase: Boolean(watch('databaseSelection.dbType')),
    isSubmitting: form.formState.isSubmitting,
  };
}
