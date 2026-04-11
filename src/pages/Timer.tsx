import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTimer } from '@/contexts/TimerContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play, Square, Check, Clock, Trash2, Pause, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import TimerDashboard from '@/components/timer/TimerDashboard';

const formatTime = (totalSeconds: number) => {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return s > 0 ? `${m}min ${s}s` : `${m}min`;
};

const Timer = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const {
    timerState, secondsLeft, elapsedSeconds, minutes, totalSeconds,
    setMinutes, start, pause, resume, stop, finish, cancel,
  } = useTimer();
  const [description, setDescription] = useState('');

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['timer-sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('timer_sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async ({ duration, desc }: { duration: number; desc: string }) => {
      const { error } = await supabase.from('timer_sessions').insert({
        user_id: user!.id,
        duration_seconds: duration,
        description: desc || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timer-sessions'] });
      toast.success('Sessão salva com sucesso!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('timer_sessions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timer-sessions'] });
      toast.success('Sessão removida.');
    },
  });

  const handleFinish = () => {
    const { duration } = finish(description);
    saveMutation.mutate({ duration, desc: description });
    setDescription('');
  };

  const handleCancel = () => {
    cancel();
    setDescription('');
  };

  const progress = timerState !== 'idle' && totalSeconds > 0
    ? ((totalSeconds - secondsLeft) / totalSeconds) * 100
    : 0;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground">Temporizador</h1>

      <Tabs defaultValue="timer" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="timer" className="gap-2">
            <Clock className="h-4 w-4" /> Temporizador
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="gap-2">
            <BarChart3 className="h-4 w-4" /> Dashboard
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timer" className="space-y-6 mt-6">
      <Card>
        <CardContent className="pt-6 space-y-6">
          {timerState === 'idle' && (
            <>
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">
                  Tempo: {minutes} minuto{minutes > 1 ? 's' : ''}
                </label>
                <Slider
                  value={[minutes]}
                  onValueChange={([v]) => setMinutes(v)}
                  min={1}
                  max={50}
                  step={1}
                />
              </div>
              <Button onClick={start} className="w-full gap-2">
                <Play className="h-4 w-4" /> Iniciar
              </Button>
            </>
          )}

          {(timerState === 'running' || timerState === 'paused') && (
            <div className="flex flex-col items-center gap-6">
              <div className="relative w-48 h-48 flex items-center justify-center">
                <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" strokeWidth="6" className="stroke-muted" />
                  <circle
                    cx="50" cy="50" r="45" fill="none" strokeWidth="6"
                    className="stroke-primary transition-all duration-1000"
                    strokeDasharray={`${2 * Math.PI * 45}`}
                    strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="flex flex-col items-center">
                  <span className="text-4xl font-mono font-bold text-foreground">{formatTime(secondsLeft)}</span>
                  {timerState === 'paused' && (
                    <span className="text-sm text-muted-foreground mt-1">Pausado</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {timerState === 'running' ? (
                  <Button variant="outline" onClick={pause} className="gap-2">
                    <Pause className="h-4 w-4" /> Pausar
                  </Button>
                ) : (
                  <Button onClick={resume} className="gap-2">
                    <Play className="h-4 w-4" /> Retomar
                  </Button>
                )}
                <Button variant="destructive" onClick={stop} className="gap-2">
                  <Square className="h-4 w-4" /> Interromper
                </Button>
              </div>
            </div>
          )}

          {timerState === 'finished' && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-lg font-semibold text-foreground">Tempo finalizado!</p>
                <p className="text-muted-foreground">
                  Duração: {formatDuration(elapsedSeconds || totalSeconds)}
                </p>
              </div>
              <Textarea
                placeholder="Descrição do tempo utilizado (opcional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleCancel} className="flex-1">
                  Descartar
                </Button>
                <Button onClick={handleFinish} disabled={saveMutation.isPending} className="flex-1 gap-2">
                  <Check className="h-4 w-4" /> Finalizar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" /> Histórico
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Carregando...</p>
          ) : sessions.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhuma sessão registrada.</p>
          ) : (
            <div className="space-y-3">
              {sessions.map((s) => (
                <div key={s.id} className="flex items-start justify-between gap-3 border-b border-border pb-3 last:border-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-foreground">{formatDuration(s.duration_seconds)}</span>
                      <span className="text-muted-foreground">
                        {format(new Date(s.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    {s.description && (
                      <p className="text-sm text-muted-foreground mt-1 truncate">{s.description}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteMutation.mutate(s.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="dashboard" className="mt-6">
          <TimerDashboard sessions={sessions} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Timer;
