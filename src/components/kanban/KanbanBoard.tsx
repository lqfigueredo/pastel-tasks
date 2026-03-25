import { useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { KanbanColumn } from './KanbanColumn';
import { useToast } from '@/hooks/use-toast';
import { Profile } from './AssigneeSelector';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status_id: string;
  start_date: string | null;
  end_date: string | null;
  estimated_delivery_date: string | null;
  actual_end_date: string | null;
  is_minimized: boolean;
  created_by: string;
  team_id: string | null;
  created_at: string;
  assignees: Profile[];
}

export interface TaskStatus {
  id: string;
  name: string;
  color: string;
  position: number;
}

export interface KanbanBoardRef {
  refresh: () => void;
}

export const KanbanBoard = forwardRef<KanbanBoardRef>((_props, ref) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [statuses, setStatuses] = useState<TaskStatus[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;

    const [statusRes, taskRes, assigneeRes, profileRes] = await Promise.all([
      supabase.from('task_statuses').select('*').is('deleted_at', null).order('position'),
      supabase.from('tasks').select('*').eq('created_by', user.id).order('created_at', { ascending: false }),
      supabase.from('task_assignees').select('task_id, user_id').order('assigned_at'),
      supabase.from('profiles').select('user_id, display_name, avatar_url'),
    ]);

    if (statusRes.data) setStatuses(statusRes.data);

    // Build profile lookup
    const profileMap = new Map<string, Profile>();
    if (profileRes.data) {
      for (const p of profileRes.data) {
        profileMap.set(p.user_id, p);
      }
    }

    // Build assignee map
    const assigneeMap = new Map<string, Profile[]>();
    if (assigneeRes.data) {
      for (const row of assigneeRes.data) {
        const profile = profileMap.get(row.user_id);
        if (!profile) continue;
        if (!assigneeMap.has(row.task_id)) assigneeMap.set(row.task_id, []);
        assigneeMap.get(row.task_id)!.push(profile);
      }
    }

    const loadedStatuses = statusRes.data || [];
    const statusIds = new Set(loadedStatuses.map(s => s.id));
    const fallbackStatus = loadedStatuses.find(s => (s as any).is_default && s.position === 0) || loadedStatuses.find(s => (s as any).is_default);

    if (taskRes.data) {
      const mappedTasks = taskRes.data.map((t) => ({
        ...t,
        assignees: assigneeMap.get(t.id) || [],
      }));

      // Fix orphaned tasks (status_id not in current statuses)
      if (fallbackStatus) {
        const orphaned = mappedTasks.filter(t => !statusIds.has(t.status_id));
        if (orphaned.length > 0) {
          await Promise.all(
            orphaned.map(t =>
              supabase.from('tasks').update({ status_id: fallbackStatus.id }).eq('id', t.id)
            )
          );
          for (const t of orphaned) {
            t.status_id = fallbackStatus.id;
          }
        }
      }

      setTasks(mappedTasks);
    }
    setLoading(false);
  }, [user]);

  useImperativeHandle(ref, () => ({ refresh: fetchData }), [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const moveTask = async (taskId: string, newStatusId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status_id: newStatusId } : t))
    );

    const { error } = await supabase
      .from('tasks')
      .update({ status_id: newStatusId })
      .eq('id', taskId);

    if (error) {
      toast({ title: 'Erro ao mover tarefa', variant: 'destructive' });
      fetchData();
    }
  };

  if (loading) {
    return (
      <div className="flex gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex-1 h-96 rounded-xl bg-muted/50 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {statuses.map((status) => (
        <KanbanColumn
          key={status.id}
          status={status}
          tasks={tasks.filter((t) => t.status_id === status.id)}
          allStatuses={statuses}
          onMoveTask={moveTask}
          onRefresh={fetchData}
        />
      ))}
    </div>
  );
});

KanbanBoard.displayName = 'KanbanBoard';
