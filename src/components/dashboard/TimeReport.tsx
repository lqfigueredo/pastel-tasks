import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTasksQuery } from '@/hooks/useTasksQuery';
import { useProfilesQuery } from '@/hooks/useProfilesQuery';
import { Clock, ChevronDown, ChevronRight, Users, ListTodo, Download, CalendarIcon, FileText, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface TimeEntry {
  id: string;
  task_id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getDuration(entry: TimeEntry): number {
  if (!entry.ended_at) return 0;
  return (new Date(entry.ended_at).getTime() - new Date(entry.started_at).getTime()) / 1000;
}

function DateFilter({ label, date, onSelect }: { label: string; date: Date | undefined; onSelect: (d: Date | undefined) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("gap-1.5 text-xs", !date && "text-muted-foreground")}>
          <CalendarIcon className="h-3.5 w-3.5" />
          {date ? format(date, 'dd/MM/yyyy') : label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={date} onSelect={onSelect} initialFocus className="p-3 pointer-events-auto" />
      </PopoverContent>
    </Popover>
  );
}

export function TimeReport() {
  const { user } = useAuth();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  // Use shared hooks instead of independent fetches
  const { data: tasksData } = useTasksQuery();
  const { data: profilesMap } = useProfilesQuery();

  const tasksMap = useMemo(() => {
    const map = new Map<string, { id: string; title: string }>();
    if (tasksData) {
      for (const t of tasksData.tasks) map.set(t.id, { id: t.id, title: t.title });
    }
    return map;
  }, [tasksData]);

  const profilesLookup = useMemo(() => {
    const map = new Map<string, { user_id: string; display_name: string }>();
    if (profilesMap) {
      for (const [uid, p] of profilesMap) map.set(uid, { user_id: p.user_id, display_name: p.display_name });
    }
    return map;
  }, [profilesMap]);

  // Only fetch time entries independently (unique to this component)
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['task-time-entries'],
    queryFn: async () => {
      const { data } = await supabase
        .from('task_time_entries')
        .select('*')
        .not('ended_at', 'is', null)
        .order('started_at', { ascending: false });
      return (data || []) as TimeEntry[];
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      const d = new Date(e.started_at);
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (d < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }
      return true;
    });
  }, [entries, startDate, endDate]);

  const toggleExpand = (key: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const byTask = useMemo(() => {
    const map = new Map<string, { taskTitle: string; totalSeconds: number; users: Map<string, { name: string; totalSeconds: number }> }>();
    for (const e of filteredEntries) {
      const dur = getDuration(e);
      if (!map.has(e.task_id)) map.set(e.task_id, { taskTitle: tasksMap.get(e.task_id)?.title || 'Tarefa removida', totalSeconds: 0, users: new Map() });
      const group = map.get(e.task_id)!;
      group.totalSeconds += dur;
      if (!group.users.has(e.user_id)) group.users.set(e.user_id, { name: profilesLookup.get(e.user_id)?.display_name || 'Usuário', totalSeconds: 0 });
      group.users.get(e.user_id)!.totalSeconds += dur;
    }
    return Array.from(map.entries())
      .map(([id, data]) => ({ id, ...data, userList: Array.from(data.users.entries()).map(([uid, d]) => ({ uid, ...d })) }))
      .sort((a, b) => b.totalSeconds - a.totalSeconds);
  }, [filteredEntries, tasksMap, profilesLookup]);

  const byUser = useMemo(() => {
    const map = new Map<string, { userName: string; totalSeconds: number; tasks: Map<string, { title: string; totalSeconds: number }> }>();
    for (const e of filteredEntries) {
      const dur = getDuration(e);
      if (!map.has(e.user_id)) map.set(e.user_id, { userName: profilesLookup.get(e.user_id)?.display_name || 'Usuário', totalSeconds: 0, tasks: new Map() });
      const group = map.get(e.user_id)!;
      group.totalSeconds += dur;
      if (!group.tasks.has(e.task_id)) group.tasks.set(e.task_id, { title: tasksMap.get(e.task_id)?.title || 'Tarefa removida', totalSeconds: 0 });
      group.tasks.get(e.task_id)!.totalSeconds += dur;
    }
    return Array.from(map.entries())
      .map(([id, data]) => ({ id, ...data, taskList: Array.from(data.tasks.entries()).map(([tid, d]) => ({ tid, ...d })) }))
      .sort((a, b) => b.totalSeconds - a.totalSeconds);
  }, [filteredEntries, tasksMap, profilesLookup]);

  const grandTotal = useMemo(() => filteredEntries.reduce((sum, e) => sum + getDuration(e), 0), [filteredEntries]);

  const exportCSV = () => {
    const rows = [['Usuário', 'Tarefa', 'Início', 'Fim', 'Duração (hh:mm:ss)']];
    for (const e of filteredEntries) {
      rows.push([
        profilesLookup.get(e.user_id)?.display_name || 'Usuário',
        tasksMap.get(e.task_id)?.title || 'Tarefa removida',
        format(new Date(e.started_at), 'dd/MM/yyyy HH:mm:ss'),
        e.ended_at ? format(new Date(e.ended_at), 'dd/MM/yyyy HH:mm:ss') : '',
        formatDuration(getDuration(e)),
      ]);
    }
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-horas${startDate ? '-de-' + format(startDate, 'yyyy-MM-dd') : ''}${endDate ? '-ate-' + format(endDate, 'yyyy-MM-dd') : ''}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">Carregando relatório...</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-2">
          <Clock className="h-5 w-5" /> Relatório de Horas
        </h3>
        <p className="text-sm text-muted-foreground">Nenhuma sessão de trabalho registrada ainda.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Clock className="h-5 w-5" /> Relatório de Horas
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <DateFilter label="Data Início" date={startDate} onSelect={setStartDate} />
          <DateFilter label="Data Fim" date={endDate} onSelect={setEndDate} />
          {(startDate || endDate) && (
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setStartDate(undefined); setEndDate(undefined); }}>
              Limpar
            </Button>
          )}
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-sm">
            <span className="text-muted-foreground">Total:</span>
            <span className="font-mono font-semibold text-foreground">{formatDuration(grandTotal)}</span>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={exportCSV}>
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
        </div>
      </div>

      <Tabs defaultValue="by-task" className="p-4">
        <TabsList className="mb-4">
          <TabsTrigger value="by-task" className="gap-1.5">
            <ListTodo className="h-3.5 w-3.5" /> Por Tarefa
          </TabsTrigger>
          <TabsTrigger value="by-user" className="gap-1.5">
            <Users className="h-3.5 w-3.5" /> Por Usuário
          </TabsTrigger>
        </TabsList>

        <TabsContent value="by-task">
          <div className="space-y-1">
            {byTask.map((group) => (
              <div key={group.id} className="rounded-lg border border-border overflow-hidden">
                <button onClick={() => toggleExpand(`task-${group.id}`)} className="flex w-full items-center justify-between px-4 py-3 text-sm hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2">
                    {expandedRows.has(`task-${group.id}`) ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    <span className="font-medium text-foreground truncate max-w-[400px]">{group.taskTitle}</span>
                    <span className="text-xs text-muted-foreground">({group.userList.length} usuário{group.userList.length !== 1 ? 's' : ''})</span>
                  </div>
                  <span className="font-mono font-semibold text-foreground">{formatDuration(group.totalSeconds)}</span>
                </button>
                {expandedRows.has(`task-${group.id}`) && (
                  <div className="border-t border-border bg-muted/20 px-4 py-2 space-y-1">
                    {group.userList.map((u) => (
                      <div key={u.uid} className="flex items-center justify-between py-1 text-sm">
                        <span className="text-muted-foreground pl-6">{u.name}</span>
                        <span className="font-mono text-foreground">{formatDuration(u.totalSeconds)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {byTask.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum registro no período selecionado.</p>}
          </div>
        </TabsContent>

        <TabsContent value="by-user">
          <div className="space-y-1">
            {byUser.map((group) => (
              <div key={group.id} className="rounded-lg border border-border overflow-hidden">
                <button onClick={() => toggleExpand(`user-${group.id}`)} className="flex w-full items-center justify-between px-4 py-3 text-sm hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2">
                    {expandedRows.has(`user-${group.id}`) ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    <span className="font-medium text-foreground">{group.userName}</span>
                    <span className="text-xs text-muted-foreground">({group.taskList.length} tarefa{group.taskList.length !== 1 ? 's' : ''})</span>
                  </div>
                  <span className="font-mono font-semibold text-foreground">{formatDuration(group.totalSeconds)}</span>
                </button>
                {expandedRows.has(`user-${group.id}`) && (
                  <div className="border-t border-border bg-muted/20 px-4 py-2 space-y-1">
                    {group.taskList.map((t) => (
                      <div key={t.tid} className="flex items-center justify-between py-1 text-sm">
                        <span className="text-muted-foreground pl-6 truncate max-w-[400px]">{t.title}</span>
                        <span className="font-mono text-foreground">{formatDuration(t.totalSeconds)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {byUser.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum registro no período selecionado.</p>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
