import { lazy, Suspense, useMemo } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { TimerProvider } from '@/contexts/TimerContext';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import { PageLoader } from '@/components/ui/loaders';

// Defer non-critical global components — they don't need to block first paint
const NotificationBell = lazy(() => import('@/components/NotificationBell').then(m => ({ default: m.NotificationBell })));
const GlobalTimerIndicator = lazy(() => import('@/components/GlobalTimerIndicator'));
const SubscriptionStatusBanner = lazy(() => import('@/components/billing/SubscriptionStatusBanner'));
const TrialBanner = lazy(() => import('@/components/TrialBanner'));
const OnboardingWizard = lazy(() => import('@/components/onboarding/OnboardingWizard').then(m => ({ default: m.OnboardingWizard })));

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

  if (loading) {
    return <PageLoader />;
  }

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <TimerProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <div className="flex-1 flex flex-col">
            <Suspense fallback={null}>
              <SubscriptionStatusBanner />
              <TrialBanner />
            </Suspense>
            <header className="h-14 flex items-center border-b border-border/50 px-4 bg-background/80 backdrop-blur-sm gap-3">
              <SidebarTrigger />
              {pageTitle && (
                <h2 className="font-display text-sm font-semibold text-foreground/90 truncate">
                  {pageTitle}
                </h2>
              )}
              <div className="flex-1" />
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
