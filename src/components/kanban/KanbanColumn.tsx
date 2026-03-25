import { Task, TaskStatus } from './KanbanBoard';
import { KanbanCard } from './KanbanCard';

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: Task[];
  allStatuses: TaskStatus[];
  onMoveTask: (taskId: string, newStatusId: string) => void;
  onRefresh: () => void;
}

export function KanbanColumn({ status, tasks, allStatuses, onMoveTask, onRefresh }: KanbanColumnProps) {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('bg-primary/5');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('bg-primary/5');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-primary/5');
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) onMoveTask(taskId, status.id);
  };

  return (
    <div
      className="min-w-[280px] flex-1 rounded-xl border border-border/50 bg-muted/30 p-3 transition-colors"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="mb-3 flex items-center gap-2 px-1">
        <div
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: status.color }}
        />
        <h3 className="text-sm font-semibold text-foreground">{status.name}</h3>
        <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {tasks.length}
        </span>
      </div>
      <div className="space-y-2">
        {tasks.map((task) => (
          <KanbanCard key={task.id} task={task} allStatuses={allStatuses} onRefresh={onRefresh} />
        ))}
        {tasks.length === 0 && (
          <p className="py-8 text-center text-xs text-muted-foreground">Nenhuma tarefa</p>
        )}
      </div>
    </div>
  );
}
