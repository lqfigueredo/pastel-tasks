import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { KanbanCard } from './KanbanCard';
import type { Task, TaskStatus } from '@/types/kanban';

interface KanbanMobileViewProps {
  statuses: TaskStatus[];
  tasks: Task[];
  onMoveTask: (taskId: string, newStatusId: string) => void;
  onRefresh: () => void;
}

/**
 * Single-column tabbed Kanban view for mobile (<md).
 * Drag-and-drop is replaced by the in-card "← Mover →" controls.
 */
export function KanbanMobileView({
  statuses,
  tasks,
  onMoveTask,
  onRefresh,
}: KanbanMobileViewProps) {
  const { t } = useTranslation('kanban');
  const [active, setActive] = useState<string>(statuses[0]?.id ?? '');

  const tasksByStatus = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const s of statuses) map.set(s.id, []);
    for (const t of tasks) {
      if (map.has(t.status_id)) map.get(t.status_id)!.push(t);
    }
    return map;
  }, [tasks, statuses]);

  if (statuses.length === 0) return null;

  return (
    <Tabs value={active} onValueChange={setActive} className="w-full">
      <TabsList className="w-full overflow-x-auto h-auto justify-start">
        {statuses.map((s) => {
          const count = tasksByStatus.get(s.id)?.length ?? 0;
          return (
            <TabsTrigger key={s.id} value={s.id} className="shrink-0 gap-1.5">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              {s.name}
              <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 text-[10px]">
                {count}
              </Badge>
            </TabsTrigger>
          );
        })}
      </TabsList>

      {statuses.map((s) => {
        const list = tasksByStatus.get(s.id) ?? [];
        return (
          <TabsContent key={s.id} value={s.id} className="mt-4 space-y-2">
            {list.length === 0 ? (
              <div className="rounded-lg border border-dashed bg-muted/20 py-12 text-center text-sm text-muted-foreground">
                {t('mobile.emptyStatus')}
              </div>
            ) : (
              list.map((task) => (
                <KanbanCard
                  key={task.id}
                  task={task}
                  allStatuses={statuses}
                  onRefresh={onRefresh}
                  onMoveTask={onMoveTask}
                />
              ))
            )}
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
