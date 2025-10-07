import { useEffect, useState } from 'react';
import { appApi } from '../api/app.api';

/**
 * Hook to get and manage the app version
 */
export function useAppVersion() {
  const [version, setVersion] = useState<string>('0.0.0');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const appVersion = await appApi.getVersion();
        setVersion(appVersion);
      } catch (error) {
        console.error('Failed to fetch app version:', error);
        // Keep default version on error
      } finally {
        setLoading(false);
      }
    };

    fetchVersion();
  }, []);

  return { version, loading };
}
