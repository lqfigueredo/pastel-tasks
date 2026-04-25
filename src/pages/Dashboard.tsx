import { useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useTasksQuery, useInvalidateTasks } from '@/hooks/useTasksQuery';
import { useStatusesQuery } from '@/hooks/useStatusesQuery';
import type { Task } from '@/types/kanban';
import { TaskTooltip } from '@/components/dashboard/TaskTooltip';
import { TaskDetailDialog } from '@/components/kanban/TaskDetailDialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, CheckCircle2, UserCircle } from 'lucide-react';
import { HelpButton } from '@/components/HelpButton';
import { Skeleton } from '@/components/ui/skeleton';
const TimeReport = lazy(() => import('@/components/dashboard/TimeReport').then(m => ({ default: m.TimeReport })));
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
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
import { getCurrentLocale } from '@/lib/date';
const MAX_BAR_SLOTS = 3;
const BAR_HEIGHT = 22;
const BAR_GAP = 2;
const TOP_OFFSET = 28;

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

type TaskFilter = 'all' | 'created' | 'assigned';

export default function Dashboard() {
  const { t } = useTranslation('dashboard');
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState<TaskFilter>('all');
  const WEEKDAYS = t('weekdays', { returnObjects: true }) as string[];

  const { data: tasksData } = useTasksQuery();
  const { data: statuses = [] } = useStatusesQuery();
  const invalidateTasks = useInvalidateTasks();

  const allTasks: Task[] = tasksData?.tasks || [];
  const myAssignedIds = useMemo(() => {
    if (!user) return new Set<string>();
    return new Set(
      allTasks
        .filter((t) => t.assignees.some((a) => a.user_id === user.id))
        .map((t) => t.id)
    );
  }, [allTasks, user]);

  const tasks = useMemo(() => {
    if (!user) return allTasks;
    if (filter === 'created') return allTasks.filter((t) => t.created_by === user.id);
    if (filter === 'assigned') return allTasks.filter((t) => myAssignedIds.has(t.id));
    return allTasks;
  }, [allTasks, filter, user, myAssignedIds]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const statusColorMap = useMemo(
    () => new Map(statuses.map((s) => [s.id, s.color])),
    [statuses]
  );
  const statusNameMap = useMemo(
    () => new Map(statuses.map((s) => [s.id, s.name])),
    [statuses]
  );

  // Pre-index single-day tasks by date key — avoids filtering 42 times per render
  const singleDayTasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      if (isMultiDay(t)) continue;
      const interval = getTaskInterval(t);
      if (!interval) continue;
      const key = format(interval.start, 'yyyy-MM-dd');
      const arr = map.get(key);
      if (arr) arr.push(t);
      else map.set(key, [t]);
    }
    return map;
  }, [tasks]);

  // Pre-index completed tasks by actual_end_date
  const completedTasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      if (!t.actual_end_date) continue;
      const key = t.actual_end_date.slice(0, 10);
      const arr = map.get(key);
      if (arr) arr.push(t);
      else map.set(key, [t]);
    }
    return map;
  }, [tasks]);

  const weeks = useMemo(() => {
    const result: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      result.push(days.slice(i, i + 7));
    }
    return result;
  }, [days]);

  const computeBarsForWeek = useCallback(
    (weekDays: Date[]): { bars: BarSegment[]; overflow: Map<number, number> } => {
      const weekStart = weekDays[0];
      const weekEnd = weekDays[6];

      const candidates: { task: Task; startCol: number; endCol: number; isStart: boolean; isEnd: boolean; span: number }[] = [];

      for (const task of tasks) {
        if (!isMultiDay(task)) continue;
        const interval = getTaskInterval(task);
        if (!interval) continue;
        if (isAfter(interval.start, weekEnd) || isBefore(interval.end, weekStart)) continue;

        const clampedStart = dateMax([interval.start, weekStart]);
        const clampedEnd = dateMin([interval.end, weekEnd]);
        const startCol = differenceInDays(clampedStart, weekStart);
        const endCol = differenceInDays(clampedEnd, weekStart);

        candidates.push({
          task, startCol, endCol,
          isStart: isSameDay(clampedStart, interval.start),
          isEnd: isSameDay(clampedEnd, interval.end),
          span: endCol - startCol + 1,
        });
      }

      candidates.sort((a, b) => b.span - a.span);

      const bars: BarSegment[] = [];
      const overflow = new Map<number, number>();
      const slots: { startCol: number; endCol: number }[][] = [];

      for (const c of candidates) {
        let placed = false;
        for (let row = 0; row < MAX_BAR_SLOTS; row++) {
          if (!slots[row]) slots[row] = [];
          const conflict = slots[row].some((s) => c.startCol <= s.endCol && c.endCol >= s.startCol);
          if (!conflict) {
            slots[row].push({ startCol: c.startCol, endCol: c.endCol });
            bars.push({ task: c.task, startCol: c.startCol, endCol: c.endCol, row, isStart: c.isStart, isEnd: c.isEnd });
            placed = true;
            break;
          }
        }
        if (!placed) {
          for (let col = c.startCol; col <= c.endCol; col++) {
            overflow.set(col, (overflow.get(col) || 0) + 1);
          }
        }
      }

      return { bars, overflow };
    },
    [tasks]
  );

  const getSingleDayTasks = useCallback(
    (day: Date) => singleDayTasksByDate.get(format(day, 'yyyy-MM-dd')) || [],
    [singleDayTasksByDate]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
            <HelpButton pageKey="dashboard" />
          </div>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-border bg-muted/50 p-1">
          {([
            { value: 'all' as TaskFilter, label: t('filter.all') },
            { value: 'created' as TaskFilter, label: t('filter.created') },
            { value: 'assigned' as TaskFilter, label: t('filter.assigned') },
          ]).map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === opt.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4 rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground/70">{t('legend.title')}</span>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-4 w-6 rounded border-l-[3px] border-solid border-primary bg-primary/20" />
            <span>{t('legend.created')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-0.5">
              <span className="inline-block h-4 w-6 rounded border-l-[3px] border-dashed border-primary bg-primary/20" />
              <UserCircle className="h-3 w-3 text-primary" />
            </span>
            <span>{t('legend.assigned')}</span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth((m) => subMonths(m, 1))}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-lg font-semibold capitalize text-foreground">
            {format(currentMonth, 'MMMM yyyy', { locale: getCurrentLocale() })}
          </h2>
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth((m) => addMonths(m, 1))}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        <div className="grid grid-cols-7 border-b border-border">
          {WEEKDAYS.map((d) => (
            <div key={d} className="px-2 py-2 text-center text-xs font-medium text-muted-foreground">
              {d}
            </div>
          ))}
        </div>

        {weeks.map((weekDays, wi) => {
          const { bars, overflow } = computeBarsForWeek(weekDays);
          const maxRow = bars.length > 0 ? Math.max(...bars.map((b) => b.row)) : -1;
          const barsAreaHeight = (maxRow + 1) * (BAR_HEIGHT + BAR_GAP);
          const cellMinHeight = TOP_OFFSET + barsAreaHeight + 30;

          return (
            <div key={wi} className="relative grid grid-cols-7">
              {weekDays.map((day, di) => {
                const inMonth = isSameMonth(day, currentMonth);
                const today = isToday(day);
                const singleTasks = getSingleDayTasks(day);
                const completedOnDay = completedTasksByDate.get(format(day, 'yyyy-MM-dd')) || [];
                const overflowCount = overflow.get(di) || 0;

                return (
                  <div
                    key={di}
                    className={`border-b border-r border-border p-1.5 ${!inMonth ? 'bg-muted/30' : ''} ${today ? 'bg-accent/20' : ''}`}
                    style={{ minHeight: `${cellMinHeight}px` }}
                  >
                    <span
                      className={`mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                        today ? 'bg-primary text-primary-foreground' : inMonth ? 'text-foreground' : 'text-muted-foreground/50'
                      }`}
                    >
                      {format(day, 'd')}
                    </span>

                    <div style={{ marginTop: `${barsAreaHeight}px` }} className="space-y-0.5">
                      {singleTasks.map((task) => {
                        const isAssignedByOther = myAssignedIds.has(task.id) && task.created_by !== user?.id;
                        return (
                          <TaskTooltip key={task.id} task={task} statusName={statusNameMap.get(task.status_id) || t('noStatus')} statusColor={statusColorMap.get(task.status_id) || 'hsl(var(--muted))'}>
                            <button onClick={() => setSelectedTask(task)} className="flex w-full items-center gap-1 rounded px-1.5 py-0.5 text-left text-[11px] leading-tight transition-colors hover:bg-accent/40">
                              <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: statusColorMap.get(task.status_id) || 'hsl(var(--muted))' }} />
                              {isAssignedByOther && <UserCircle className="h-2.5 w-2.5 shrink-0 text-primary" />}
                              <span className="truncate text-foreground">{task.title}</span>
                            </button>
                          </TaskTooltip>
                        );
                      })}
                      {overflowCount > 0 && (
                        <span className="block px-1.5 text-[10px] text-muted-foreground">{t('moreCount', { count: overflowCount })}</span>
                      )}
                      {completedOnDay.map((task) => {
                        const color = statusColorMap.get(task.status_id) || 'hsl(var(--muted))';
                        const isAssignedByOther = myAssignedIds.has(task.id) && task.created_by !== user?.id;
                        return (
                          <TaskTooltip key={`done-${task.id}`} task={task} statusName={statusNameMap.get(task.status_id) || t('noStatus')} statusColor={color}>
                            <button onClick={() => setSelectedTask(task)} className="flex w-full items-center gap-1 rounded px-1.5 py-0.5 text-left text-[11px] font-semibold leading-tight transition-colors hover:bg-accent/40" style={{ backgroundColor: color + '25' }}>
                              <CheckCircle2 className="h-3 w-3 shrink-0" style={{ color }} />
                              {isAssignedByOther && <UserCircle className="h-2.5 w-2.5 shrink-0 text-primary" />}
                              <span className="truncate text-foreground">{task.title}</span>
                            </button>
                          </TaskTooltip>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {bars.map((bar, bi) => {
                const color = statusColorMap.get(bar.task.status_id) || 'hsl(var(--muted))';
                const isAssignedByOther = myAssignedIds.has(bar.task.id) && bar.task.created_by !== user?.id;
                const left = `${(bar.startCol / 7) * 100}%`;
                const width = `${((bar.endCol - bar.startCol + 1) / 7) * 100}%`;
                const top = TOP_OFFSET + bar.row * (BAR_HEIGHT + BAR_GAP);

                return (
                  <TaskTooltip key={`${bar.task.id}-${bi}`} task={bar.task} statusName={statusNameMap.get(bar.task.status_id) || t('noStatus')} statusColor={color}>
                    <button
                      onClick={() => setSelectedTask(bar.task)}
                      className="absolute z-10 flex items-center overflow-hidden px-2 text-[11px] font-medium leading-tight transition-opacity hover:opacity-80"
                      style={{
                        left, width, top: `${top}px`, height: `${BAR_HEIGHT}px`,
                        backgroundColor: color + '30',
                        borderLeft: `3px ${isAssignedByOther ? 'dashed' : 'solid'} ${color}`,
                        borderRadius: `${bar.isStart ? '6px' : '0'} ${bar.isEnd ? '6px' : '0'} ${bar.isEnd ? '6px' : '0'} ${bar.isStart ? '6px' : '0'}`,
                      }}
                    >
                      {isAssignedByOther && <UserCircle className="mr-1 h-3 w-3 shrink-0 text-primary" />}
                      <span className="truncate text-foreground">{bar.task.title}</span>
                    </button>
                  </TaskTooltip>
                );
              })}
            </div>
          );
        })}
      </div>

      <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
        <TimeReport />
      </Suspense>

      {selectedTask && (
        <TaskDetailDialog
          task={selectedTask}
          allStatuses={statuses}
          open={!!selectedTask}
          onOpenChange={(open) => { if (!open) setSelectedTask(null); }}
          onRefresh={invalidateTasks}
        />
      )}
    </div>
  );
}
