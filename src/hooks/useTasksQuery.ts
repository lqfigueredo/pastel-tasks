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

async function fetchTasksWithAssignees() {
  const [taskRes, assigneeRes, profileRes] = await Promise.all([
    supabase.from('tasks').select('*').order('created_at', { ascending: false }),
    supabase.from('task_assignees').select('task_id, user_id').order('assigned_at'),
    supabase.from('profiles').select('user_id, display_name, avatar_url'),
  ]);

  const profileMap = new Map<string, Profile>();
  if (profileRes.data) {
    for (const p of profileRes.data) profileMap.set(p.user_id, p);
  }

  const assigneeMap = new Map<string, Profile[]>();
  if (assigneeRes.data) {
    for (const row of assigneeRes.data) {
      const profile = profileMap.get(row.user_id);
      if (!profile) continue;
      if (!assigneeMap.has(row.task_id)) assigneeMap.set(row.task_id, []);
      assigneeMap.get(row.task_id)!.push(profile);
    }
  }

  const tasks: TaskWithAssignees[] = (taskRes.data || []).map((t) => ({
    ...t,
    assignees: assigneeMap.get(t.id) || [],
  }));

  return { tasks, assigneeRes: assigneeRes.data || [], profileMap };
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
