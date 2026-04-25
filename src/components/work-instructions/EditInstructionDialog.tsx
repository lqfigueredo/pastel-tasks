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

interface Props {
  instruction: { id: string; title: string; description: string | null; is_active: boolean };
  onClose: () => void;
  onUpdated: () => void;
}

export function EditInstructionDialog({ instruction, onClose, onUpdated }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation('workInstructions');
  const [title, setTitle] = useState(instruction.title);
  const [description, setDescription] = useState(instruction.description || '');
  const [isActive, setIsActive] = useState(instruction.is_active);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ title: t('edit.errorTitle'), variant: 'destructive' });
      return;
    }
    setSaving(true);

    const { error } = await supabase.from('work_instructions')
      .update({ title: title.trim(), description: description.trim() || null, is_active: isActive })
      .eq('id', instruction.id);

    if (error) {
      toast({ title: t('edit.errorUpdate'), description: error.message, variant: 'destructive' });
      setSaving(false);
      return;
    }

    await supabase.from('work_instruction_logs').insert({
      instruction_id: instruction.id,
      action: 'updated_metadata',
      details: t('edit.updatedLog'),
      user_id: user!.id,
    });

    toast({ title: t('edit.updated') });
    onClose();
    onUpdated();
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('edit.title')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>{t('edit.titleField')}</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>{t('edit.descField')}</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            <Label>{t('edit.active')}</Label>
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? t('edit.saving') : t('edit.save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
