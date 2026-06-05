import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, Users, Settings, LogOut, ShieldCheck, CalendarDays,
  FileText, TrendingUp, BookOpen, Calendar, Lightbulb, BookMarked, Timer, CreditCard,
} from 'lucide-react';
import logo from '@/assets/flowly-logo.svg';
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

type NavItem = { key: string; url: string; icon: typeof LayoutDashboard; end?: boolean };

const workItems: NavItem[] = [
  { key: 'items.dashboard', url: '/dashboard', icon: CalendarDays },
  { key: 'items.myTasks', url: '/tarefas', icon: LayoutDashboard, end: true },
  { key: 'items.team', url: '/equipe', icon: Users },
  { key: 'items.agenda', url: '/agenda', icon: Calendar },
  { key: 'items.timer', url: '/temporizador', icon: Timer },
];

const docItems: NavItem[] = [
  { key: 'items.meetings', url: '/atas', icon: FileText },
  { key: 'items.instructions', url: '/instrucoes', icon: BookOpen },
  { key: 'items.ideas', url: '/ideias', icon: Lightbulb },
  { key: 'items.knowledge', url: '/conhecimento', icon: BookMarked },
];

const adminItems: NavItem[] = [
  { key: 'items.admin', url: '/admin', icon: ShieldCheck },
  { key: 'items.billing', url: '/cobranca', icon: CreditCard },
];

const settingsItem: NavItem = { key: 'items.settings', url: '/configuracoes', icon: Settings };

const operationItems: NavItem[] = [
  { key: 'items.financial', url: '/financeiro', icon: TrendingUp },
];

function useRenderItem(collapsed: boolean) {
  const { t } = useTranslation('nav');
  return (item: NavItem) => {
    const label = t(item.key);
    return (
      <SidebarMenuItem key={item.key}>
        <SidebarMenuButton asChild>
          <NavLink
            to={item.url}
            end={item.end}
            className="hover:bg-sidebar-accent/60"
            activeClassName="bg-sidebar-accent text-primary font-medium"
          >
            <item.icon className="mr-2 h-4 w-4" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { signOut, user } = useAuth();
  const { isAdmin, isSolutionAdmin, isRegularUser } = useUserRoles();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const { t } = useTranslation('nav');
  const renderItem = useRenderItem(collapsed);

  const isOnlySolutionAdmin = isSolutionAdmin && !isAdmin && !isRegularUser;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className={collapsed ? 'p-2' : 'p-4'}>
        <div className="flex items-center gap-2">
          <img src={logo} alt="Flowly" className="h-9 w-9 shrink-0 rounded-xl object-contain" />
          {!collapsed && (
            <span className="font-display text-lg text-sidebar-foreground">
              <span className="font-semibold">flow</span><span className="font-normal text-flowly-soft">ly</span>
            </span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {!isOnlySolutionAdmin && (
          <>
            <SidebarGroup>
              {!collapsed && <SidebarGroupLabel>{t('groups.work')}</SidebarGroupLabel>}
              <SidebarGroupContent>
                <SidebarMenu>{workItems.map(renderItem)}</SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              {!collapsed && <SidebarGroupLabel>{t('groups.documentation')}</SidebarGroupLabel>}
              <SidebarGroupContent>
                <SidebarMenu>{docItems.map(renderItem)}</SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        {isAdmin && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel>{t('groups.administration')}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>{[settingsItem, ...adminItems].map(renderItem)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {isSolutionAdmin && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel>{t('groups.operation')}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>{operationItems.map(renderItem)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {!isAdmin && isSolutionAdmin && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel>{t('groups.administration')}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>{renderItem(settingsItem)}</SidebarMenu>
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
          {!collapsed && <span className="ml-2">{t('logout.trigger')}</span>}
        </Button>
      </SidebarFooter>

      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('logout.confirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('logout.confirmDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('logout.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setLogoutOpen(false);
                signOut();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('logout.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sidebar>
  );
}
