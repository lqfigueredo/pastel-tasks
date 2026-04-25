import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus, X } from 'lucide-react';
import { format } from 'date-fns';
import { getCurrentLocale } from '@/lib/date';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
  meeting: {
    id: string;
    meeting_date: string;
    description: string;
    external_participants: string[];
  };
  currentParticipantIds: string[];
}

interface Profile {
  user_id: string;
  display_name: string;
}

export function EditMeetingDialog({ open, onOpenChange, onUpdated, meeting, currentParticipantIds }: Props) {
  const { user } = useAuth();
  const { t } = useTranslation('meetings');
  const [date, setDate] = useState<Date>();
  const [description, setDescription] = useState('');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [externalParticipants, setExternalParticipants] = useState<string[]>([]);
  const [externalName, setExternalName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDate(new Date(meeting.meeting_date + 'T00:00:00'));
    setDescription(meeting.description);
    setExternalParticipants(meeting.external_participants || []);
    // Filter out the creator from selected users
    setSelectedUsers(currentParticipantIds.filter(id => id !== user?.id));
  }, [open, meeting, currentParticipantIds, user]);

  useEffect(() => {
    if (!open || !user) return;
    const fetchProfiles = async () => {
      const { data: approvals } = await supabase
        .from('user_approvals')
        .select('user_id')
        .eq('created_by_admin', user.id);

      const visibleIds = (approvals || []).map(a => a.user_id).filter(id => id !== user.id);

      if (visibleIds.length > 0) {
        const { data } = await supabase
          .from('profiles')
          .select('user_id, display_name')
          .in('user_id', visibleIds);
        setProfiles(data || []);
      } else {
        setProfiles([]);
      }
    };
    fetchProfiles();
  }, [open, user]);

  const addExternal = () => {
    const name = externalName.trim();
    if (!name) return;
    if (externalParticipants.includes(name)) {
      toast.error(t('create.duplicateName'));
      return;
    }
    setExternalParticipants((prev) => [...prev, name]);
    setExternalName('');
  };

  const removeExternal = (name: string) => {
    setExternalParticipants((prev) => prev.filter((n) => n !== name));
  };

  const toggleUser = (uid: string) => {
    setSelectedUsers((prev) => (prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]));
  };

  const handleSave = async () => {
    if (!user || !date || !description.trim()) {
      toast.error(t('create.requiredFields'));
      return;
    }
    setSaving(true);

    const { error } = await supabase
      .from('meeting_minutes')
      .update({
        meeting_date: format(date, 'yyyy-MM-dd'),
        description: description.trim(),
        external_participants: externalParticipants,
      })
      .eq('id', meeting.id);

    if (error) {
      toast.error(t('editMeeting.errorUpdate'));
      setSaving(false);
      return;
    }

    // Sync participants: remove all then re-add
    await supabase.from('meeting_participants').delete().eq('meeting_id', meeting.id);

    const allParticipantIds = [...new Set([user.id, ...selectedUsers])];
    if (allParticipantIds.length > 0) {
      const rows = allParticipantIds.map((uid) => ({ meeting_id: meeting.id, user_id: uid }));
      await supabase.from('meeting_participants').insert(rows);
    }

    toast.success(t('editMeeting.success'));
    onOpenChange(false);
    onUpdated();
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('editMeeting.title')}</DialogTitle>
          <DialogDescription>{t('editMeeting.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t('create.dateLabel')}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn('w-full justify-start text-left font-normal', !date && 'text-muted-foreground')}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'PPP', { locale: getCurrentLocale() }) : t('create.selectDate')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  locale={getCurrentLocale()}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>{t('create.descLabel')}</Label>
            <Textarea
              placeholder={t('create.descPlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('create.participants')}</Label>
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2">
              {profiles.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t('create.noUsers')}</p>
              ) : (
                profiles.map((p) => (
                  <label key={p.user_id} className="flex items-center gap-2 rounded p-1 text-sm hover:bg-accent cursor-pointer">
                    <Checkbox
                      checked={selectedUsers.includes(p.user_id)}
                      onCheckedChange={() => toggleUser(p.user_id)}
                    />
                    {p.display_name || t('create.noName')}
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('create.externalParticipants')}</Label>
            <div className="flex gap-2">
              <Input
                placeholder={t('create.externalPlaceholder')}
                value={externalName}
                onChange={(e) => setExternalName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addExternal(); } }}
              />
              <Button type="button" size="sm" variant="outline" onClick={addExternal}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {externalParticipants.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {externalParticipants.map((name) => (
                  <Badge key={name} variant="secondary" className="gap-1">
                    {name}
                    <button type="button" onClick={() => removeExternal(name)} className="ml-0.5 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('editMeeting.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? t('editMeeting.saving') : t('editMeeting.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
