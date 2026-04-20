import { lazy, Suspense } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { TimerProvider } from '@/contexts/TimerContext';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';

// Defer non-critical global components — they don't need to block first paint
const NotificationBell = lazy(() => import('@/components/NotificationBell').then(m => ({ default: m.NotificationBell })));
const GlobalTimerIndicator = lazy(() => import('@/components/GlobalTimerIndicator'));
const SubscriptionStatusBanner = lazy(() => import('@/components/billing/SubscriptionStatusBanner'));
const TrialBanner = lazy(() => import('@/components/TrialBanner'));
const OnboardingWizard = lazy(() => import('@/components/onboarding/OnboardingWizard').then(m => ({ default: m.OnboardingWizard })));

const AppLayout = () => {
  const { user, loading } = useAuth();
  const { data: onboarding } = useOnboardingStatus();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
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
            <header className="h-14 flex items-center border-b border-border/50 px-4 bg-background/80 backdrop-blur-sm">
              <SidebarTrigger className="mr-4" />
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
