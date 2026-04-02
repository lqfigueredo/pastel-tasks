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
import { IdeaAttachments } from './IdeaAttachments';

interface Idea {
  id: string;
  title: string;
  description: string | null;
  is_implemented: boolean;
  created_by: string;
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
  const [saving, setSaving] = useState(false);

  const isOwner = user?.id === idea?.created_by;

  useEffect(() => {
    if (idea) {
      setTitle(idea.title);
      setDescription(idea.description || '');
      setIsImplemented(idea.is_implemented);
    }
  }, [idea]);

  const handleSave = async () => {
    if (!idea || !title.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from('ideas')
      .update({ title: title.trim(), description: description.trim() || null, is_implemented: isImplemented })
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
          <IdeaAttachments ideaId={idea.id} />
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
