import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { AssigneeSelector } from './AssigneeSelector';
import { X, Users, Repeat } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskCreated?: () => void;
}

export function CreateTaskDialog({ open, onOpenChange, onTaskCreated }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [statusId, setStatusId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [estimatedDate, setEstimatedDate] = useState('');
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<{ id: string; name: string }[]>([]);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [userTeam, setUserTeam] = useState<{ id: string; name: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState('weekly');
  const [recurrenceDay, setRecurrenceDay] = useState<number>(1);

  useEffect(() => {
    if (open) {
      supabase.from('task_statuses').select('id, name').is('deleted_at', null).order('position').then(({ data }) => {
        if (data) {
          setStatuses(data);
          if (data.length > 0 && !statusId) setStatusId(data[0].id);
        }
      });
      // Check if user has a team
      if (user) {
        supabase.from('team_members').select('team_id').eq('user_id', user.id).limit(1).maybeSingle().then(async ({ data: membership }) => {
          if (membership) {
            const { data: team } = await supabase.from('teams').select('id, name').eq('id', membership.team_id).single();
            setUserTeam(team || null);
          } else {
            setUserTeam(null);
          }
        });
      }
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim()) return;
    setSaving(true);

    if (isRecurring) {
      // Calculate next_run_date based on recurrence type
      const today = new Date();
      let nextRun: Date;
      if (recurrenceType === 'weekly') {
        const currentDay = today.getDay();
        const diff = (recurrenceDay - currentDay + 7) % 7 || 7;
        nextRun = new Date(today);
        nextRun.setDate(today.getDate() + diff);
      } else if (recurrenceType === 'monthly') {
        nextRun = new Date(today.getFullYear(), today.getMonth() + 1, Math.min(recurrenceDay, 28));
      } else {
        nextRun = new Date(today.getFullYear() + 1, 0, Math.min(recurrenceDay, 365));
        // For yearly, recurrenceDay is month (0-11), use day 1
        nextRun = new Date(today.getFullYear() + (today.getMonth() >= recurrenceDay ? 1 : 0), recurrenceDay, 1);
      }

      const nextRunStr = nextRun.toISOString().split('T')[0];

      const { error } = await supabase.from('recurring_tasks').insert({
        title: title.trim(),
        description: description.trim() || null,
        status_id: statusId,
        created_by: user.id,
        team_id: teamId,
        assignee_ids: assigneeIds,
        recurrence_type: recurrenceType,
        recurrence_day: recurrenceDay,
        next_run_date: nextRunStr,
      });

      if (error) {
        toast({ title: 'Erro ao criar recorrência', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Tarefa recorrente criada!' });
        resetForm();
        onOpenChange(false);
        onTaskCreated?.();
      }
    } else {
      const { data, error } = await supabase.from('tasks').insert({
        title: title.trim(),
        description: description.trim() || null,
        status_id: statusId,
        start_date: startDate || null,
        estimated_delivery_date: estimatedDate || null,
        created_by: user.id,
        team_id: teamId,
      }).select('id').single();

      if (error) {
        toast({ title: 'Erro ao criar tarefa', description: error.message, variant: 'destructive' });
      } else {
        if (data && assigneeIds.length > 0) {
          await supabase.from('task_assignees').insert(
            assigneeIds.map((user_id) => ({ task_id: data.id, user_id }))
          );
        }
        toast({ title: 'Tarefa criada!' });
        resetForm();
        onOpenChange(false);
        onTaskCreated?.();
      }
    }
    setSaving(false);
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setStartDate('');
    setEstimatedDate('');
    setAssigneeIds([]);
    setTeamId(null);
    setIsRecurring(false);
    setRecurrenceType('weekly');
    setRecurrenceDay(1);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/60" onClick={() => onOpenChange(false)} />
      <div className="relative z-50 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl animate-fade-in">
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </button>
        <h2 className="text-lg font-semibold mb-1">Nova Tarefa</h2>
        <p className="text-sm text-muted-foreground mb-4">Preencha os detalhes da nova tarefa</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Título *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título da tarefa" required />
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Breve descrição..." rows={3} />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={statusId} onValueChange={setStatusId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {statuses.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Responsáveis</Label>
            <AssigneeSelector selectedIds={assigneeIds} onChange={setAssigneeIds} />
          </div>
          {userTeam && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="team-task"
                checked={teamId === userTeam.id}
                onCheckedChange={(checked) => setTeamId(checked ? userTeam.id : null)}
              />
              <label htmlFor="team-task" className="text-sm flex items-center gap-1.5 cursor-pointer">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                Associar ao time <span className="font-medium">{userTeam.name}</span>
              </label>
            </div>
          )}

          {/* Recurring task toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
            <div className="flex items-center gap-2">
              <Repeat className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="recurring-toggle" className="cursor-pointer text-sm">Tarefa recorrente</Label>
            </div>
            <Switch id="recurring-toggle" checked={isRecurring} onCheckedChange={setIsRecurring} />
          </div>

          {isRecurring ? (
            <div className="space-y-3 rounded-lg border border-border/50 bg-muted/20 p-3">
              <div className="space-y-2">
                <Label>Frequência</Label>
                <Select value={recurrenceType} onValueChange={(v) => { setRecurrenceType(v); setRecurrenceDay(v === 'weekly' ? 1 : 1); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                {recurrenceType === 'weekly' && (
                  <>
                    <Label>Dia da semana</Label>
                    <Select value={String(recurrenceDay)} onValueChange={(v) => setRecurrenceDay(Number(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map((d, i) => (
                          <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                )}
                {recurrenceType === 'monthly' && (
                  <>
                    <Label>Dia do mês</Label>
                    <Select value={String(recurrenceDay)} onValueChange={(v) => setRecurrenceDay(Number(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 28 }, (_, i) => (
                          <SelectItem key={i + 1} value={String(i + 1)}>Dia {i + 1}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                )}
                {recurrenceType === 'yearly' && (
                  <>
                    <Label>Mês</Label>
                    <Select value={String(recurrenceDay)} onValueChange={(v) => setRecurrenceDay(Number(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map((m, i) => (
                          <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Data de Início</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Previsão de Entrega</Label>
                <Input type="date" value={estimatedDate} onChange={(e) => setEstimatedDate(e.target.value)} />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Criando...' : isRecurring ? 'Criar Recorrência' : 'Criar Tarefa'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
