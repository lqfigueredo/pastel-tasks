import { useState } from 'react';
import { Calendar, Minimize2, Maximize2, Repeat } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Task, TaskStatus } from './KanbanBoard';
import { TaskDetailDialog } from './TaskDetailDialog';
import { AssigneeAvatars } from './AssigneeSelector';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface KanbanCardProps {
  task: Task;
  allStatuses: TaskStatus[];
  onRefresh: () => void;
}

export function KanbanCard({ task, allStatuses, onRefresh }: KanbanCardProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [minimized, setMinimized] = useState(task.is_minimized);

  const toggleMinimize = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newVal = !minimized;
    setMinimized(newVal);
    await supabase.from('tasks').update({ is_minimized: newVal }).eq('id', task.id);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('taskId', task.id);
  };

  return (
    <>
      <Card
        draggable
        onDragStart={handleDragStart}
        onClick={() => setDetailOpen(true)}
        className={cn(
          "cursor-pointer border-border/30 bg-card shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 active:cursor-grabbing",
          minimized && "opacity-70"
        )}
      >
        <CardContent className={cn("p-3", minimized && "p-2")}>
          <div className="flex items-start justify-between gap-1">
            <div className="flex items-center gap-1.5">
              {task.recurring_task_id && (
                <Repeat className="h-3 w-3 shrink-0 text-primary" />
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
              <div className="mt-2 flex items-center justify-between">
                <AssigneeAvatars assignees={task.assignees} />
                {task.estimated_delivery_date && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{format(new Date(task.estimated_delivery_date), "dd MMM", { locale: ptBR })}</span>
                  </div>
                )}
              </div>
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
