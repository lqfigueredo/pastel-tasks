import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStatusesQuery } from '@/hooks/useStatusesQuery';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface Props {
  teamId: string | null;
  onFinish: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export const Step4Task = ({ teamId, onFinish, onBack, onSkip }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: statuses } = useStatusesQuery();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleCreate = async () => {
    if (!user) return;
    if (!title.trim()) {
      toast({ title: 'Informe um título', variant: 'destructive' });
      return;
    }
    const defaultStatus = statuses?.find((s) => s.is_default) || statuses?.[0];
    if (!defaultStatus) {
      toast({ title: 'Nenhum status disponível', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from('tasks').insert({
        title: title.trim(),
        description: description.trim() || null,
        status_id: defaultStatus.id,
        team_id: teamId,
        created_by: user.id,
      });
      if (error) throw error;
      toast({ title: 'Primeira tarefa criada!' });
      onFinish();
    } catch (err: any) {
      toast({ title: 'Erro ao criar tarefa', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold mb-1">Crie sua primeira tarefa</h3>
        <p className="text-sm text-muted-foreground">
          Vamos popular seu Kanban. Você pode editar e adicionar detalhes depois.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="taskTitle">Título</Label>
        <Input id="taskTitle" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Configurar conta" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="taskDesc">Descrição (opcional)</Label>
        <Textarea id="taskDesc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      </div>

      <div className="flex justify-between pt-4 gap-2">
        <Button variant="ghost" onClick={onSkip}>Concluir sem criar</Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack}>Voltar</Button>
          <Button onClick={handleCreate} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Criar e concluir
          </Button>
        </div>
      </div>
    </div>
  );
};
