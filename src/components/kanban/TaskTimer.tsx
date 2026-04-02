import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfilesQuery } from '@/hooks/useProfilesQuery';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Play, Square, Clock, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TimeEntry {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  created_at: string;
}

interface UserSummary {
  user_id: string;
  display_name: string;
  total_seconds: number;
}

interface Props {
  taskId: string;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function TaskTimer({ taskId }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: profilesMap } = useProfilesQuery();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState<UserSummary[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchEntries();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [taskId]);

  useEffect(() => {
    if (activeEntry) {
      const start = new Date(activeEntry.started_at).getTime();
      const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
      tick();
      intervalRef.current = setInterval(tick, 1000);
    } else {
      setElapsed(0);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeEntry]);

  const fetchEntries = async () => {
    const { data } = await supabase
      .from('task_time_entries')
      .select('*')
      .eq('task_id', taskId)
      .order('started_at', { ascending: false });
    if (data) {
      setEntries(data);
      const running = data.find((e) => e.user_id === user?.id && !e.ended_at);
      setActiveEntry(running || null);
    }
  };

  const handleStart = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('task_time_entries')
      .insert({ task_id: taskId, user_id: user.id })
      .select()
      .single();
    if (error) {
      toast({ title: 'Erro ao iniciar timer', variant: 'destructive' });
    } else if (data) {
      setActiveEntry(data);
      fetchEntries();
    }
  };

  const handleStop = async () => {
    if (!activeEntry) return;
    const { error } = await supabase
      .from('task_time_entries')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', activeEntry.id);
    if (error) {
      toast({ title: 'Erro ao parar timer', variant: 'destructive' });
    } else {
      setActiveEntry(null);
      fetchEntries();
    }
  };

  const handleConsolidate = () => {
    const userTotals = new Map<string, number>();
    for (const entry of entries) {
      if (!entry.ended_at) continue;
      const dur = (new Date(entry.ended_at).getTime() - new Date(entry.started_at).getTime()) / 1000;
      userTotals.set(entry.user_id, (userTotals.get(entry.user_id) || 0) + dur);
    }

    const summary: UserSummary[] = Array.from(userTotals.entries()).map(([uid, secs]) => ({
      user_id: uid,
      display_name: profilesMap?.get(uid)?.display_name || 'Usuário',
      total_seconds: secs,
    }));

    setSummaryData(summary);
    setShowSummary(true);
  };

  const completedEntries = entries.filter((e) => e.ended_at);

  return (
    <div>
      <h4 className="flex items-center gap-2 text-sm font-semibold mb-3">
        <Clock className="h-4 w-4" /> Timer de Horas
      </h4>

      <div className="flex items-center gap-3 mb-4">
        {activeEntry ? (
          <>
            <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="font-mono text-lg font-semibold text-primary">{formatDuration(elapsed)}</span>
            </div>
            <Button size="sm" variant="destructive" onClick={handleStop}>
              <Square className="h-3 w-3 mr-1" /> Parar
            </Button>
          </>
        ) : (
          <Button size="sm" onClick={handleStart}>
            <Play className="h-3 w-3 mr-1" /> Iniciar Timer
          </Button>
        )}

        {completedEntries.length > 0 && (
          <Button size="sm" variant="outline" onClick={handleConsolidate}>
            <BarChart3 className="h-3 w-3 mr-1" /> Consolidar Horas
          </Button>
        )}
      </div>

      {showSummary && summaryData.length > 0 && (
        <div className="mb-4 rounded-lg border border-border bg-muted/30 p-3">
          <h5 className="text-xs font-semibold mb-2">Total de Horas por Usuário</h5>
          <div className="space-y-1">
            {summaryData.map((s) => (
              <div key={s.user_id} className="flex justify-between text-sm">
                <span>{s.display_name}</span>
                <span className="font-mono font-medium">{formatDuration(s.total_seconds)}</span>
              </div>
            ))}
            {summaryData.length > 1 && (
              <>
                <div className="border-t border-border my-1" />
                <div className="flex justify-between text-sm font-semibold">
                  <span>Total Geral</span>
                  <span className="font-mono">
                    {formatDuration(summaryData.reduce((a, b) => a + b.total_seconds, 0))}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {completedEntries.length > 0 && (
        <div className="space-y-2 max-h-40 overflow-y-auto">
          <p className="text-xs text-muted-foreground font-medium">Sessões anteriores</p>
          {completedEntries.map((e) => {
            const dur = (new Date(e.ended_at!).getTime() - new Date(e.started_at).getTime()) / 1000;
            return (
              <div key={e.id} className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-xs">
                <span>
                  {format(new Date(e.started_at), "dd/MM 'às' HH:mm", { locale: ptBR })} →{' '}
                  {format(new Date(e.ended_at!), 'HH:mm', { locale: ptBR })}
                </span>
                <span className="font-mono font-medium">{formatDuration(dur)}</span>
              </div>
            );
          })}
        </div>
      )}

      {entries.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">Nenhuma sessão registrada</p>
      )}
    </div>
  );
}
