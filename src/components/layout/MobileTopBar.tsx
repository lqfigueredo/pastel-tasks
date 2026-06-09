import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import logoAsset from '@/assets/nevvoh-logo.png.asset.json';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

const NotificationBell = lazy(() =>
  import('@/components/NotificationBell').then((m) => ({ default: m.NotificationBell })),
);
const GlobalTimerIndicator = lazy(() => import('@/components/GlobalTimerIndicator'));

const logo = logoAsset.url;

interface Props {
  pageTitle?: string;
  onOpenSearch: () => void;
}

export function MobileTopBar({ pageTitle, onOpenSearch }: Props) {
  const { t } = useTranslation('common');
  return (
    <header
      className="sticky top-0 z-30 h-14 flex items-center gap-2 px-3 border-b border-border bg-background/90 backdrop-blur"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <img src={logo} alt="Nevvoh" className="h-8 w-8 rounded-lg object-contain shrink-0" />
      <h1 className="font-display text-sm font-semibold truncate min-w-0 flex-1">
        {pageTitle || 'Nevvoh'}
      </h1>
      <Button
        variant="ghost"
        size="icon"
        onClick={onOpenSearch}
        className="h-9 w-9"
        aria-label={t('search.openLabel')}
      >
        <Search className="h-4 w-4" />
      </Button>
      <LanguageSwitcher />
      <Suspense fallback={null}>
        <GlobalTimerIndicator />
        <NotificationBell />
      </Suspense>
    </header>
  );
}
