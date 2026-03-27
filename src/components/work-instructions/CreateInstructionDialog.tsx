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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teams: { id: string; name: string }[];
  onCreated: () => void;
}

export function CreateInstructionDialog({ open, onOpenChange, teams, onCreated }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [teamId, setTeamId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setTitle(''); setDescription(''); setIsActive(true); setTeamId(''); setFile(null);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !teamId || !file || !user) {
      toast({ title: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }
    if (file.type !== 'application/pdf') {
      toast({ title: 'Apenas arquivos PDF são permitidos', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const instructionId = crypto.randomUUID();
    const timestamp = Date.now();
    const filePath = `${teamId}/${instructionId}/${timestamp}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from('work-instructions')
      .upload(filePath, file, { contentType: 'application/pdf' });

    if (uploadError) {
      toast({ title: 'Erro ao enviar arquivo', description: uploadError.message, variant: 'destructive' });
      setSaving(false);
      return;
    }

    const { error } = await supabase.from('work_instructions').insert({
      id: instructionId,
      title: title.trim(),
      description: description.trim() || null,
      is_active: isActive,
      team_id: teamId,
      current_file_path: filePath,
      current_file_name: file.name,
      created_by: user.id,
    });

    if (error) {
      toast({ title: 'Erro ao criar instrução', description: error.message, variant: 'destructive' });
      setSaving(false);
      return;
    }

    await supabase.from('work_instruction_logs').insert({
      instruction_id: instructionId,
      action: 'created',
      details: `Instrução "${title.trim()}" criada`,
      user_id: user.id,
    });

    toast({ title: 'Instrução criada com sucesso' });
    reset();
    onOpenChange(false);
    onCreated();
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Instrução de Trabalho</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Título *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título do documento" />
          </div>
          <div>
            <Label>Descrição resumida</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Breve descrição" rows={3} />
          </div>
          <div>
            <Label>Equipe *</Label>
            <Select value={teamId} onValueChange={setTeamId}>
              <SelectTrigger><SelectValue placeholder="Selecione a equipe" /></SelectTrigger>
              <SelectContent>
                {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            <Label>Ativo</Label>
          </div>
          <div>
            <Label>Arquivo PDF *</Label>
            <Input type="file" accept="application/pdf" onChange={e => setFile(e.target.files?.[0] || null)} />
          </div>
          <Button onClick={handleSubmit} disabled={saving} className="w-full">
            {saving ? 'Salvando...' : 'Criar Instrução'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
