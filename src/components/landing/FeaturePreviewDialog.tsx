import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { previewMap } from './featurePreviews';

interface FeaturePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureTitle: string | null;
}

const FeaturePreviewDialog = ({ open, onOpenChange, featureTitle }: FeaturePreviewDialogProps) => {
  const Preview = featureTitle ? previewMap[featureTitle] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{featureTitle}</DialogTitle>
        </DialogHeader>
        {Preview ? <Preview /> : null}
      </DialogContent>
    </Dialog>
  );
};

export default FeaturePreviewDialog;
