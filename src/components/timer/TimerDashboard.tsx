import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Clock, Activity, CalendarDays } from 'lucide-react';
import { format, subDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Session {
  id: string;
  duration_seconds: number;
  description: string | null;
  created_at: string;
}

interface TimerDashboardProps {
  sessions: Session[];
}

const formatHM = (totalSeconds: number) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h === 0) return `${m}min`;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
};

const TimerDashboard = ({ sessions }: TimerDashboardProps) => {
  const totalSeconds = useMemo(
    () => sessions.reduce((sum, s) => sum + s.duration_seconds, 0),
    [sessions]
  );

  const byActivity = useMemo(() => {
    const map = new Map<string, number>();
    sessions.forEach((s) => {
      const key = s.description?.trim() || 'Sem descrição';
      map.set(key, (map.get(key) || 0) + s.duration_seconds);
    });
    return Array.from(map.entries())
      .map(([name, seconds]) => ({ name, seconds, label: formatHM(seconds) }))
      .sort((a, b) => b.seconds - a.seconds)
      .slice(0, 10);
  }, [sessions]);

  const byDay = useMemo(() => {
    const today = startOfDay(new Date());
    const days: { date: string; key: string; seconds: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = subDays(today, i);
      days.push({
        date: format(d, 'dd/MM', { locale: ptBR }),
        key: format(d, 'yyyy-MM-dd'),
        seconds: 0,
      });
    }
    const dayMap = new Map(days.map((d) => [d.key, d]));
    sessions.forEach((s) => {
      const key = format(new Date(s.created_at), 'yyyy-MM-dd');
      const entry = dayMap.get(key);
      if (entry) entry.seconds += s.duration_seconds;
    });
    return days;
  }, [sessions]);

  const activityConfig = { seconds: { label: 'Tempo', color: 'hsl(var(--primary))' } };
  const dayConfig = { seconds: { label: 'Tempo', color: 'hsl(var(--primary))' } };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-primary/10">
              <Clock className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tempo Total Registrado</p>
              <p className="text-3xl font-bold text-foreground">{formatHM(totalSeconds)}</p>
              <p className="text-xs text-muted-foreground">{sessions.length} sessões</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" /> Tempo por Atividade
          </CardTitle>
        </CardHeader>
        <CardContent>
          {byActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma sessão registrada.</p>
          ) : (
            <ChartContainer config={activityConfig} className="h-[300px] w-full">
              <BarChart data={byActivity} layout="vertical" margin={{ left: 8, right: 40 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={120}
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <XAxis
                  type="number"
                  tickFormatter={(v) => formatHM(v)}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => formatHM(value as number)}
                    />
                  }
                />
                <Bar dataKey="seconds" fill="var(--color-seconds)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-4 w-4" /> Tempo por Dia (últimos 14 dias)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={dayConfig} className="h-[250px] w-full">
            <BarChart data={byDay} margin={{ left: 0, right: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={(v) => formatHM(v)}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={60}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => formatHM(value as number)}
                  />
                }
              />
              <Bar dataKey="seconds" fill="var(--color-seconds)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default TimerDashboard;
