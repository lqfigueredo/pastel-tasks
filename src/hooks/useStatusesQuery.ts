import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TaskStatus {
  id: string;
  name: string;
  color: string;
  position: number;
  is_default: boolean;
  team_id: string | null;
  created_by: string | null;
  created_at: string;
  deleted_at: string | null;
}

const STATUS_COLUMNS = 'id, name, color, position, is_default, team_id, created_by, created_at, deleted_at';

export function useStatusesQuery() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['task-statuses'],
    queryFn: async () => {
      const { data } = await supabase
        .from('task_statuses')
        .select(STATUS_COLUMNS)
        .is('deleted_at', null)
        .order('position');
      return (data || []) as TaskStatus[];
    },
    enabled: !!user,
    staleTime: 60_000,
  });
}

export function useArchivedStatusesQuery() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['task-statuses-archived'],
    queryFn: async () => {
      const { data } = await supabase
        .from('task_statuses')
        .select(STATUS_COLUMNS)
        .not('deleted_at', 'is', null)
        .order('position');
      return (data || []) as TaskStatus[];
    },
    enabled: !!user,
    staleTime: 60_000,
  });
}

export function useInvalidateStatuses() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['task-statuses'] });
    queryClient.invalidateQueries({ queryKey: ['task-statuses-archived'] });
  };
}
