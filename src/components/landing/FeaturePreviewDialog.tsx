import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { previewMap, type FeatureKey } from './featurePreviews';

interface FeaturePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureKey: FeatureKey | null;
}

const FeaturePreviewDialog = ({ open, onOpenChange, featureKey }: FeaturePreviewDialogProps) => {
  const { t } = useTranslation('landing');
  const Preview = featureKey ? previewMap[featureKey] : null;
  const title = featureKey ? t(`features.items.${featureKey}.title`) : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {Preview ? <Preview /> : null}
      </DialogContent>
    </Dialog>
  );
};

export default FeaturePreviewDialog;
