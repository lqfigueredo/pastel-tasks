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

    const [statusRes, taskRes, assigneeRes] = await Promise.all([
      supabase.from('task_statuses').select('*').order('position'),
      supabase.from('tasks').select('*').eq('created_by', user.id).order('created_at', { ascending: false }),
      supabase.from('task_assignees').select('task_id, user_id').order('assigned_at'),
      supabase.from('profiles').select('user_id, display_name, avatar_url'),
    ]);

    if (statusRes.data) setStatuses(statusRes.data);

    // Build assignee map
    const assigneeMap = new Map<string, Profile[]>();
    if (assigneeRes.data) {
      for (const row of assigneeRes.data as any[]) {
        const taskId = row.task_id as string;
        const profile: Profile = {
          user_id: row.profiles.user_id,
          display_name: row.profiles.display_name,
          avatar_url: row.profiles.avatar_url,
        };
        if (!assigneeMap.has(taskId)) assigneeMap.set(taskId, []);
        assigneeMap.get(taskId)!.push(profile);
      }
    }

    if (taskRes.data) {
      setTasks(
        taskRes.data.map((t) => ({
          ...t,
          assignees: assigneeMap.get(t.id) || [],
        }))
      );
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
