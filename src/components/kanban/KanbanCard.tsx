import { memo, useCallback, useMemo, useState } from 'react';
import { Calendar, Minimize2, Maximize2, Repeat, FileText, AlertTriangle, ChevronLeft, ChevronRight, CheckCircle2, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import i18nInstance from '@/i18n';

import { Card, CardContent } from '@/components/ui/card';
import type { Task, TaskStatus } from '@/types/kanban';
import { TaskDetailDialog } from './TaskDetailDialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { humanizeDate } from '@/lib/date-humanize';
import { supabase } from '@/integrations/supabase/client';
import { useOptimisticTaskUpdate } from '@/hooks/useTasksQuery';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';

interface KanbanCardProps {
  task: Task;
  allStatuses: TaskStatus[];
  onRefresh: () => void;
  onMoveTask?: (taskId: string, newStatusId: string) => void;
}

function KanbanCardImpl({ task, allStatuses, onRefresh, onMoveTask }: KanbanCardProps) {
  const { t } = useTranslation('kanban');
  const [detailOpen, setDetailOpen] = useState(false);
  const optimisticUpdate = useOptimisticTaskUpdate();
  const { user } = useAuth();
  const isMine = !!user && !!task.assignees?.some((a) => a.user_id === user.id);

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

  const isArchived = !!task.actual_end_date;

  const toggleArchived = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      const newVal = isArchived ? null : new Date().toISOString().slice(0, 10);
      const rollback = optimisticUpdate(task.id, { actual_end_date: newVal });
      const { error } = await supabase
        .from('tasks')
        .update({ actual_end_date: newVal })
        .eq('id', task.id);
      if (error) rollback();
      // Sync linked meeting pendency
      if (!error && task.meeting_pendency_id) {
        await supabase
          .from('meeting_pendencies')
          .update({
            is_completed: !!newVal,
            completed_at: newVal ? new Date().toISOString() : null,
          })
          .eq('id', task.meeting_pendency_id);
      }
    },
    [task.id, task.meeting_pendency_id, isArchived, optimisticUpdate]
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
          isMine && !task.is_critical && "border-l-4 border-l-primary",
          isMine && "bg-primary/5",
          task.is_critical && "border-l-4 border-l-destructive"
        )}
      >
        <CardContent className={cn("p-3", minimized && "p-2")}>
          <div className="flex items-start justify-between gap-1">
            <div className="flex items-center gap-1.5">
              {task.recurring_task_id && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Repeat className="h-3 w-3 shrink-0 text-primary" />
                  </TooltipTrigger>
                  <TooltipContent>{t('card.recurring')}</TooltipContent>
                </Tooltip>
              )}
              {task.is_critical && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-destructive animate-pulse" />
                  </TooltipTrigger>
                  <TooltipContent>{t('card.critical')}</TooltipContent>
                </Tooltip>
              )}
              {task.meeting_pendency_id && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <FileText className="h-3 w-3 shrink-0 text-primary" />
                  </TooltipTrigger>
                  <TooltipContent>{t('card.fromMeeting')}</TooltipContent>
                </Tooltip>
              )}
              <h4 className={cn(
                "text-sm font-medium text-foreground leading-snug",
                minimized && "text-xs truncate"
              )}>
                {task.title}
              </h4>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleMinimize}
                  className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  aria-label={minimized ? t('card.expand') : t('card.minimize')}
                >
                  {minimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
                </button>
              </TooltipTrigger>
              <TooltipContent>{minimized ? t('card.expandCard') : t('card.minimizeCard')}</TooltipContent>
            </Tooltip>
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
                {task.estimated_delivery_date && (() => {
                  const deadlineLabel = humanizeDate(task.estimated_delivery_date, { prefix: 'deadline' });
                  if (!deadlineLabel) return null;
                  const isEn = (i18nInstance.language || 'pt-BR').startsWith('en');
                  const isOverdue = isEn
                    ? deadlineLabel.startsWith('Overdue') || deadlineLabel.startsWith('Due yesterday')
                    : deadlineLabel.startsWith('Atrasada') || deadlineLabel.startsWith('Venceu');
                  const isDueSoon = isEn
                    ? deadlineLabel === 'Due today' || deadlineLabel === 'Due tomorrow'
                    : deadlineLabel === 'Vence hoje' || deadlineLabel === 'Vence amanhã';
                  return (
                    <div
                      className={cn(
                        'flex items-center gap-1 text-xs',
                        isOverdue && 'text-destructive font-medium',
                        isDueSoon && !isOverdue && 'text-warning font-medium',
                        !isOverdue && !isDueSoon && 'text-muted-foreground',
                      )}
                    >
                      <Calendar className="h-3 w-3" />
                      <span>{deadlineLabel}</span>
                    </div>
                  );
                })()}
              </div>
              {onMoveTask && (
                <div className="mt-2 flex items-center justify-between opacity-0 group-hover/card:opacity-100 transition-opacity md:opacity-0 max-md:opacity-100">
                  <button
                    disabled={!canMoveLeft}
                    onClick={(e) => handleMove(e, 'left')}
                    className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title={t('card.movePrev')}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-[10px] text-muted-foreground">{t('card.moveLabel')}</span>
                  <button
                    disabled={!canMoveRight}
                    onClick={(e) => handleMove(e, 'right')}
                    className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title={t('card.moveNext')}
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

export const KanbanCard = memo(KanbanCardImpl);

