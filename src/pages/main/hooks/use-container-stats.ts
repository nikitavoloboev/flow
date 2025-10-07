import { useMemo } from 'react';
import type { Container } from '../../../shared/types/container';

export interface ContainerStats {
  total: number;
  running: number;
  stopped: number;
  errors: number;
}

/**
 * Hook to calculate container statistics
 */
export function useContainerStats(containers: Container[]): ContainerStats {
  return useMemo(() => {
    const running = containers.filter((c) => c.status === 'running').length;
    const errors = containers.filter((c) => c.status === 'error').length;
    const stopped = containers.filter(
      (c) => c.status !== 'running' && c.status !== 'error',
    ).length;

    return {
      total: containers.length,
      running,
      stopped,
      errors,
    };
  }, [containers]);
}
