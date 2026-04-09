import { useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { KanbanColumn } from './KanbanColumn';
import { useToast } from '@/hooks/use-toast';
import { Profile } from './AssigneeSelector';
import { useTasksQuery, useInvalidateTasks } from '@/hooks/useTasksQuery';
import { useStatusesQuery } from '@/hooks/useStatusesQuery';

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

interface KanbanBoardProps {
  filterAssigneeId?: string | null;
}

export const KanbanBoard = forwardRef<KanbanBoardRef, KanbanBoardProps>(({ filterAssigneeId }, ref) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [orderedStatuses, setOrderedStatuses] = useState<TaskStatus[]>([]);
  const [localTasks, setLocalTasks] = useState<Task[]>([]);
  const [dragColIdx, setDragColIdx] = useState<number | null>(null);
  const [dragOverColIdx, setDragOverColIdx] = useState<number | null>(null);

  const { data: tasksData, isLoading: tasksLoading } = useTasksQuery();
  const { data: statusesData, isLoading: statusesLoading } = useStatusesQuery();
  const invalidateTasks = useInvalidateTasks();

  const loading = tasksLoading || statusesLoading;

  // Fetch user column order and apply it
  useEffect(() => {
    if (!user || !statusesData) return;

    supabase
      .from('user_column_order')
      .select('status_ids_order')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data: columnOrderData }) => {
        const userOrder: string[] | null = columnOrderData?.status_ids_order || null;
        let ordered: TaskStatus[];

        if (userOrder && userOrder.length > 0) {
          const statusMap = new Map(statusesData.map((s) => [s.id, s]));
          const result: TaskStatus[] = [];
          for (const id of userOrder) {
            const s = statusMap.get(id);
            if (s) {
              result.push(s);
              statusMap.delete(id);
            }
          }
          const remaining = [...statusMap.values()].sort((a, b) => a.position - b.position);
          ordered = [...result, ...remaining];
        } else {
          ordered = [...statusesData].sort((a, b) => a.position - b.position);
        }

        setOrderedStatuses(ordered);
      });
  }, [user, statusesData]);

  // Sync tasks from React Query
  useEffect(() => {
    if (tasksData) {
      setLocalTasks(tasksData.tasks);
    }
  }, [tasksData]);

  const refresh = useCallback(() => {
    invalidateTasks();
  }, [invalidateTasks]);

  useImperativeHandle(ref, () => ({ refresh }), [refresh]);

  const moveTask = async (taskId: string, newStatusId: string) => {
    const task = localTasks.find((t) => t.id === taskId);
    const oldStatusName = orderedStatuses.find((s) => s.id === task?.status_id)?.name || '';
    const newStatusName = orderedStatuses.find((s) => s.id === newStatusId)?.name || '';

    setLocalTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status_id: newStatusId } : t))
    );

    const { error } = await supabase
      .from('tasks')
      .update({ status_id: newStatusId })
      .eq('id', taskId);

    if (error) {
      toast({ title: 'Erro ao mover tarefa', variant: 'destructive' });
      invalidateTasks();
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
    const newStatuses = [...orderedStatuses];
    const [moved] = newStatuses.splice(fromIdx, 1);
    newStatuses.splice(toIdx, 0, moved);
    setOrderedStatuses(newStatuses);

    const newOrder = newStatuses.map((s) => s.id);
    await supabase.from('user_column_order').upsert(
      { user_id: user.id, status_ids_order: newOrder, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
  }, [user, orderedStatuses]);

  if (loading) {
    return (
      <div className="flex gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex-1 h-96 rounded-xl bg-muted/50 animate-pulse" />
        ))}
      </div>
    );
  }

  const filteredTasks = filterAssigneeId
    ? localTasks.filter((t) => t.assignees.some((a) => a.user_id === filterAssigneeId))
    : localTasks;

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {orderedStatuses.map((status, idx) => (
        <KanbanColumn
          key={status.id}
          status={status}
          tasks={filteredTasks.filter((t) => t.status_id === status.id)}
          allStatuses={orderedStatuses}
          onMoveTask={moveTask}
          onRefresh={refresh}
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
