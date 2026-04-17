import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Profile } from '@/components/kanban/AssigneeSelector';

export interface TaskWithAssignees {
  id: string;
  title: string;
  description: string | null;
  status_id: string;
  start_date: string | null;
  end_date: string | null;
  estimated_delivery_date: string | null;
  actual_end_date: string | null;
  is_minimized: boolean;
  recurring_task_id: string | null;
  meeting_pendency_id: string | null;
  is_critical: boolean;
  created_by: string;
  team_id: string | null;
  created_at: string;
  assignees: Profile[];
}

interface AssigneeRow {
  task_id: string;
  user_id: string;
}

async function fetchTasksWithAssignees() {
  // Single query with nested join — RLS applies naturally on each table.
  // We still need profiles separately because there's no FK from task_assignees → profiles
  // (profiles.user_id references auth.users, not a column we can embed here).
  const [taskRes, assigneeRes, profileRes] = await Promise.all([
    supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase.from('task_assignees').select('task_id, user_id').order('assigned_at'),
    supabase.from('profiles').select('user_id, display_name, avatar_url'),
  ]);

  const profileMap = new Map<string, Profile>();
  for (const p of profileRes.data ?? []) profileMap.set(p.user_id, p);

  const assigneeMap = new Map<string, Profile[]>();
  for (const row of (assigneeRes.data ?? []) as AssigneeRow[]) {
    const profile = profileMap.get(row.user_id);
    if (!profile) continue;
    const list = assigneeMap.get(row.task_id);
    if (list) list.push(profile);
    else assigneeMap.set(row.task_id, [profile]);
  }

  const tasks: TaskWithAssignees[] = (taskRes.data ?? []).map((t) => ({
    ...t,
    assignees: assigneeMap.get(t.id) ?? [],
  }));

  return { tasks, assigneeRes: assigneeRes.data ?? [], profileMap };
}

export function useTasksQuery() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['tasks-with-assignees'],
    queryFn: fetchTasksWithAssignees,
    enabled: !!user,
    staleTime: 30_000,
  });
}

export function useInvalidateTasks() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['tasks-with-assignees'] });
}

/**
 * Apply an optimistic update to the cached tasks list. Returns the previous
 * cache snapshot so callers can roll back on error.
 */
export function useOptimisticTaskUpdate() {
  const queryClient = useQueryClient();
  return (taskId: string, patch: Partial<TaskWithAssignees>) => {
    const key = ['tasks-with-assignees'];
    const prev = queryClient.getQueryData<Awaited<ReturnType<typeof fetchTasksWithAssignees>>>(key);
    if (!prev) return () => {};
    queryClient.setQueryData(key, {
      ...prev,
      tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)),
    });
    return () => queryClient.setQueryData(key, prev);
  };
}
