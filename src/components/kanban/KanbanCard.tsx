import { memo, useCallback, useMemo, useState } from 'react';
import { Calendar, Minimize2, Maximize2, Repeat, FileText, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import type { Task, TaskStatus } from '@/types/kanban';
import { TaskDetailDialog } from './TaskDetailDialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { safeFormatDate } from '@/lib/date';
import { supabase } from '@/integrations/supabase/client';
import { useOptimisticTaskUpdate } from '@/hooks/useTasksQuery';
import { cn } from '@/lib/utils';

interface KanbanCardProps {
  task: Task;
  allStatuses: TaskStatus[];
  onRefresh: () => void;
  onMoveTask?: (taskId: string, newStatusId: string) => void;
}

function KanbanCardImpl({ task, allStatuses, onRefresh, onMoveTask }: KanbanCardProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const optimisticUpdate = useOptimisticTaskUpdate();

  const sortedStatuses = useMemo(
    () => [...allStatuses].sort((a, b) => a.position - b.position),
    [allStatuses]
  );
  const currentIndex = sortedStatuses.findIndex((s) => s.id === task.status_id);
  const canMoveLeft = currentIndex > 0;
  const canMoveRight = currentIndex < sortedStatuses.length - 1;

  const handleMove = useCallback(
    (e: React.MouseEvent, direction: 'left' | 'right') => {
      e.stopPropagation();
      const newIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
      if (newIndex >= 0 && newIndex < sortedStatuses.length && onMoveTask) {
        onMoveTask(task.id, sortedStatuses[newIndex].id);
      }
    },
    [currentIndex, sortedStatuses, onMoveTask, task.id]
  );

  const toggleMinimize = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      const newVal = !task.is_minimized;
      const rollback = optimisticUpdate(task.id, { is_minimized: newVal });
      const { error } = await supabase
        .from('tasks')
        .update({ is_minimized: newVal })
        .eq('id', task.id);
      if (error) rollback();
    },
    [task.id, task.is_minimized, optimisticUpdate]
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.setData('taskId', task.id);
    },
    [task.id]
  );

  const minimized = task.is_minimized;

  return (
    <>
      <Card
        draggable
        onDragStart={handleDragStart}
        onClick={() => setDetailOpen(true)}
        className={cn(
          "group/card cursor-grab border-border/30 bg-card shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 active:cursor-grabbing",
          minimized && "opacity-70",
          task.is_critical && "border-l-4 border-l-destructive"
        )}
      >
        <CardContent className={cn("p-3", minimized && "p-2")}>
          <div className="flex items-start justify-between gap-1">
            <div className="flex items-center gap-1.5">
              {task.recurring_task_id && (
                <Repeat className="h-3 w-3 shrink-0 text-primary" />
              )}
              {task.is_critical && (
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-destructive animate-pulse" />
              )}
              {task.meeting_pendency_id && (
                <FileText className="h-3 w-3 shrink-0 text-primary" />
              )}
              <h4 className={cn(
                "text-sm font-medium text-foreground leading-snug",
                minimized && "text-xs truncate"
              )}>
                {task.title}
              </h4>
            </div>
            <button
              onClick={toggleMinimize}
              className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title={minimized ? 'Expandir' : 'Minimizar'}
            >
              {minimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
            </button>
          </div>
          {!minimized && (
            <>
              {task.description && (
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{task.description}</p>
              )}
              {task.assignees && task.assignees.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {task.assignees.map((a) => (
                    <span key={a.user_id} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-foreground">
                      <Avatar className="h-4 w-4">
                        {a.avatar_url && <AvatarImage src={a.avatar_url} />}
                        <AvatarFallback className="text-[8px]">{a.display_name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      {a.display_name}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-2 flex items-center justify-end">
                {task.estimated_delivery_date && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{format(new Date(task.estimated_delivery_date), "dd MMM", { locale: ptBR })}</span>
                  </div>
                )}
              </div>
              {onMoveTask && (
                <div className="mt-2 flex items-center justify-between opacity-0 group-hover/card:opacity-100 transition-opacity md:opacity-0 max-md:opacity-100">
                  <button
                    disabled={!canMoveLeft}
                    onClick={(e) => handleMove(e, 'left')}
                    className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Mover para status anterior"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-[10px] text-muted-foreground">Mover</span>
                  <button
                    disabled={!canMoveRight}
                    onClick={(e) => handleMove(e, 'right')}
                    className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Mover para próximo status"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
      <TaskDetailDialog
        task={task}
        allStatuses={allStatuses}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onRefresh={onRefresh}
      />
    </>
  );
}
