import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import logoAsset from '@/assets/nevvoh-logo.png.asset.json';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { InstallAppButton } from '@/components/pwa/InstallAppButton';

const NotificationBell = lazy(() =>
  import('@/components/NotificationBell').then((m) => ({ default: m.NotificationBell })),
);
const GlobalTimerIndicator = lazy(() => import('@/components/GlobalTimerIndicator'));

const logo = logoAsset.url;

interface Props {
  pageTitle?: string;
  onOpenSearch: () => void;
}

export function MobileTopBar({ pageTitle: _pageTitle, onOpenSearch }: Props) {
  const { t } = useTranslation('common');
  return (
    <header
      className="sticky top-0 z-30 h-14 flex items-center gap-1 px-3 border-b border-border bg-background/90 backdrop-blur"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <img src={logo} alt="Nevvoh" className="h-8 w-8 rounded-lg object-contain shrink-0" />
      <div className="flex-1 min-w-0" />
      <Button
        variant="ghost"
        size="icon"
        onClick={onOpenSearch}
        className="h-8 w-8 shrink-0"
        aria-label={t('search.openLabel')}
      >
        <Search className="h-4 w-4" />
      </Button>
      <div className="shrink-0 [&_button]:h-8 [&_button]:px-1.5">
        <LanguageSwitcher />
      </div>
      <InstallAppButton />
      <Suspense fallback={null}>
        <div className="shrink-0 flex items-center gap-1 [&_button]:h-8 [&_button]:w-8">
          <GlobalTimerIndicator />
          <NotificationBell />
        </div>
      </Suspense>
    </header>
  );
}
