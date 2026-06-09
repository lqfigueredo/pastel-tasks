import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Share, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePWAInstall } from '@/hooks/usePWAInstall';

export function InstallAppButton() {
  const { t } = useTranslation('common');
  const isMobile = useIsMobile();
  const { canInstall, isIOS, promptInstall } = usePWAInstall();
  const [iosOpen, setIosOpen] = useState(false);

  if (!isMobile || !canInstall) return null;

  const handleClick = () => {
    if (isIOS) setIosOpen(true);
    else void promptInstall();
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleClick}
        className="h-8 w-8 shrink-0"
        aria-label={t('pwa.install')}
        title={t('pwa.install')}
      >
        <Download className="h-4 w-4" />
      </Button>

      <Sheet open={iosOpen} onOpenChange={setIosOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader className="text-left">
            <SheetTitle>{t('pwa.iosTitle')}</SheetTitle>
            <SheetDescription>{t('pwa.iosSubtitle')}</SheetDescription>
          </SheetHeader>
          <ol className="mt-4 space-y-4 text-sm">
            <li className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                1
              </span>
              <span className="flex-1 flex items-center gap-2">
                {t('pwa.iosStep1')}
                <Share className="h-4 w-4 text-primary" />
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                2
              </span>
              <span className="flex-1 flex items-center gap-2">
                {t('pwa.iosStep2')}
                <Plus className="h-4 w-4 text-primary" />
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                3
              </span>
              <span className="flex-1">{t('pwa.iosStep3')}</span>
            </li>
          </ol>
        </SheetContent>
      </Sheet>
    </>
  );
}
