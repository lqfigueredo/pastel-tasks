import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  const [statuses, setStatuses] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      supabase.from('task_statuses').select('id, name').order('position').then(({ data }) => {
        if (data) {
          setStatuses(data);
          if (data.length > 0 && !statusId) setStatusId(data[0].id);
        }
      });
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim()) return;
    setSaving(true);

    const { error } = await supabase.from('tasks').insert({
      title: title.trim(),
      description: description.trim() || null,
      status_id: statusId,
      start_date: startDate || null,
      estimated_delivery_date: estimatedDate || null,
      created_by: user.id,
    });

    if (error) {
      toast({ title: 'Erro ao criar tarefa', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Tarefa criada!' });
      setTitle('');
      setDescription('');
      setStartDate('');
      setEstimatedDate('');
      onOpenChange(false);
      onTaskCreated?.();
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Tarefa</DialogTitle>
          <DialogDescription>Preencha os detalhes da nova tarefa</DialogDescription>
        </DialogHeader>
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
      </DialogContent>
    </Dialog>
  );
}
