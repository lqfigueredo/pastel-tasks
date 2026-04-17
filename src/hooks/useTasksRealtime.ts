import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useInvalidateTasks } from './useTasksQuery';

/**
 * Subscribes to realtime changes on `tasks` and `task_assignees` and
 * triggers a debounced cache invalidation. Keeps the Kanban "alive" without
 * requiring users to refresh when teammates make changes.
 */
export function useTasksRealtime() {
  const invalidate = useInvalidateTasks();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const debouncedInvalidate = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => invalidate(), 300);
    };

    const channel = supabase
      .channel('tasks-realtime')
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
  }, [invalidate]);
}
