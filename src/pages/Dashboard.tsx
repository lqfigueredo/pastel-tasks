import { useState, useEffect, useCallback, useMemo } from 'react';
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
  isWithinInterval,
  isBefore,
  isAfter,
  format,
  addMonths,
  subMonths,
  parseISO,
  differenceInDays,
  max as dateMax,
  min as dateMin,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MAX_BAR_SLOTS = 3;
const BAR_HEIGHT = 22;
const BAR_GAP = 2;
const TOP_OFFSET = 28; // space for day number

interface BarSegment {
  task: Task;
  startCol: number;
  endCol: number;
  row: number;
  isStart: boolean;
  isEnd: boolean;
}

function getTaskInterval(t: Task): { start: Date; end: Date } | null {
  const s = t.start_date ? parseISO(t.start_date) : null;
  const e = t.end_date ? parseISO(t.end_date) : null;
  const d = t.estimated_delivery_date ? parseISO(t.estimated_delivery_date) : null;

  if (s && e) return { start: s, end: e };
  if (s && !e) return { start: s, end: d || s };
  if (!s && e) return { start: e, end: e };
  if (d) return { start: d, end: d };
  return null;
}

function isMultiDay(t: Task): boolean {
  const interval = getTaskInterval(t);
  if (!interval) return false;
  return differenceInDays(interval.end, interval.start) >= 1;
}

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

  // Group days into weeks (chunks of 7)
  const weeks = useMemo(() => {
    const result: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      result.push(days.slice(i, i + 7));
    }
    return result;
  }, [days]);

  // For a given week, compute bar segments for multi-day tasks
  const computeBarsForWeek = useCallback(
    (weekDays: Date[]): { bars: BarSegment[]; overflow: Map<number, number> } => {
      const weekStart = weekDays[0];
      const weekEnd = weekDays[6];

      // Find multi-day tasks that overlap this week
      const candidates: { task: Task; startCol: number; endCol: number; isStart: boolean; isEnd: boolean; span: number }[] = [];

      for (const task of tasks) {
        if (!isMultiDay(task)) continue;
        const interval = getTaskInterval(task);
        if (!interval) continue;

        // Check overlap with week
        if (isAfter(interval.start, weekEnd) || isBefore(interval.end, weekStart)) continue;

        const clampedStart = dateMax([interval.start, weekStart]);
        const clampedEnd = dateMin([interval.end, weekEnd]);

        const startCol = differenceInDays(clampedStart, weekStart);
        const endCol = differenceInDays(clampedEnd, weekStart);

        candidates.push({
          task,
          startCol,
          endCol,
          isStart: isSameDay(clampedStart, interval.start),
          isEnd: isSameDay(clampedEnd, interval.end),
          span: endCol - startCol + 1,
        });
      }

      // Sort by span descending (longer tasks get priority)
      candidates.sort((a, b) => b.span - a.span);

      // Allocate slots
      const bars: BarSegment[] = [];
      const overflow = new Map<number, number>(); // col -> count of hidden bars
      const slots: { startCol: number; endCol: number }[][] = []; // slots[row] = occupied ranges

      for (const c of candidates) {
        let placed = false;
        for (let row = 0; row < MAX_BAR_SLOTS; row++) {
          if (!slots[row]) slots[row] = [];
          const conflict = slots[row].some(
            (s) => c.startCol <= s.endCol && c.endCol >= s.startCol
          );
          if (!conflict) {
            slots[row].push({ startCol: c.startCol, endCol: c.endCol });
            bars.push({ task: c.task, startCol: c.startCol, endCol: c.endCol, row, isStart: c.isStart, isEnd: c.isEnd });
            placed = true;
            break;
          }
        }
        if (!placed) {
          // Count overflow per column
          for (let col = c.startCol; col <= c.endCol; col++) {
            overflow.set(col, (overflow.get(col) || 0) + 1);
          }
        }
      }

      return { bars, overflow };
    },
    [tasks]
  );

  // Get single-day tasks for a specific day
  const getSingleDayTasks = useCallback(
    (day: Date) =>
      tasks.filter((t) => {
        if (isMultiDay(t)) return false;
        const interval = getTaskInterval(t);
        if (!interval) return false;
        return isSameDay(day, interval.start);
      }),
    [tasks]
  );

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

        {/* Weeks */}
        {weeks.map((weekDays, wi) => {
          const { bars, overflow } = computeBarsForWeek(weekDays);
          const maxRow = bars.length > 0 ? Math.max(...bars.map((b) => b.row)) : -1;
          const barsAreaHeight = (maxRow + 1) * (BAR_HEIGHT + BAR_GAP);
          const cellMinHeight = TOP_OFFSET + barsAreaHeight + 30; // 30px for single-day tasks

          return (
            <div key={wi} className="relative grid grid-cols-7">
              {/* Day cells (background + day numbers + single-day tasks) */}
              {weekDays.map((day, di) => {
                const inMonth = isSameMonth(day, currentMonth);
                const today = isToday(day);
                const singleTasks = getSingleDayTasks(day);
                const overflowCount = overflow.get(di) || 0;

                return (
                  <div
                    key={di}
                    className={`border-b border-r border-border p-1.5 ${
                      !inMonth ? 'bg-muted/30' : ''
                    } ${today ? 'bg-accent/20' : ''}`}
                    style={{ minHeight: `${cellMinHeight}px` }}
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

                    {/* Single-day tasks rendered below bars area */}
                    <div style={{ marginTop: `${barsAreaHeight}px` }} className="space-y-0.5">
                      {singleTasks.map((task) => (
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
                      {overflowCount > 0 && (
                        <span className="block px-1.5 text-[10px] text-muted-foreground">+{overflowCount} mais</span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Multi-day bars (absolute positioned over the week row) */}
              {bars.map((bar, bi) => {
                const color = statusColorMap.get(bar.task.status_id) || 'hsl(var(--muted))';
                const left = `${(bar.startCol / 7) * 100}%`;
                const width = `${((bar.endCol - bar.startCol + 1) / 7) * 100}%`;
                const top = TOP_OFFSET + bar.row * (BAR_HEIGHT + BAR_GAP);

                return (
                  <button
                    key={`${bar.task.id}-${bi}`}
                    onClick={() => setSelectedTask(bar.task)}
                    className="absolute z-10 flex items-center overflow-hidden px-2 text-[11px] font-medium leading-tight transition-opacity hover:opacity-80"
                    style={{
                      left,
                      width,
                      top: `${top}px`,
                      height: `${BAR_HEIGHT}px`,
                      backgroundColor: color + '30',
                      borderLeft: `3px solid ${color}`,
                      borderRadius: `${bar.isStart ? '6px' : '0'} ${bar.isEnd ? '6px' : '0'} ${bar.isEnd ? '6px' : '0'} ${bar.isStart ? '6px' : '0'}`,
                    }}
                  >
                    <span className="truncate text-foreground">{bar.task.title}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
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
