import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { TimerProvider } from '@/contexts/TimerContext';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
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

// Mapa pathname → título exibido no header (mantém contexto quando sidebar colapsada)
const PAGE_TITLES: Array<{ match: RegExp; title: string }> = [
  { match: /^\/dashboard/, title: 'Dashboard' },
  { match: /^\/tarefas/, title: 'Minhas Tarefas' },
  { match: /^\/equipe\/[^/]+/, title: 'Detalhes da Equipe' },
  { match: /^\/equipe/, title: 'Equipe' },
  { match: /^\/agenda/, title: 'Agenda' },
  { match: /^\/temporizador/, title: 'Temporizador' },
  { match: /^\/atas\/[^/]+/, title: 'Detalhes da Ata' },
  { match: /^\/atas/, title: 'Atas de Reunião' },
  { match: /^\/instrucoes/, title: 'Instruções de Trabalho' },
  { match: /^\/ideias/, title: 'Registro de Ideias' },
  { match: /^\/conhecimento/, title: 'Fonte de Conhecimento' },
  { match: /^\/configuracoes/, title: 'Configurações' },
  { match: /^\/admin/, title: 'Administração' },
  { match: /^\/cobranca/, title: 'Assinatura e Cobrança' },
  { match: /^\/financeiro/, title: 'Financeiro' },
];

function getPageTitle(pathname: string): string {
  return PAGE_TITLES.find((p) => p.match.test(pathname))?.title ?? '';
}

const AppLayout = () => {
  const { user, loading } = useAuth();
  const { data: onboarding } = useOnboardingStatus();
  const location = useLocation();
  const pageTitle = useMemo(() => getPageTitle(location.pathname), [location.pathname]);
  const [searchOpen, setSearchOpen] = useState(false);

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
                aria-label="Abrir busca global"
              >
                <Search className="h-3.5 w-3.5" />
                <span>Buscar</span>
                <kbd className="ml-1 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono">⌘K</kbd>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchOpen(true)}
                className="md:hidden h-9 w-9"
                aria-label="Abrir busca global"
              >
                <Search className="h-4 w-4" />
              </Button>
              <Suspense fallback={null}>
                <GlobalTimerIndicator />
                <NotificationBell />
              </Suspense>
            </header>
            <main className="flex-1 overflow-auto p-6">
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
