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
import { AssigneeSelector } from './AssigneeSelector';
import { X, Users } from 'lucide-react';

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

  useEffect(() => {
    if (open) {
      supabase.from('task_statuses').select('id, name').order('position').then(({ data }) => {
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
      setTitle('');
      setDescription('');
      setStartDate('');
      setEstimatedDate('');
      setAssigneeIds([]);
      setTeamId(null);
      onOpenChange(false);
      onTaskCreated?.();
    }
    setSaving(false);
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
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Criando...' : 'Criar Tarefa'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
