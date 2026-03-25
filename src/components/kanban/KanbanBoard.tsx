import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { KanbanColumn } from './KanbanColumn';
import { useToast } from '@/hooks/use-toast';

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
}

export interface TaskStatus {
  id: string;
  name: string;
  color: string;
  position: number;
}

export function KanbanBoard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [statuses, setStatuses] = useState<TaskStatus[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!user) return;

    const [statusRes, taskRes] = await Promise.all([
      supabase.from('task_statuses').select('*').order('position'),
      supabase.from('tasks').select('*').eq('created_by', user.id).order('created_at', { ascending: false }),
    ]);

    if (statusRes.data) setStatuses(statusRes.data);
    if (taskRes.data) setTasks(taskRes.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user]);

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
}
