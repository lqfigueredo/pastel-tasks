import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/hooks/use-theme";
import AppLayout from "@/components/AppLayout";
import Auth from "@/pages/Auth";
import Index from "@/pages/Index";
import Team from "@/pages/Team";
import TeamList from "@/pages/TeamList";
import Settings from "@/pages/Settings";
import Admin from "@/pages/Admin";
import Dashboard from "@/pages/Dashboard";
import MeetingMinutes from "@/pages/MeetingMinutes";
import MeetingMinuteDetail from "@/pages/MeetingMinuteDetail";
import NotFound from "@/pages/NotFound";
import Landing from "@/pages/Landing";
import Financial from "@/pages/Financial";
import FinancialRegister from "@/pages/FinancialRegister";
import WorkInstructions from "@/pages/WorkInstructions";
import PersonalCalendar from "@/pages/PersonalCalendar";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/landing" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/financeiro/cadastro" element={<FinancialRegister />} />
              <Route element={<AppLayout />}>
                <Route path="/" element={<Index />} />
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
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
