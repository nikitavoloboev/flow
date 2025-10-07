import { check } from '@tauri-apps/plugin-updater';
import { useState } from 'react';
import { toast } from 'sonner';

/**
 * Hook to manage app updates
 */
export function useAppUpdater() {
  const [checking, setChecking] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateVersion, setUpdateVersion] = useState<string>('');

  const checkForUpdates = async () => {
    if (checking || downloading) return;

    setChecking(true);
    try {
      const update = await check();

      if (update?.available) {
        setUpdateAvailable(true);
        setUpdateVersion(update.version);

        toast.success(`Update available: v${update.version}`, {
          description: 'Click to download and install',
          action: {
            label: 'Install',
            onClick: () => downloadAndInstall(update),
          },
          duration: 10000,
        });
      } else {
        toast.success('You are using the latest version');
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
      toast.error('Failed to check for updates', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setChecking(false);
    }
  };

  const downloadAndInstall = async (update: any) => {
    if (downloading) return;

    setDownloading(true);
    const toastId = toast.loading('Downloading update...', {
      description: 'Please wait while the update is being downloaded',
    });

    try {
      let downloaded = 0;
      let contentLength = 0;

      await update.downloadAndInstall((event: any) => {
        switch (event.event) {
          case 'Started':
            contentLength = event.data.contentLength || 0;
            toast.loading('Downloading update...', {
              id: toastId,
              description: `Starting download (${(contentLength / 1024 / 1024).toFixed(2)} MB)`,
            });
            break;
          case 'Progress':
            downloaded += event.data.chunkLength;
            const progress =
              contentLength > 0
                ? Math.round((downloaded / contentLength) * 100)
                : 0;
            toast.loading(`Downloading update... ${progress}%`, {
              id: toastId,
              description: `${(downloaded / 1024 / 1024).toFixed(2)} MB / ${(contentLength / 1024 / 1024).toFixed(2)} MB`,
            });
            break;
          case 'Finished':
            toast.success('Update installed successfully', {
              id: toastId,
              description: 'Please restart the application to apply the update',
            });
            break;
        }
      });
    } catch (error) {
      console.error('Failed to download update:', error);
      toast.error('Failed to download update', {
        id: toastId,
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setDownloading(false);
    }
  };

  return {
    checking,
    downloading,
    updateAvailable,
    updateVersion,
    checkForUpdates,
  };
}
