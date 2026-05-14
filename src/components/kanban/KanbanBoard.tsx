import { useState, useCallback, useImperativeHandle, forwardRef, useMemo, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

import { KanbanColumn } from './KanbanColumn';
import { KanbanMobileView } from './KanbanMobileView';
import { errorToast } from '@/lib/toast-helpers';
import { useTasksQuery, useInvalidateTasks, useOptimisticTaskUpdate } from '@/hooks/useTasksQuery';
import { useStatusesQuery } from '@/hooks/useStatusesQuery';
import { useColumnOrderQuery, useUpdateColumnOrder } from '@/hooks/useColumnOrderQuery';
import { useTasksRealtime } from '@/hooks/useTasksRealtime';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Task, TaskStatus } from '@/types/kanban';

export type { Task, TaskStatus };

export interface KanbanBoardRef {
  refresh: () => void;
}

interface KanbanBoardProps {
  filterAssigneeId?: string | null;
  showCompleted?: boolean;
  onCountChange?: (visible: number, total: number) => void;
}

export const KanbanBoard = forwardRef<KanbanBoardRef, KanbanBoardProps>(({ filterAssigneeId, showCompleted = false, onCountChange }, ref) => {
  const [dragColIdx, setDragColIdx] = useState<number | null>(null);
  const [dragOverColIdx, setDragOverColIdx] = useState<number | null>(null);
  const isMobile = useIsMobile();

  const { data: tasksData, isLoading: tasksLoading } = useTasksQuery();
  const { data: statusesData, isLoading: statusesLoading } = useStatusesQuery();
  const { data: columnOrder } = useColumnOrderQuery();
  const updateColumnOrder = useUpdateColumnOrder();
  const invalidateTasks = useInvalidateTasks();
  const optimisticUpdate = useOptimisticTaskUpdate();

  // Subscribe once to realtime updates for tasks/task_assignees.
  useTasksRealtime();

  const loading = tasksLoading || statusesLoading;
  const tasks = useMemo<Task[]>(() => tasksData?.tasks ?? [], [tasksData]);

  // Derive ordered statuses from query data (no local state, no useEffect).
  const orderedStatuses = useMemo<TaskStatus[]>(() => {
    if (!statusesData) return [];
    if (columnOrder && columnOrder.length > 0) {
      const statusMap = new Map(statusesData.map((s) => [s.id, s]));
      const result: TaskStatus[] = [];
      for (const id of columnOrder) {
        const s = statusMap.get(id);
        if (s) {
          result.push(s);
          statusMap.delete(id);
        }
      }
      const remaining = [...statusMap.values()].sort((a, b) => a.position - b.position);
      return [...result, ...remaining];
    }
    return [...statusesData].sort((a, b) => a.position - b.position);
  }, [statusesData, columnOrder]);

  const refresh = useCallback(() => {
    invalidateTasks();
  }, [invalidateTasks]);

  useImperativeHandle(ref, () => ({ refresh }), [refresh]);

  const moveTask = useCallback(
    async (taskId: string, newStatusId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task || task.status_id === newStatusId) return;

      // Optimistic update with rollback. The DB trigger handles change logging.
      const rollback = optimisticUpdate(taskId, { status_id: newStatusId });

      const { error } = await supabase
        .from('tasks')
        .update({ status_id: newStatusId })
        .eq('id', taskId);

      if (error) {
        rollback();
        // Use translated label via i18n directly to avoid prop drilling
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const i18n = (await import('@/i18n')).default;
        errorToast(i18n.t('detail.moveTask', { ns: 'kanban' }) as string, error);
      }
    },
    [tasks, optimisticUpdate]
  );

  const handleColumnReorder = useCallback(
    (fromIdx: number, toIdx: number) => {
      if (fromIdx === toIdx) return;
      const next = [...orderedStatuses];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      updateColumnOrder.mutate(next.map((s) => s.id));
    },
    [orderedStatuses, updateColumnOrder]
  );

  const handleColumnDragStart = useCallback((i: number) => setDragColIdx(i), []);
  const handleColumnDragEnter = useCallback((i: number) => setDragOverColIdx(i), []);
  const handleColumnDragEnd = useCallback(
    (fromIdx: number) => {
      if (dragOverColIdx !== null && dragOverColIdx !== fromIdx) {
        handleColumnReorder(fromIdx, dragOverColIdx);
      }
      setDragColIdx(null);
      setDragOverColIdx(null);
    },
    [dragOverColIdx, handleColumnReorder]
  );

  const filteredTasks = useMemo(() => {
    let list = tasks;
    if (!showCompleted) list = list.filter((t) => !t.actual_end_date);
    if (filterAssigneeId) list = list.filter((t) => t.assignees.some((a) => a.user_id === filterAssigneeId));
    return list;
  }, [tasks, filterAssigneeId, showCompleted]);

  // Notify parent of counts whenever they change. Must be declared before any early return.
  useEffect(() => {
    onCountChange?.(filteredTasks.length, tasks.length);
  }, [filteredTasks.length, tasks.length, onCountChange]);

  if (loading) {
    return (
      <div className="flex gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex-1 h-96 rounded-xl bg-muted/50 animate-pulse" />
        ))}
      </div>
    );
  }

  if (isMobile) {
    return (
      <KanbanMobileView
        statuses={orderedStatuses}
        tasks={filteredTasks}
        onMoveTask={moveTask}
        onRefresh={refresh}
      />
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0 snap-x snap-proximity md:snap-none">
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
          onColumnDragStart={handleColumnDragStart}
          onColumnDragEnter={handleColumnDragEnter}
          onColumnDragEnd={handleColumnDragEnd}
        />
      ))}
    </div>
  );
});

KanbanBoard.displayName = 'KanbanBoard';
