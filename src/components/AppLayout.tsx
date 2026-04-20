import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { NotificationBell } from '@/components/NotificationBell';
import { TimerProvider } from '@/contexts/TimerContext';
import GlobalTimerIndicator from '@/components/GlobalTimerIndicator';
import SubscriptionStatusBanner from '@/components/billing/SubscriptionStatusBanner';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';

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
            <SubscriptionStatusBanner />
            <header className="h-14 flex items-center border-b border-border/50 px-4 bg-background/80 backdrop-blur-sm">
              <SidebarTrigger className="mr-4" />
              <div className="flex-1" />
              <GlobalTimerIndicator />
              <NotificationBell />
            </header>
            <main className="flex-1 overflow-auto p-6">
              <Outlet />
            </main>
          </div>
        </div>
        {onboarding?.shouldShow && <OnboardingWizard />}
      </SidebarProvider>
    </TimerProvider>
  );
};

export default AppLayout;
