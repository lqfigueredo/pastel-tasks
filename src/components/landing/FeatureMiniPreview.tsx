import { previewMap } from './featurePreviews';

interface FeatureMiniPreviewProps {
  featureTitle: string;
}

const FeatureMiniPreview = ({ featureTitle }: FeatureMiniPreviewProps) => {
  const Preview = previewMap[featureTitle];
  if (!Preview) return null;

  return (
    <div
      aria-hidden="true"
      className="relative h-44 overflow-hidden rounded-lg border border-border bg-muted/30"
    >
      <div
        className="pointer-events-none absolute inset-0 origin-top-left"
        style={{ transform: 'scale(0.55)', width: '182%', height: '182%' }}
      >
        <div className="p-4">
          <Preview />
        </div>
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-card/80" />
    </div>
  );
};

export default FeatureMiniPreview;
