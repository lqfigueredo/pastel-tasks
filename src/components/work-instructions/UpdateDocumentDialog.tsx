import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface Props {
  instruction: {
    id: string;
    title: string;
    team_id: string;
    current_file_path: string;
    current_file_name: string;
  };
  onClose: () => void;
  onUpdated: () => void;
}

export function UpdateDocumentDialog({ instruction, onClose, onUpdated }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const handleUpdate = async () => {
    if (!file || !reason.trim()) {
      toast({ title: 'Selecione o novo PDF e informe o motivo da alteração', variant: 'destructive' });
      return;
    }
    if (file.type !== 'application/pdf') {
      toast({ title: 'Apenas arquivos PDF são permitidos', variant: 'destructive' });
      return;
    }

    setSaving(true);

    // Get current version count
    const { count } = await supabase
      .from('work_instruction_versions')
      .select('*', { count: 'exact', head: true })
      .eq('instruction_id', instruction.id);

    const versionNumber = (count || 0) + 1;

    // Save current file as a version
    await supabase.from('work_instruction_versions').insert({
      instruction_id: instruction.id,
      version_number: versionNumber,
      file_path: instruction.current_file_path,
      file_name: instruction.current_file_name,
      change_reason: reason.trim(),
      changed_by: user!.id,
    });

    // Upload new file
    const timestamp = Date.now();
    const newPath = `${instruction.team_id}/${instruction.id}/${timestamp}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from('work-instructions')
      .upload(newPath, file, { contentType: 'application/pdf' });

    if (uploadError) {
      toast({ title: 'Erro ao enviar arquivo', description: uploadError.message, variant: 'destructive' });
      setSaving(false);
      return;
    }

    // Update instruction with new file
    const { error } = await supabase.from('work_instructions')
      .update({ current_file_path: newPath, current_file_name: file.name })
      .eq('id', instruction.id);

    if (error) {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
      setSaving(false);
      return;
    }

    // Log
    await supabase.from('work_instruction_logs').insert({
      instruction_id: instruction.id,
      action: 'updated_file',
      details: reason.trim(),
      user_id: user!.id,
    });

    toast({ title: 'Documento atualizado com sucesso' });
    onClose();
    onUpdated();
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Atualizar Documento — {instruction.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            O documento atual ({instruction.current_file_name}) será salvo no histórico de versões.
          </p>
          <div>
            <Label>Novo arquivo PDF *</Label>
            <Input type="file" accept="application/pdf" onChange={e => setFile(e.target.files?.[0] || null)} />
          </div>
          <div>
            <Label>Motivo da alteração *</Label>
            <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Descreva o motivo da atualização" rows={3} />
          </div>
          <Button onClick={handleUpdate} disabled={saving} className="w-full">
            {saving ? 'Atualizando...' : 'Atualizar Documento'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
