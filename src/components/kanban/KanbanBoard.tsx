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
  recurring_task_id: string | null;
  meeting_pendency_id: string | null;
  is_critical: boolean;
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
  const [dragColIdx, setDragColIdx] = useState<number | null>(null);
  const [dragOverColIdx, setDragOverColIdx] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;

    const [statusRes, taskRes, assigneeRes, profileRes, columnOrderRes] = await Promise.all([
      supabase.from('task_statuses').select('*').is('deleted_at', null).order('position'),
      supabase.from('tasks').select('*').eq('created_by', user.id).order('created_at', { ascending: false }),
      supabase.from('task_assignees').select('task_id, user_id').order('assigned_at'),
      supabase.from('profiles').select('user_id, display_name, avatar_url'),
      supabase.from('user_column_order').select('status_ids_order').eq('user_id', user.id).maybeSingle(),
    ]);

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

    // Apply user-specific column order
    const userOrder: string[] | null = columnOrderRes.data?.status_ids_order || null;
    let orderedStatuses: TaskStatus[];
    if (userOrder && userOrder.length > 0) {
      const statusMap = new Map(loadedStatuses.map(s => [s.id, s]));
      const ordered: TaskStatus[] = [];
      for (const id of userOrder) {
        const s = statusMap.get(id);
        if (s) {
          ordered.push(s);
          statusMap.delete(id);
        }
      }
      // Append any new statuses not in the user's saved order
      const remaining = [...statusMap.values()].sort((a, b) => a.position - b.position);
      orderedStatuses = [...ordered, ...remaining];
    } else {
      orderedStatuses = loadedStatuses.sort((a, b) => a.position - b.position);
    }

    setStatuses(orderedStatuses);

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
    const task = tasks.find((t) => t.id === taskId);
    const oldStatusName = statuses.find((s) => s.id === task?.status_id)?.name || '';
    const newStatusName = statuses.find((s) => s.id === newStatusId)?.name || '';

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
    } else if (user && oldStatusName !== newStatusName) {
      await supabase.from('task_change_logs').insert({
        task_id: taskId,
        user_id: user.id,
        field_name: 'status',
        old_value: oldStatusName,
        new_value: newStatusName,
      });
    }
  };

  const handleColumnReorder = useCallback(async (fromIdx: number, toIdx: number) => {
    if (!user || fromIdx === toIdx) return;
    const newStatuses = [...statuses];
    const [moved] = newStatuses.splice(fromIdx, 1);
    newStatuses.splice(toIdx, 0, moved);
    setStatuses(newStatuses);

    const newOrder = newStatuses.map(s => s.id);
    await supabase.from('user_column_order').upsert(
      { user_id: user.id, status_ids_order: newOrder, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
  }, [user, statuses]);

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
      {statuses.map((status, idx) => (
        <KanbanColumn
          key={status.id}
          status={status}
          tasks={tasks.filter((t) => t.status_id === status.id)}
          allStatuses={statuses}
          onMoveTask={moveTask}
          onRefresh={fetchData}
          columnIndex={idx}
          dragColIdx={dragColIdx}
          dragOverColIdx={dragOverColIdx}
          onColumnDragStart={(i) => setDragColIdx(i)}
          onColumnDragEnter={(i) => setDragOverColIdx(i)}
          onColumnDragEnd={(fromIdx) => {
            if (dragOverColIdx !== null && dragOverColIdx !== fromIdx) {
              handleColumnReorder(fromIdx, dragOverColIdx);
            }
            setDragColIdx(null);
            setDragOverColIdx(null);
          }}
        />
      ))}
    </div>
  );
});

KanbanBoard.displayName = 'KanbanBoard';
