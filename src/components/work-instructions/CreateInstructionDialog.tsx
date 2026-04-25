import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('workInstructions');
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
      toast({ title: t('create.requiredFields'), variant: 'destructive' });
      return;
    }
    if (file.type !== 'application/pdf') {
      toast({ title: t('create.errorPdfOnly'), variant: 'destructive' });
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
      toast({ title: t('create.errorUpload'), description: uploadError.message, variant: 'destructive' });
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
      toast({ title: t('create.errorCreate'), description: error.message, variant: 'destructive' });
      setSaving(false);
      return;
    }

    await supabase.from('work_instruction_logs').insert({
      instruction_id: instructionId,
      action: 'created',
      details: t('create.createdLog', { title: title.trim() }),
      user_id: user.id,
    });

    toast({ title: t('create.success') });
    reset();
    onOpenChange(false);
    onCreated();
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('create.title')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>{t('create.titleField')}</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={t('create.titlePlaceholder')} />
          </div>
          <div>
            <Label>{t('create.descField')}</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder={t('create.descPlaceholder')} rows={3} />
          </div>
          <div>
            <Label>{t('create.teamField')}</Label>
            <Select value={teamId} onValueChange={setTeamId}>
              <SelectTrigger><SelectValue placeholder={t('create.selectTeam')} /></SelectTrigger>
              <SelectContent>
                {teams.map(tm => <SelectItem key={tm.id} value={tm.id}>{tm.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            <Label>{t('create.active')}</Label>
          </div>
          <div>
            <Label>{t('create.fileField')}</Label>
            <Input type="file" accept="application/pdf" onChange={e => setFile(e.target.files?.[0] || null)} />
          </div>
          <Button onClick={handleSubmit} disabled={saving} className="w-full">
            {saving ? t('create.saving') : t('create.save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
