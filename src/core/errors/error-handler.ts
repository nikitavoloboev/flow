import { toast } from 'sonner';

export interface AppError {
  type:
    | 'PORT_IN_USE'
    | 'NAME_IN_USE'
    | 'DOCKER_ERROR'
    | 'VALIDATION_ERROR'
    | 'UNKNOWN';
  message: string;
  details?: string;
}

/**
 * Parse Tauri errors (which come as JSON strings)
 */
export function parseError(error: unknown): AppError {
  if (typeof error === 'string') {
    try {
      const parsed = JSON.parse(error);
      return {
        type: parsed.error_type || 'UNKNOWN',
        message: parsed.message || error,
        details: parsed.details,
      };
    } catch {
      return {
        type: 'UNKNOWN',
        message: error,
      };
    }
  }

  if (error instanceof Error) {
    return {
      type: 'UNKNOWN',
      message: error.message,
    };
  }

  return {
    type: 'UNKNOWN',
    message: 'Unknown error',
  };
}

/**
 * Show an error toast based on type
 */
export function showErrorToast(error: unknown): void {
  const appError = parseError(error);

  const errorMessages: Record<AppError['type'], string> = {
    PORT_IN_USE: 'Port already in use',
    NAME_IN_USE: 'A container with that name already exists',
    DOCKER_ERROR: 'Docker error',
    VALIDATION_ERROR: 'Validation error',
    UNKNOWN: 'Unexpected error',
  };

  toast.error(errorMessages[appError.type], {
    description: appError.message,
  });
}

/**
 * Centralized error handling for container operations
 */
export function handleContainerError(error: unknown): never {
  const appError = parseError(error);
  showErrorToast(error);
  throw appError;
}
