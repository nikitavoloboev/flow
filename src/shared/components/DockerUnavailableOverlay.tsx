import {
  AlertTriangle,
  Container,
  ExternalLink,
  RefreshCw,
  Terminal,
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';

interface DockerUnavailableOverlayProps {
  status: 'stopped' | 'error' | 'connecting';
  error?: string;
  onRetry: () => void;
  isRetrying: boolean;
}

export function DockerUnavailableOverlay({
  status,
  error,
  onRetry,
  isRetrying,
}: DockerUnavailableOverlayProps) {
  const getStatusInfo = () => {
    switch (status) {
      case 'connecting':
        return {
          title: 'Connecting to Docker',
          description:
            'Please wait while we establish connection to Docker daemon',
          icon: <RefreshCw className="w-6 h-6 text-primary animate-spin" />,
          showRetry: false,
        };
      case 'stopped':
        return {
          title: 'Docker Not Running',
          description:
            'Docker Desktop needs to be started to manage containers',
          icon: <Container className="w-6 h-6 text-muted-foreground" />,
          showRetry: true,
        };
      default:
        return {
          title: 'Connection Failed',
          description: error || 'Unable to connect to Docker daemon',
          icon: <AlertTriangle className="w-6 h-6 text-destructive" />,
          showRetry: true,
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-sm shadow-lg border-border">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            {/* Icon */}
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted">
              {statusInfo.icon}
            </div>

            {/* Content */}
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">
                {statusInfo.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {statusInfo.description}
              </p>
            </div>

            {/* Actions */}
            <div className="w-full space-y-3 pt-2">
              {statusInfo.showRetry && (
                <Button
                  onClick={onRetry}
                  disabled={isRetrying}
                  className="w-full"
                  size="sm"
                >
                  {isRetrying ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Retrying...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Try Again
                    </>
                  )}
                </Button>
              )}

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    window.open(
                      'https://docs.docker.com/get-docker/',
                      '_blank',
                    );
                  }}
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Install
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    window.open('https://docs.docker.com/desktop/', '_blank');
                  }}
                >
                  <Terminal className="w-4 h-4 mr-1" />
                  Docs
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
