import { LayoutDashboard, Users, Settings, LogOut, ShieldCheck, CalendarDays, FileText, TrendingUp, BookOpen, Calendar, Lightbulb } from 'lucide-react';
import logo from '@/assets/logo.png';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRoles } from '@/hooks/useUserRoles';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';

const navItems = [
  { title: 'Dashboard', url: '/dashboard', icon: CalendarDays },
  { title: 'Minhas Tarefas', url: '/', icon: LayoutDashboard },
  { title: 'Equipe', url: '/equipe', icon: Users },
  { title: 'Atas de Reunião', url: '/atas', icon: FileText },
  { title: 'Instruções de Trabalho', url: '/instrucoes', icon: BookOpen },
  { title: 'Agenda', url: '/agenda', icon: Calendar },
  { title: 'Registro de Ideias', url: '/ideias', icon: Lightbulb },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { signOut, user } = useAuth();
  const { isAdmin, isSolutionAdmin, isRegularUser } = useUserRoles();

  const isOnlySolutionAdmin = isSolutionAdmin && !isAdmin && !isRegularUser;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <img src={logo} alt="NEVVOH" className="h-9 w-9 shrink-0 rounded-xl" />
          {!collapsed && (
            <span className="font-display text-lg font-bold text-foreground">NEVVOH</span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {!isOnlySolutionAdmin && navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === '/'}
                      className="hover:bg-sidebar-accent/60"
                      activeClassName="bg-sidebar-accent text-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {isAdmin && (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to="/configuracoes"
                        className="hover:bg-sidebar-accent/60"
                        activeClassName="bg-sidebar-accent text-primary font-medium"
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        {!collapsed && <span>Configurações</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to="/admin"
                        className="hover:bg-sidebar-accent/60"
                        activeClassName="bg-sidebar-accent text-primary font-medium"
                      >
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        {!collapsed && <span>Administração</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}
              {isSolutionAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/financeiro"
                      className="hover:bg-sidebar-accent/60"
                      activeClassName="bg-sidebar-accent text-primary font-medium"
                    >
                      <TrendingUp className="mr-2 h-4 w-4" />
                      {!collapsed && <span>Financeiro</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        {!collapsed && user && (
          <p className="mb-2 truncate px-2 text-xs text-muted-foreground">{user.email}</p>
        )}
        <ThemeToggle collapsed={collapsed} />
        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'sm'}
          onClick={signOut}
          className="w-full justify-start text-muted-foreground hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
