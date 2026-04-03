import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Play, Square, Check, Clock, Trash2, Pause } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type TimerState = 'idle' | 'running' | 'paused' | 'finished';

const playAlertSound = () => {
  const ctx = new AudioContext();
  const playBeep = (time: number, freq: number, dur: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + dur);
    osc.start(time);
    osc.stop(time + dur);
  };
  for (let i = 0; i < 5; i++) {
    playBeep(ctx.currentTime + i * 0.4, 880, 0.25);
  }
  return ctx;
};

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
  const [minutes, setMinutes] = useState(25);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [timerState, setTimerState] = useState<TimerState>('idle');
  const [description, setDescription] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const intervalRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const totalSecondsRef = useRef(0);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['timer-sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('timer_sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
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

  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => () => stopInterval(), [stopInterval]);

  const startInterval = () => {
    intervalRef.current = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          stopInterval();
          setTimerState('finished');
          audioCtxRef.current = playAlertSound();
          return 0;
        }
        return prev - 1;
      });
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
  };

  const handleStart = () => {
    const total = minutes * 60;
    totalSecondsRef.current = total;
    setSecondsLeft(total);
    setElapsedSeconds(0);
    setTimerState('running');
    startInterval();
  };

  const handlePause = () => {
    stopInterval();
    setTimerState('paused');
  };

  const handleResume = () => {
    setTimerState('running');
    startInterval();
  };

  const handleStop = () => {
    stopInterval();
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    setTimerState('finished');
  };

  const handleFinish = () => {
    const used = timerState === 'finished' ? elapsedSeconds || totalSecondsRef.current : elapsedSeconds;
    saveMutation.mutate({ duration: used, desc: description });
    setTimerState('idle');
    setDescription('');
    setSecondsLeft(0);
    setElapsedSeconds(0);
  };

  const handleCancel = () => {
    stopInterval();
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    setTimerState('idle');
    setDescription('');
    setSecondsLeft(0);
    setElapsedSeconds(0);
  };

  const progress = timerState !== 'idle' && totalSecondsRef.current > 0
    ? ((totalSecondsRef.current - secondsLeft) / totalSecondsRef.current) * 100
    : 0;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground">Temporizador</h1>

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
              <Button onClick={handleStart} className="w-full gap-2">
                <Play className="h-4 w-4" /> Iniciar
              </Button>
            </>
          )}

          {timerState === 'running' && (
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
                <span className="text-4xl font-mono font-bold text-foreground">{formatTime(secondsLeft)}</span>
              </div>
              <Button variant="destructive" onClick={handleStop} className="gap-2">
                <Square className="h-4 w-4" /> Interromper
              </Button>
            </div>
          )}

          {timerState === 'finished' && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-lg font-semibold text-foreground">Tempo finalizado!</p>
                <p className="text-muted-foreground">
                  Duração: {formatDuration(elapsedSeconds || totalSecondsRef.current)}
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
    </div>
  );
};

export default Timer;
