import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/hooks/use-theme";
import { PageLoader } from "@/components/ui/loaders";
import { ErrorBoundary } from "@/components/ErrorBoundary";
const AppLayout = lazy(() => import("@/components/AppLayout"));
const Auth = lazy(() => import("@/pages/Auth"));
const Index = lazy(() => import("@/pages/Index"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const Landing = lazy(() => import("@/pages/Landing"));

const Team = lazy(() => import("@/pages/Team"));
const TeamList = lazy(() => import("@/pages/TeamList"));
const Settings = lazy(() => import("@/pages/Settings"));
const Admin = lazy(() => import("@/pages/Admin"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const MeetingMinutes = lazy(() => import("@/pages/MeetingMinutes"));
const MeetingMinuteDetail = lazy(() => import("@/pages/MeetingMinuteDetail"));
const Financial = lazy(() => import("@/pages/Financial"));
const FinancialRegister = lazy(() => import("@/pages/FinancialRegister"));
const WorkInstructions = lazy(() => import("@/pages/WorkInstructions"));
const PersonalCalendar = lazy(() => import("@/pages/PersonalCalendar"));
const Ideas = lazy(() => import("@/pages/Ideas"));
const KnowledgeBase = lazy(() => import("@/pages/KnowledgeBase"));
const Timer = lazy(() => import("@/pages/Timer"));
const Billing = lazy(() => import("@/pages/Billing"));
const Unsubscribe = lazy(() => import("@/pages/Unsubscribe"));
const AcceptInvite = lazy(() => import("@/pages/AcceptInvite"));
const Pricing = lazy(() => import("@/pages/Pricing"));
const Terms = lazy(() => import("@/pages/legal/Terms"));
const Privacy = lazy(() => import("@/pages/legal/Privacy"));
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

const LazyFallback = () => <PageLoader />;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <ErrorBoundary>
              <Suspense fallback={<LazyFallback />}>
                <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/landing" element={<Landing />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/precos" element={<Pricing />} />
                <Route path="/financeiro/cadastro" element={<FinancialRegister />} />
                <Route path="/unsubscribe" element={<Unsubscribe />} />
                <Route path="/convite/:token" element={<AcceptInvite />} />
                <Route path="/termos" element={<Terms />} />
                <Route path="/privacidade" element={<Privacy />} />
                <Route element={<AppLayout />}>
                  <Route path="/tarefas" element={<Index />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/equipe" element={<TeamList />} />
                  <Route path="/equipe/:teamId" element={<Team />} />
                  <Route path="/atas" element={<MeetingMinutes />} />
                  <Route path="/atas/:meetingId" element={<MeetingMinuteDetail />} />
                  <Route path="/configuracoes" element={<Settings />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/financeiro" element={<Financial />} />
                  <Route path="/instrucoes" element={<WorkInstructions />} />
                  <Route path="/agenda" element={<PersonalCalendar />} />
                  <Route path="/ideias" element={<Ideas />} />
                  <Route path="/conhecimento" element={<KnowledgeBase />} />
                  <Route path="/temporizador" element={<Timer />} />
                  <Route path="/cobranca" element={<Billing />} />
                </Route>
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
