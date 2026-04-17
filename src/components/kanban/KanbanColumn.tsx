import { memo, useState } from 'react';
import { ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import type { Task, TaskStatus } from '@/types/kanban';
import { KanbanCard } from './KanbanCard';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: Task[];
  allStatuses: TaskStatus[];
  onMoveTask: (taskId: string, newStatusId: string) => void;
  onRefresh: () => void;
  columnIndex: number;
  dragColIdx: number | null;
  dragOverColIdx: number | null;
  onColumnDragStart: (idx: number) => void;
  onColumnDragEnter: (idx: number) => void;
  onColumnDragEnd: (fromIdx: number) => void;
}

function KanbanColumnImpl({
  status, tasks, allStatuses, onMoveTask, onRefresh,
  columnIndex, dragColIdx, dragOverColIdx,
  onColumnDragStart, onColumnDragEnter, onColumnDragEnd,
}: KanbanColumnProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const isColumnDragging = dragColIdx === columnIndex;
  const isColumnDragOver = dragOverColIdx === columnIndex && dragColIdx !== null && dragColIdx !== columnIndex;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) onMoveTask(taskId, status.id);
  };

  const handleColumnHeaderDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('columnIdx', String(columnIndex));
    e.dataTransfer.effectAllowed = 'move';
    onColumnDragStart(columnIndex);
  };

  const handleColumnHeaderDragEnd = () => {
    onColumnDragEnd(columnIndex);
  };

  const handleColumnDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    if (dragColIdx !== null) {
      onColumnDragEnter(columnIndex);
    }
  };

  if (collapsed) {
    return (
      <div
        className="flex min-w-[48px] w-12 flex-col items-center rounded-xl border border-border/50 bg-muted/30 p-2 transition-colors cursor-pointer"
        onClick={() => setCollapsed(false)}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onDragEnter={handleColumnDragEnter}
      >
        <ChevronRight className="h-4 w-4 text-muted-foreground mb-2" />
        <div
          className="h-3 w-3 rounded-full mb-2"
          style={{ backgroundColor: status.color }}
        />
        <span className="text-xs font-semibold text-foreground [writing-mode:vertical-lr] rotate-180">
          {status.name}
        </span>
        <span className="mt-2 rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
          {tasks.length}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "min-w-[280px] flex-1 rounded-xl border bg-muted/30 p-3 transition-all",
        dragOver && dragColIdx === null ? "border-primary border-2 bg-primary/5" : "border-border/50",
        isColumnDragOver && "border-primary border-2 border-dashed bg-primary/5",
        isColumnDragging && "opacity-50"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onDragEnter={handleColumnDragEnter}
    >
      <div className="mb-3 flex items-center gap-2 px-1">
        <div
          draggable
          onDragStart={handleColumnHeaderDragStart}
          onDragEnd={handleColumnHeaderDragEnd}
          className="shrink-0 cursor-grab active:cursor-grabbing rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Arrastar para reordenar"
        >
          <GripVertical className="h-4 w-4" />
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Minimizar coluna"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
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
          <KanbanCard key={task.id} task={task} allStatuses={allStatuses} onRefresh={onRefresh} onMoveTask={onMoveTask} />
        ))}
        {tasks.length === 0 && (
          <p className="py-8 text-center text-xs text-muted-foreground">Nenhuma tarefa</p>
        )}
      </div>
    </div>
  );
}

export const KanbanColumn = memo(KanbanColumnImpl);

