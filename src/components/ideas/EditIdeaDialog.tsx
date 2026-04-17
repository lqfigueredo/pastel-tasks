import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { IdeaAttachments } from './IdeaAttachments';
import { IdeaLinkedTasks } from './IdeaLinkedTasks';

interface Idea {
  id: string;
  title: string;
  description: string | null;
  is_implemented: boolean;
  created_by: string;
  team_id: string | null;
}

interface Props {
  idea: Idea | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

export function EditIdeaDialog({ idea, open, onOpenChange, onUpdated }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isImplemented, setIsImplemented] = useState(false);
  const [teamId, setTeamId] = useState<string>('none');
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchTeams = async () => {
      if (!user) return;
      const { data: memberships } = await supabase
        .from('team_members').select('team_id').eq('user_id', user.id);
      const teamIds = (memberships ?? []).map((m) => m.team_id);
      if (!teamIds.length) { setTeams([]); return; }
      const { data } = await supabase
        .from('teams').select('id, name').in('id', teamIds).order('name');
      if (data) setTeams(data);
    };
    fetchTeams();
  }, [user]);

  const isOwner = user?.id === idea?.created_by;

  useEffect(() => {
    if (idea) {
      setTitle(idea.title);
      setDescription(idea.description || '');
      setIsImplemented(idea.is_implemented);
      setTeamId(idea.team_id || 'none');
    }
  }, [idea]);

  const handleSave = async () => {
    if (!idea || !title.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from('ideas')
      .update({ title: title.trim(), description: description.trim() || null, is_implemented: isImplemented, team_id: teamId !== 'none' ? teamId : null })
      .eq('id', idea.id);

    setSaving(false);
    if (error) {
      toast({ title: 'Erro ao salvar', variant: 'destructive' });
      return;
    }
    onOpenChange(false);
    onUpdated();
    toast({ title: 'Ideia atualizada!' });
  };

  const handleDelete = async () => {
    if (!idea) return;
    await supabase.from('ideas').delete().eq('id', idea.id);
    onOpenChange(false);
    onUpdated();
    toast({ title: 'Ideia excluída' });
  };

  if (!idea) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isOwner ? 'Editar Ideia' : 'Detalhes da Ideia'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} disabled={!isOwner} />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} disabled={!isOwner} />
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={isImplemented} onCheckedChange={setIsImplemented} disabled={!isOwner} />
            <Label>Ideia implementada</Label>
          </div>
          <div>
            <Label>Equipe</Label>
            <Select value={teamId} onValueChange={setTeamId} disabled={!isOwner}>
              <SelectTrigger>
                <SelectValue placeholder="Sem equipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem equipe</SelectItem>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <IdeaAttachments ideaId={idea.id} />
          <IdeaLinkedTasks ideaId={idea.id} isOwner={isOwner} />
        </div>
        {isOwner && (
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="destructive" size="sm" onClick={handleDelete}>Excluir</Button>
            <div className="flex-1" />
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!title.trim() || saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
