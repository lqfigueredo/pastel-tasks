import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { TimerProvider } from '@/contexts/TimerContext';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import { useLocaleSync } from '@/hooks/useLocaleSync';
import { PageLoader } from '@/components/ui/loaders';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

// Defer non-critical global components — they don't need to block first paint
const NotificationBell = lazy(() => import('@/components/NotificationBell').then(m => ({ default: m.NotificationBell })));
const GlobalTimerIndicator = lazy(() => import('@/components/GlobalTimerIndicator'));
const SubscriptionStatusBanner = lazy(() => import('@/components/billing/SubscriptionStatusBanner'));
const TrialBanner = lazy(() => import('@/components/TrialBanner'));
const OnboardingWizard = lazy(() => import('@/components/onboarding/OnboardingWizard').then(m => ({ default: m.OnboardingWizard })));
const GlobalSearch = lazy(() => import('@/components/GlobalSearch').then(m => ({ default: m.GlobalSearch })));

// Mapa pathname → chave de tradução do título (mantém contexto quando sidebar colapsada)
const PAGE_TITLE_KEYS: Array<{ match: RegExp; key: string }> = [
  { match: /^\/dashboard/, key: 'pageTitles.dashboard' },
  { match: /^\/tarefas/, key: 'pageTitles.tasks' },
  { match: /^\/equipe\/[^/]+/, key: 'pageTitles.teamDetail' },
  { match: /^\/equipe/, key: 'pageTitles.team' },
  { match: /^\/agenda/, key: 'pageTitles.agenda' },
  { match: /^\/temporizador/, key: 'pageTitles.timer' },
  { match: /^\/atas\/[^/]+/, key: 'pageTitles.meetingDetail' },
  { match: /^\/atas/, key: 'pageTitles.meetings' },
  { match: /^\/instrucoes/, key: 'pageTitles.instructions' },
  { match: /^\/ideias/, key: 'pageTitles.ideas' },
  { match: /^\/conhecimento/, key: 'pageTitles.knowledge' },
  { match: /^\/configuracoes/, key: 'pageTitles.settings' },
  { match: /^\/admin/, key: 'pageTitles.admin' },
  { match: /^\/cobranca/, key: 'pageTitles.billing' },
  { match: /^\/financeiro/, key: 'pageTitles.financial' },
];

const AppLayout = () => {
  const { user, loading } = useAuth();
  const { t } = useTranslation('nav');
  const { t: tCommon } = useTranslation('common');
  const { data: onboarding } = useOnboardingStatus();
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);

  // Keep locale synced between localStorage, i18n and the user profile
  useLocaleSync();

  const pageTitle = useMemo(() => {
    const entry = PAGE_TITLE_KEYS.find((p) => p.match.test(location.pathname));
    return entry ? t(entry.key) : '';
  }, [location.pathname, t]);

  // Cmd/Ctrl+K opens global search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (loading) {
    return <PageLoader />;
  }

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <TimerProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <Suspense fallback={null}>
              <SubscriptionStatusBanner />
              <TrialBanner />
            </Suspense>
            <header className="h-14 flex items-center border-b border-border/50 px-4 bg-background/80 backdrop-blur-sm gap-3 min-w-0">
              <SidebarTrigger />
              {pageTitle && (
                <h2 className="font-display text-sm font-semibold text-foreground/90 truncate min-w-0">
                  {pageTitle}
                </h2>
              )}
              <div className="flex-1 min-w-0" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchOpen(true)}
                className="hidden md:inline-flex h-8 items-center gap-2 text-xs text-muted-foreground"
                aria-label={tCommon('search.openLabel')}
              >
                <Search className="h-3.5 w-3.5" />
                <span>{tCommon('actions.search')}</span>
                <kbd className="ml-1 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono">
                  {tCommon('search.openShortcut')}
                </kbd>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchOpen(true)}
                className="md:hidden h-9 w-9"
                aria-label={tCommon('search.openLabel')}
              >
                <Search className="h-4 w-4" />
              </Button>
              <LanguageSwitcher />
              <Suspense fallback={null}>
                <GlobalTimerIndicator />
                <NotificationBell />
              </Suspense>
            </header>
            <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 p-4 md:p-6">
              <Outlet />
            </main>
          </div>
        </div>
        <Suspense fallback={null}>
          <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
        </Suspense>
        {onboarding?.shouldShow && (
          <Suspense fallback={null}>
            <OnboardingWizard />
          </Suspense>
        )}
      </SidebarProvider>
    </TimerProvider>
  );
};

export default AppLayout;
