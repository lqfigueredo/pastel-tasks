import type { Task, TaskStatus } from '@/types/kanban';
import { safeFormatDate } from '@/lib/date';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Calendar, Flag, Users, AlertTriangle } from 'lucide-react';

interface TaskTooltipProps {
  task: Task;
  statusName: string;
  statusColor: string;
  children: React.ReactNode;
}

function formatDate(dateStr: string | null) {
  return safeFormatDate(dateStr, "dd 'de' MMM");
}

export function TaskTooltip({ task, statusName, statusColor, children }: TaskTooltipProps) {
  const startFormatted = formatDate(task.start_date);
  const endFormatted = formatDate(task.end_date);
  const deliveryFormatted = formatDate(task.estimated_delivery_date);
  const actualEndFormatted = formatDate(task.actual_end_date);

  const dateRange =
    startFormatted && endFormatted
      ? `${startFormatted} → ${endFormatted}`
      : startFormatted || endFormatted || null;

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent
          side="bottom"
          align="start"
          className="max-w-[240px] space-y-1.5 p-3 text-xs"
        >
          <p className="font-semibold text-foreground leading-tight">{task.title}</p>

          {task.is_critical && (
            <div className="flex items-center gap-1.5 text-destructive">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              <span className="font-semibold text-xs">Crítica</span>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: statusColor }}
            />
            <span className="text-muted-foreground">{statusName}</span>
          </div>

          {dateRange && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="h-3 w-3 shrink-0" />
              <span>{dateRange}</span>
            </div>
          )}

          {deliveryFormatted && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Flag className="h-3 w-3 shrink-0" />
              <span>Previsão: {deliveryFormatted}</span>
            </div>
          )}

          {actualEndFormatted && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Flag className="h-3 w-3 shrink-0 text-green-500" />
              <span>Concluída: {actualEndFormatted}</span>
            </div>
          )}

          {task.assignees.length > 0 && (
            <div className="flex items-start gap-1.5 text-muted-foreground">
              <Users className="mt-0.5 h-3 w-3 shrink-0" />
              <span>{task.assignees.map((a) => a.display_name).join(', ')}</span>
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
