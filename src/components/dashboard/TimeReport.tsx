import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Clock, ChevronDown, ChevronRight, Users, ListTodo } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface TimeEntry {
  id: string;
  task_id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
}

interface TaskInfo {
  id: string;
  title: string;
}

interface ProfileInfo {
  user_id: string;
  display_name: string;
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

export function TimeReport() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [tasks, setTasks] = useState<Map<string, TaskInfo>>(new Map());
  const [profiles, setProfiles] = useState<Map<string, ProfileInfo>>(new Map());
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [entriesRes, tasksRes, profilesRes] = await Promise.all([
      supabase.from('task_time_entries').select('*').not('ended_at', 'is', null).order('started_at', { ascending: false }),
      supabase.from('tasks').select('id, title'),
      supabase.from('profiles').select('user_id, display_name'),
    ]);

    if (entriesRes.data) setEntries(entriesRes.data);
    if (tasksRes.data) setTasks(new Map(tasksRes.data.map((t) => [t.id, t])));
    if (profilesRes.data) setProfiles(new Map(profilesRes.data.map((p) => [p.user_id, p])));
    setLoading(false);
  };

  const toggleExpand = (key: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Group by task
  const byTask = useMemo(() => {
    const map = new Map<string, { taskTitle: string; totalSeconds: number; users: Map<string, { name: string; totalSeconds: number }> }>();
    for (const e of entries) {
      const dur = getDuration(e);
      if (!map.has(e.task_id)) {
        map.set(e.task_id, { taskTitle: tasks.get(e.task_id)?.title || 'Tarefa removida', totalSeconds: 0, users: new Map() });
      }
      const group = map.get(e.task_id)!;
      group.totalSeconds += dur;
      if (!group.users.has(e.user_id)) {
        group.users.set(e.user_id, { name: profiles.get(e.user_id)?.display_name || 'Usuário', totalSeconds: 0 });
      }
      group.users.get(e.user_id)!.totalSeconds += dur;
    }
    return Array.from(map.entries())
      .map(([id, data]) => ({ id, ...data, userList: Array.from(data.users.entries()).map(([uid, d]) => ({ uid, ...d })) }))
      .sort((a, b) => b.totalSeconds - a.totalSeconds);
  }, [entries, tasks, profiles]);

  // Group by user
  const byUser = useMemo(() => {
    const map = new Map<string, { userName: string; totalSeconds: number; tasks: Map<string, { title: string; totalSeconds: number }> }>();
    for (const e of entries) {
      const dur = getDuration(e);
      if (!map.has(e.user_id)) {
        map.set(e.user_id, { userName: profiles.get(e.user_id)?.display_name || 'Usuário', totalSeconds: 0, tasks: new Map() });
      }
      const group = map.get(e.user_id)!;
      group.totalSeconds += dur;
      if (!group.tasks.has(e.task_id)) {
        group.tasks.set(e.task_id, { title: tasks.get(e.task_id)?.title || 'Tarefa removida', totalSeconds: 0 });
      }
      group.tasks.get(e.task_id)!.totalSeconds += dur;
    }
    return Array.from(map.entries())
      .map(([id, data]) => ({ id, ...data, taskList: Array.from(data.tasks.entries()).map(([tid, d]) => ({ tid, ...d })) }))
      .sort((a, b) => b.totalSeconds - a.totalSeconds);
  }, [entries, tasks, profiles]);

  const grandTotal = useMemo(() => entries.reduce((sum, e) => sum + getDuration(e), 0), [entries]);

  if (loading) {
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
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Clock className="h-5 w-5" /> Relatório de Horas
        </h3>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-sm">
          <span className="text-muted-foreground">Total Geral:</span>
          <span className="font-mono font-semibold text-foreground">{formatDuration(grandTotal)}</span>
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
                <button
                  onClick={() => toggleExpand(`task-${group.id}`)}
                  className="flex w-full items-center justify-between px-4 py-3 text-sm hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {expandedRows.has(`task-${group.id}`) ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
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
          </div>
        </TabsContent>

        <TabsContent value="by-user">
          <div className="space-y-1">
            {byUser.map((group) => (
              <div key={group.id} className="rounded-lg border border-border overflow-hidden">
                <button
                  onClick={() => toggleExpand(`user-${group.id}`)}
                  className="flex w-full items-center justify-between px-4 py-3 text-sm hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {expandedRows.has(`user-${group.id}`) ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
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
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
