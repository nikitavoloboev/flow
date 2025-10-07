import { AlertTriangle } from 'lucide-react';
import { Container } from '../types/container';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

interface DeleteConfirmationDialogProps {
  open: boolean;
  container: Container | null;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function DeleteConfirmationDialog({
  open,
  container,
  onConfirm,
  onCancel,
  loading = false,
}: DeleteConfirmationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            Confirm deletion
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the container{' '}
            <span className="font-semibold">{container?.name}</span>? This
            action cannot be undone and will permanently delete the container
            and all its data.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            className="flex-1"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
