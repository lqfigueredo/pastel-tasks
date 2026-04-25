import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { getCurrentLocale } from '@/lib/date';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meetingId: string;
  participants: { user_id: string; display_name: string }[];
  externalParticipants: string[];
  onCreated: () => void;
}

export function AddPendencyDialog({ open, onOpenChange, meetingId, participants, externalParticipants, onCreated }: Props) {
  const { t } = useTranslation('meetings');
  const [description, setDescription] = useState('');
  const [responsibleValue, setResponsibleValue] = useState('');
  const [dueDate, setDueDate] = useState<Date>();
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setDescription('');
    setResponsibleValue('');
    setDueDate(undefined);
  };

  const handleSave = async () => {
    if (!description.trim() || !responsibleValue) {
      toast.error(t('pendency.requiredFields'));
      return;
    }
    setSaving(true);

    // Check if the value is a user_id (internal) or external name
    const isExternal = responsibleValue.startsWith('ext:');
    const externalName = isExternal ? responsibleValue.slice(4) : null;

    const { error } = await supabase.from('meeting_pendencies').insert({
      meeting_id: meetingId,
      description: description.trim(),
      responsible_user_id: isExternal ? null : responsibleValue,
      responsible_external_name: externalName,
      due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
    });

    if (error) {
      toast.error(t('pendency.errorCreate'));
      setSaving(false);
      return;
    }

    toast.success(t('pendency.success'));
    reset();
    onOpenChange(false);
    onCreated();
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('pendency.title')}</DialogTitle>
          <DialogDescription>{t('pendency.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t('pendency.descLabel')}</Label>
            <Textarea
              placeholder={t('pendency.descPlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('pendency.responsibleLabel')}</Label>
            <Select value={responsibleValue} onValueChange={setResponsibleValue}>
              <SelectTrigger>
                <SelectValue placeholder={t('pendency.selectResponsible')} />
              </SelectTrigger>
              <SelectContent>
                {participants.map((p) => (
                  <SelectItem key={p.user_id} value={p.user_id}>
                    {p.display_name}
                  </SelectItem>
                ))}
                {externalParticipants.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">{t('pendency.externalGroup')}</div>
                    {externalParticipants.map((name) => (
                      <SelectItem key={`ext-${name}`} value={`ext:${name}`}>
                        {name} {t('pendency.externalSuffix')}
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('pendency.dueDateLabel')}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn('w-full justify-start text-left font-normal', !dueDate && 'text-muted-foreground')}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, 'P', { locale: getCurrentLocale() }) : t('pendency.selectDate')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  locale={getCurrentLocale()}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('pendency.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? t('pendency.saving') : t('pendency.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
