import { useState } from 'react';
import {
  LayoutDashboard, Users, Settings, LogOut, ShieldCheck, CalendarDays,
  FileText, TrendingUp, BookOpen, Calendar, Lightbulb, BookMarked, Timer, CreditCard,
} from 'lucide-react';
import logo from '@/assets/logo.webp';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRoles } from '@/hooks/useUserRoles';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type NavItem = { title: string; url: string; icon: typeof LayoutDashboard; end?: boolean };

const workItems: NavItem[] = [
  { title: 'Dashboard', url: '/dashboard', icon: CalendarDays },
  { title: 'Minhas Tarefas', url: '/tarefas', icon: LayoutDashboard, end: true },
  { title: 'Equipe', url: '/equipe', icon: Users },
  { title: 'Agenda', url: '/agenda', icon: Calendar },
  { title: 'Temporizador', url: '/temporizador', icon: Timer },
];

const docItems: NavItem[] = [
  { title: 'Atas de Reunião', url: '/atas', icon: FileText },
  { title: 'Instruções de Trabalho', url: '/instrucoes', icon: BookOpen },
  { title: 'Registro de Ideias', url: '/ideias', icon: Lightbulb },
  { title: 'Fonte de Conhecimento', url: '/conhecimento', icon: BookMarked },
];

const adminItems: NavItem[] = [
  { title: 'Configurações', url: '/configuracoes', icon: Settings },
  { title: 'Administração', url: '/admin', icon: ShieldCheck },
  { title: 'Cobrança', url: '/cobranca', icon: CreditCard },
];

const operationItems: NavItem[] = [
  { title: 'Financeiro', url: '/financeiro', icon: TrendingUp },
];

function renderItem(item: NavItem, collapsed: boolean) {
  return (
    <SidebarMenuItem key={item.title}>
      <SidebarMenuButton asChild>
        <NavLink
          to={item.url}
          end={item.end}
          className="hover:bg-sidebar-accent/60"
          activeClassName="bg-sidebar-accent text-primary font-medium"
        >
          <item.icon className="mr-2 h-4 w-4" />
          {!collapsed && <span>{item.title}</span>}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { signOut, user } = useAuth();
  const { isAdmin, isSolutionAdmin, isRegularUser } = useUserRoles();
  const [logoutOpen, setLogoutOpen] = useState(false);

  const isOnlySolutionAdmin = isSolutionAdmin && !isAdmin && !isRegularUser;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className={collapsed ? 'p-2' : 'p-4'}>
        <div className="flex items-center gap-2">
          <img src={logo} alt="NEVVOH" className="h-9 w-9 shrink-0 rounded-xl object-contain" />
          {!collapsed && (
            <span className="font-display text-lg font-bold text-foreground">NEVVOH</span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {!isOnlySolutionAdmin && (
          <>
            <SidebarGroup>
              {!collapsed && <SidebarGroupLabel>Trabalho</SidebarGroupLabel>}
              <SidebarGroupContent>
                <SidebarMenu>
                  {workItems.map((i) => renderItem(i, collapsed))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              {!collapsed && <SidebarGroupLabel>Documentação</SidebarGroupLabel>}
              <SidebarGroupContent>
                <SidebarMenu>
                  {docItems.map((i) => renderItem(i, collapsed))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        {isAdmin && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel>Administração</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((i) => renderItem(i, collapsed))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {isSolutionAdmin && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel>Operação</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {operationItems.map((i) => renderItem(i, collapsed))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-3">
        {!collapsed && user && (
          <p className="mb-2 truncate px-2 text-xs text-muted-foreground">{user.email}</p>
        )}
        <ThemeToggle collapsed={collapsed} />
        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'sm'}
          onClick={() => setLogoutOpen(true)}
          className="w-full justify-start text-muted-foreground hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Sair</span>}
        </Button>
      </SidebarFooter>

      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sair da conta?</AlertDialogTitle>
            <AlertDialogDescription>
              Você precisará entrar novamente para acessar sua conta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setLogoutOpen(false);
                signOut();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sair
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sidebar>
  );
}
