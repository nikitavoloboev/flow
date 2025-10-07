import { useMemo, useState } from 'react';
import type { Container } from '../../../shared/types/container';

/**
 * Hook for container search/filtering
 */
export function useContainerSearch(containers: Container[]) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredContainers = useMemo(() => {
    if (!searchQuery.trim()) {
      return containers;
    }

    const query = searchQuery.toLowerCase();
    return containers.filter(
      (container) =>
        container.name.toLowerCase().includes(query) ||
        container.dbType.toLowerCase().includes(query),
    );
  }, [containers, searchQuery]);

  return {
    searchQuery,
    setSearchQuery,
    filteredContainers,
    hasActiveSearch: searchQuery.trim().length > 0,
  };
}
