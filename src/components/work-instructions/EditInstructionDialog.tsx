import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

interface Props {
  instruction: { id: string; title: string; description: string | null; is_active: boolean };
  onClose: () => void;
  onUpdated: () => void;
}

export function EditInstructionDialog({ instruction, onClose, onUpdated }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState(instruction.title);
  const [description, setDescription] = useState(instruction.description || '');
  const [isActive, setIsActive] = useState(instruction.is_active);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ title: 'Título é obrigatório', variant: 'destructive' });
      return;
    }
    setSaving(true);

    const { error } = await supabase.from('work_instructions')
      .update({ title: title.trim(), description: description.trim() || null, is_active: isActive })
      .eq('id', instruction.id);

    if (error) {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
      setSaving(false);
      return;
    }

    await supabase.from('work_instruction_logs').insert({
      instruction_id: instruction.id,
      action: 'updated_metadata',
      details: `Metadados atualizados (título, descrição, status)`,
      user_id: user!.id,
    });

    toast({ title: 'Instrução atualizada' });
    onClose();
    onUpdated();
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Instrução</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Título *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Descrição resumida</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            <Label>Ativo</Label>
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
