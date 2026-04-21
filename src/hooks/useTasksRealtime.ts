import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useInvalidateTasks } from './useTasksQuery';

/**
 * Subscribes to realtime changes on `tasks` and `task_assignees` and
 * triggers a debounced cache invalidation. Keeps the Kanban "alive" without
 * requiring users to refresh when teammates make changes.
 *
 * Channel name uses the `user:<uuid>` scoped pattern enforced by
 * realtime authorization policy `can_access_realtime_topic`.
 */
export function useTasksRealtime() {
  const invalidate = useInvalidateTasks();
  const { user } = useAuth();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) return;

    const debouncedInvalidate = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => invalidate(), 300);
    };

    const channel = supabase
      .channel(`user:${user.id}:tasks`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        debouncedInvalidate
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'task_assignees' },
        debouncedInvalidate
      )
      .subscribe();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      supabase.removeChannel(channel);
    };
  }, [invalidate, user]);
}
