import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { DockerStatus } from '../../../shared/types/docker';
import { canInteractWithDocker } from '../../../shared/utils/docker';
import { dockerApi } from '../api/docker.api';

/**
 * Hook to manage Docker status
 * Responsibility: Polling Docker daemon status
 */
export function useDockerStatus() {
  const [dockerStatus, setDockerStatus] = useState<DockerStatus | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [shouldShowOverlay, setShouldShowOverlay] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Check Docker status
   */
  const checkDockerStatus = useCallback(async (showNotifications = false) => {
    try {
      const status = await dockerApi.getStatus();

      console.log(status);

      setDockerStatus(status);

      // Show overlay if Docker is not available
      if (!canInteractWithDocker(status)) {
        setShouldShowOverlay(true);
      } else {
        setShouldShowOverlay(false);
        if (showNotifications) {
          toast.success('Docker is available');
        }
      }
    } catch (error) {
      console.error('Error checking Docker status:', error);
      setDockerStatus({
        status: 'error',
        error: 'Could not connect to Docker',
      });
      setShouldShowOverlay(true);

      // Retry after 10 seconds
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      retryTimeoutRef.current = setTimeout(() => {
        checkDockerStatus();
      }, 10000);
    }
  }, []);

  /**
   * Manually refresh status
   */
  const refreshStatus = useCallback(async () => {
    setIsRefreshing(true);
    await checkDockerStatus(true);
    setIsRefreshing(false);
  }, [checkDockerStatus]);

  /**
   * Start periodic check (every 30 seconds)
   */
  const startPeriodicCheck = useCallback(() => {
    if (intervalRef.current) return;

    intervalRef.current = setInterval(() => {
      checkDockerStatus();
    }, 30000);
  }, [checkDockerStatus]);

  /**
   * Stop periodic check
   */
  const stopPeriodicCheck = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  // Initial check and setup
  useEffect(() => {
    checkDockerStatus();
    startPeriodicCheck();

    return () => {
      stopPeriodicCheck();
    };
  }, [checkDockerStatus, startPeriodicCheck, stopPeriodicCheck]);

  // Handle visibility change to pause/resume checking when tab is not active
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPeriodicCheck();
      } else {
        checkDockerStatus();
        startPeriodicCheck();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [checkDockerStatus, startPeriodicCheck, stopPeriodicCheck]);

  return {
    dockerStatus,
    isRefreshing,
    shouldShowOverlay,
    refreshStatus,
    isDockerAvailable: dockerStatus
      ? canInteractWithDocker(dockerStatus)
      : false,
  };
}
