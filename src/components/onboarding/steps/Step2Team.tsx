import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface Props {
  onNext: (teamId: string | null) => void;
  onBack: () => void;
  onSkip: () => void;
}

export const Step2Team = ({ onNext, onBack, onSkip }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleCreate = async () => {
    if (!user) return;
    if (!name.trim()) {
      toast({ title: 'Informe um nome para o time', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { data: team, error } = await supabase
        .from('teams')
        .insert({ name: name.trim(), description: description.trim() || null, created_by: user.id })
        .select('id')
        .single();
      if (error) throw error;

      // Add creator as team member
      await supabase.from('team_members').insert({ team_id: team.id, user_id: user.id });

      toast({ title: 'Time criado!' });
      onNext(team.id);
    } catch (err: any) {
      toast({ title: 'Erro ao criar time', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold mb-1">Crie seu primeiro time</h3>
        <p className="text-sm text-muted-foreground">
          Times organizam tarefas, ideias e conhecimentos compartilhados. Você pode criar mais depois.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="teamName">Nome do time</Label>
        <Input id="teamName" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Marketing" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="teamDesc">Descrição (opcional)</Label>
        <Textarea id="teamDesc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      </div>

      <div className="flex justify-between pt-4 gap-2">
        <Button variant="ghost" onClick={onSkip}>Pular tudo</Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack}>Voltar</Button>
          <Button variant="outline" onClick={() => onNext(null)}>Pular</Button>
          <Button onClick={handleCreate} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Criar time
          </Button>
        </div>
      </div>
    </div>
  );
};
