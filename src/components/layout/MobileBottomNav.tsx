import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, useLocation } from 'react-router-dom';
import {
  CalendarDays, LayoutDashboard, FileText, Calendar, MoreHorizontal,
  Users, BookOpen, Lightbulb, BookMarked, Timer, ShieldCheck, CreditCard,
  Settings, TrendingUp, LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type Item = { key: string; url: string; icon: typeof CalendarDays };

const primary: Item[] = [
  { key: 'items.dashboard', url: '/dashboard', icon: CalendarDays },
  { key: 'items.myTasks', url: '/tarefas', icon: LayoutDashboard },
  { key: 'items.meetings', url: '/atas', icon: FileText },
  { key: 'items.agenda', url: '/agenda', icon: Calendar },
];

const moreWork: Item[] = [
  { key: 'items.team', url: '/equipe', icon: Users },
  { key: 'items.timer', url: '/temporizador', icon: Timer },
];
const moreDocs: Item[] = [
  { key: 'items.instructions', url: '/instrucoes', icon: BookOpen },
  { key: 'items.ideas', url: '/ideias', icon: Lightbulb },
  { key: 'items.knowledge', url: '/conhecimento', icon: BookMarked },
];

export function MobileBottomNav() {
  const { t } = useTranslation('nav');
  const { isAdmin, isSolutionAdmin, isRegularUser } = useUserRoles();
  const { signOut, user } = useAuth();
  const { pathname } = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const isOnlySolutionAdmin = isSolutionAdmin && !isAdmin && !isRegularUser;

  const adminItems: Item[] = [
    ...(isAdmin ? [{ key: 'items.admin', url: '/admin', icon: ShieldCheck } as Item,
                   { key: 'items.billing', url: '/cobranca', icon: CreditCard } as Item] : []),
    ...(isSolutionAdmin ? [{ key: 'items.financial', url: '/financeiro', icon: TrendingUp } as Item] : []),
    { key: 'items.settings', url: '/configuracoes', icon: Settings },
  ];

  const visiblePrimary = isOnlySolutionAdmin
    ? [{ key: 'items.financial', url: '/financeiro', icon: TrendingUp } as Item,
       { key: 'items.settings', url: '/configuracoes', icon: Settings } as Item]
    : primary;

  return (
    <>
      <nav
        className="fixed bottom-0 inset-x-0 z-40 h-16 bg-background/95 backdrop-blur border-t border-border md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label={t('mobileNav.label', { defaultValue: 'Navegação' })}
      >
        <ul className="grid grid-cols-5 h-full">
          {visiblePrimary.slice(0, 4).map((item) => (
            <li key={item.key}>
              <NavLink
                to={item.url}
                end={item.url === '/tarefas'}
                className={({ isActive }) => cn(
                  'flex flex-col items-center justify-center gap-1 h-full text-[10px] font-medium transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="truncate max-w-[64px]">{t(item.key)}</span>
              </NavLink>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className={cn(
                'flex flex-col items-center justify-center gap-1 h-full w-full text-[10px] font-medium transition-colors',
                'text-muted-foreground hover:text-foreground',
              )}
              aria-label={t('mobileNav.more', { defaultValue: 'Mais' })}
            >
              <MoreHorizontal className="h-5 w-5" />
              <span>{t('mobileNav.more', { defaultValue: 'Mais' })}</span>
            </button>
          </li>
        </ul>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[85vh] overflow-y-auto rounded-t-2xl p-0"
        >
          <SheetHeader className="px-5 pt-5 pb-3 text-left">
            <SheetTitle>{t('mobileNav.menuTitle', { defaultValue: 'Menu' })}</SheetTitle>
            {user?.email && (
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            )}
          </SheetHeader>

          {!isOnlySolutionAdmin && (
            <Section title={t('groups.work')}>
              {moreWork.map((i) => (
                <SheetLink key={i.key} item={i} onClick={() => setMoreOpen(false)} label={t(i.key)} active={pathname.startsWith(i.url)} />
              ))}
            </Section>
          )}

          {!isOnlySolutionAdmin && (
            <Section title={t('groups.documentation')}>
              {moreDocs.map((i) => (
                <SheetLink key={i.key} item={i} onClick={() => setMoreOpen(false)} label={t(i.key)} active={pathname.startsWith(i.url)} />
              ))}
            </Section>
          )}

          <Section title={t('groups.administration')}>
            {adminItems.map((i) => (
              <SheetLink key={i.key} item={i} onClick={() => setMoreOpen(false)} label={t(i.key)} active={pathname.startsWith(i.url)} />
            ))}
          </Section>

          <div className="px-5 py-4 border-t border-border flex items-center justify-between gap-3">
            <ThemeToggle collapsed={false} />
            <button
              type="button"
              onClick={() => { setMoreOpen(false); setLogoutOpen(true); }}
              className="flex items-center gap-2 text-sm text-destructive font-medium px-3 py-2 rounded-md hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" /> {t('logout.trigger')}
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('logout.confirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('logout.confirmDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('logout.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { setLogoutOpen(false); signOut(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('logout.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-2 py-2">
      <p className="px-3 pb-1 text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">{title}</p>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}

function SheetLink({ item, onClick, label, active }: { item: Item; onClick: () => void; label: string; active: boolean }) {
  return (
    <NavLink
      to={item.url}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-colors',
        active ? 'bg-accent text-primary font-semibold' : 'text-foreground hover:bg-accent/50',
      )}
    >
      <item.icon className="h-5 w-5" />
      <span>{label}</span>
    </NavLink>
  );
}
