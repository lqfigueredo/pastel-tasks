import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Task, TaskStatus } from '@/components/kanban/KanbanBoard';
import { Profile } from '@/components/kanban/AssigneeSelector';
import { TaskDetailDialog } from '@/components/kanban/TaskDetailDialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  format,
  addMonths,
  subMonths,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MAX_VISIBLE = 3;

export default function Dashboard() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [statuses, setStatuses] = useState<TaskStatus[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;

    const [statusRes, taskRes, assigneeRes, profileRes] = await Promise.all([
      supabase.from('task_statuses').select('*').is('deleted_at', null).order('position'),
      supabase.from('tasks').select('*').eq('created_by', user.id),
      supabase.from('task_assignees').select('task_id, user_id'),
      supabase.from('profiles').select('user_id, display_name, avatar_url'),
    ]);

    if (statusRes.data) setStatuses(statusRes.data);

    const profileMap = new Map<string, Profile>();
    if (profileRes.data) {
      for (const p of profileRes.data) profileMap.set(p.user_id, p);
    }

    const assigneeMap = new Map<string, Profile[]>();
    if (assigneeRes.data) {
      for (const row of assigneeRes.data) {
        const profile = profileMap.get(row.user_id);
        if (!profile) continue;
        if (!assigneeMap.has(row.task_id)) assigneeMap.set(row.task_id, []);
        assigneeMap.get(row.task_id)!.push(profile);
      }
    }

    if (taskRes.data) {
      setTasks(taskRes.data.map((t) => ({ ...t, assignees: assigneeMap.get(t.id) || [] })));
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const statusColorMap = new Map(statuses.map((s) => [s.id, s.color]));

  const getTasksForDay = (day: Date) =>
    tasks.filter((t) => t.estimated_delivery_date && isSameDay(new Date(t.estimated_delivery_date), day));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Calendário mensal de atividades</p>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth((m) => subMonths(m, 1))}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-lg font-semibold capitalize text-foreground">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </h2>
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth((m) => addMonths(m, 1))}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {WEEKDAYS.map((d) => (
            <div key={d} className="px-2 py-2 text-center text-xs font-medium text-muted-foreground">
              {d}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const inMonth = isSameMonth(day, currentMonth);
            const today = isToday(day);
            const dayTasks = getTasksForDay(day);
            const visible = dayTasks.slice(0, MAX_VISIBLE);
            const extra = dayTasks.length - MAX_VISIBLE;

            return (
              <div
                key={i}
                className={`min-h-[100px] border-b border-r border-border p-1.5 ${
                  !inMonth ? 'bg-muted/30' : ''
                } ${today ? 'bg-accent/20' : ''}`}
              >
                <span
                  className={`mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                    today
                      ? 'bg-primary text-primary-foreground'
                      : inMonth
                        ? 'text-foreground'
                        : 'text-muted-foreground/50'
                  }`}
                >
                  {format(day, 'd')}
                </span>

                <div className="space-y-0.5">
                  {visible.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className="flex w-full items-center gap-1 rounded px-1.5 py-0.5 text-left text-[11px] leading-tight transition-colors hover:bg-accent/40"
                    >
                      <span
                        className="mt-0.5 h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: statusColorMap.get(task.status_id) || 'hsl(var(--muted))' }}
                      />
                      <span className="truncate text-foreground">{task.title}</span>
                    </button>
                  ))}
                  {extra > 0 && (
                    <span className="block px-1.5 text-[10px] text-muted-foreground">+{extra} mais</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedTask && (
        <TaskDetailDialog
          task={selectedTask}
          allStatuses={statuses}
          open={!!selectedTask}
          onOpenChange={(open) => { if (!open) setSelectedTask(null); }}
          onRefresh={fetchData}
        />
      )}
    </div>
  );
}
