import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Task, TaskStatus } from './KanbanBoard';
import { TaskDetailDialog } from './TaskDetailDialog';
import { AssigneeAvatars } from './AssigneeSelector';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface KanbanCardProps {
  task: Task;
  allStatuses: TaskStatus[];
  onRefresh: () => void;
}

export function KanbanCard({ task, allStatuses, onRefresh }: KanbanCardProps) {
  const [detailOpen, setDetailOpen] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('taskId', task.id);
  };

  return (
    <>
      <Card
        draggable
        onDragStart={handleDragStart}
        onClick={() => setDetailOpen(true)}
        className="cursor-pointer border-border/30 bg-card shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 active:cursor-grabbing"
      >
        <CardContent className="p-3">
          <h4 className="text-sm font-medium text-foreground leading-snug">{task.title}</h4>
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
