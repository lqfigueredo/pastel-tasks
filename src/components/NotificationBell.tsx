import { useEffect, useMemo, useState } from 'react';
import { Bell, BellOff, CheckCheck, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { differenceInCalendarDays } from 'date-fns';
import { humanizeTimestamp } from '@/lib/date-humanize';
import { EmptyState } from '@/components/ui/empty-state';
import { errorToast } from '@/lib/toast-helpers';
import {
  useNotificationsQuery,
  useInvalidateNotifications,
  type Notification,
} from '@/hooks/useNotificationsQuery';

type NotificationFilter = 'all' | 'tasks' | 'meetings' | 'system';

const FILTER_LABELS: Record<NotificationFilter, string> = {
  all: 'Todas',
  tasks: 'Tarefas',
  meetings: 'Reuniões',
  system: 'Sistema',
};

function categorize(type: string): Exclude<NotificationFilter, 'all'> {
  if (type.startsWith('task')) return 'tasks';
  if (type.startsWith('pendency') || type.startsWith('meeting')) return 'meetings';
  return 'system';
}

function bucketFor(createdAt: string, now: Date): 'today' | 'this_week' | 'older' {
  const diff = differenceInCalendarDays(now, new Date(createdAt));
  if (diff <= 0) return 'today';
  if (diff <= 7) return 'this_week';
  return 'older';
}

const BUCKET_LABELS = {
  today: 'Hoje',
  this_week: 'Esta semana',
  older: 'Anteriores',
} as const;

export const NotificationBell = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<NotificationFilter>('all');

  const { data: notifications = [] } = useNotificationsQuery();
  const invalidateNotifications = useInvalidateNotifications();

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`user:${user.id}:notifications`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          invalidateNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, invalidateNotifications]);

  const setNotificationsCache = (updater: (prev: Notification[]) => Notification[]) => {
    queryClient.setQueryData<Notification[]>(
      ['notifications', user?.id],
      (prev) => updater(prev ?? []),
    );
  };

  const markAsRead = async (id: string) => {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    if (error) {
      errorToast('marcar a notificação como lida', error);
      return;
    }
    setNotificationsCache((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (!unreadIds.length) return;
    const { error } = await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
    if (error) {
      errorToast('marcar as notificações como lidas', error);
      return;
    }
    setNotificationsCache((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const handleClick = (n: Notification) => {
    markAsRead(n.id);
    setOpen(false);
    if (n.type === 'task_deadline' && n.reference_id) {
      navigate('/tarefas');
    } else if (n.type === 'pendency_deadline' && n.reference_id) {
      navigate(`/atas/${n.reference_id}`);
    }
  };

  // Categorize counts by filter so chips show distribution
  const filterCounts = useMemo(() => {
    const counts: Record<NotificationFilter, number> = { all: 0, tasks: 0, meetings: 0, system: 0 };
    counts.all = notifications.length;
    for (const n of notifications) counts[categorize(n.type)] += 1;
    return counts;
  }, [notifications]);

  const filtered = useMemo(() => {
    if (filter === 'all') return notifications;
    return notifications.filter((n) => categorize(n.type) === filter);
  }, [notifications, filter]);

  const grouped = useMemo(() => {
    const now = new Date();
    const groups: Record<'today' | 'this_week' | 'older', Notification[]> = {
      today: [],
      this_week: [],
      older: [],
    };
    for (const n of filtered) groups[bucketFor(n.created_at, now)].push(n);
    return groups;
  }, [filtered]);

  const visibleFilters: NotificationFilter[] = ['all', 'tasks', 'meetings', 'system'];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notificações">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" align="end">
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <h4 className="text-sm font-semibold">Notificações</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" onClick={markAllAsRead}>
              <CheckCheck className="h-3.5 w-3.5" />
              Marcar todas
            </Button>
          )}
        </div>

        {notifications.length > 0 && (
          <div className="flex items-center gap-1 overflow-x-auto border-b border-border/60 px-3 py-2">
            <Filter className="mr-1 h-3 w-3 shrink-0 text-muted-foreground" />
            {visibleFilters.map((f) => {
              const active = filter === f;
              const count = filterCounts[f];
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/70',
                  )}
                >
                  {FILTER_LABELS[f]}
                  <span
                    className={cn(
                      'rounded-full px-1 text-[10px]',
                      active ? 'bg-primary-foreground/20' : 'bg-background/60',
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <ScrollArea className="max-h-[420px]">
          {filtered.length === 0 ? (
            <EmptyState
              icon={BellOff}
              title={notifications.length === 0 ? 'Tudo em dia' : 'Nada nesta categoria'}
              description={
                notifications.length === 0
                  ? 'Você verá aqui avisos de prazos e reuniões.'
                  : 'Tente outra categoria para ver mais avisos.'
              }
              compact
            />
          ) : (
            (['today', 'this_week', 'older'] as const).map((bucket) =>
              grouped[bucket].length === 0 ? null : (
                <div key={bucket}>
                  <div className="sticky top-0 z-10 border-b border-border/40 bg-popover/95 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur">
                    {BUCKET_LABELS[bucket]}
                  </div>
                  {grouped[bucket].map((n) => (
                    <button
                      key={n.id}
                      onClick={() => handleClick(n)}
                      className={cn(
                        'flex w-full flex-col gap-1 border-b border-border/40 px-4 py-3 text-left transition-colors hover:bg-muted/50',
                        !n.is_read && 'bg-muted/30',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={cn(
                            'text-sm font-medium',
                            !n.is_read && 'text-foreground',
                            n.is_read && 'text-muted-foreground',
                          )}
                        >
                          {n.title}
                        </span>
                        {!n.is_read && (
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground line-clamp-2">{n.message}</span>
                      <span className="text-[10px] text-muted-foreground/70">
                        {humanizeTimestamp(n.created_at) ?? ''}
                      </span>
                    </button>
                  ))}
                </div>
              ),
            )
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
