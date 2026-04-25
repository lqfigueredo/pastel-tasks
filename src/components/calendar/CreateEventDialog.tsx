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
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  initialDate?: Date;
}

interface Profile {
  user_id: string;
  display_name: string;
}

export function CreateEventDialog({ open, onOpenChange, onCreated, initialDate }: Props) {
  const { t } = useTranslation('calendar');
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<Date | undefined>(initialDate);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [externalParticipants, setExternalParticipants] = useState<string[]>([]);
  const [externalName, setExternalName] = useState('');
  const [createMeeting, setCreateMeeting] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialDate) setDate(initialDate);
  }, [initialDate]);

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

  const reset = () => {
    setTitle('');
    setDescription('');
    setDate(initialDate);
    setStartTime('');
    setEndTime('');
    setLocation('');
    setSelectedUsers([]);
    setExternalParticipants([]);
    setExternalName('');
    setCreateMeeting(false);
  };

  const addExternal = () => {
    const name = externalName.trim();
    if (!name) return;
    if (externalParticipants.includes(name)) {
      toast.error(t('create.alreadyAdded'));
      return;
    }
    setExternalParticipants(prev => [...prev, name]);
    setExternalName('');
  };

  const handleSave = async () => {
    if (!user || !date || !title.trim()) {
      toast.error(t('create.fillRequired'));
      return;
    }
    setSaving(true);

    let meetingId: string | null = null;

    if (createMeeting) {
      const { data: meeting, error: meetingError } = await supabase
        .from('meeting_minutes')
        .insert({
          meeting_date: format(date, 'yyyy-MM-dd'),
          description: description.trim() || title.trim(),
          created_by: user.id,
          external_participants: externalParticipants,
        })
        .select('id')
        .single();

      if (meetingError || !meeting) {
        toast.error(t('create.errorMeeting'));
        setSaving(false);
        return;
      }

      meetingId = meeting.id;

      const meetingParticipants = [
        { meeting_id: meeting.id, user_id: user.id },
        ...selectedUsers.map(uid => ({ meeting_id: meeting.id, user_id: uid })),
      ];
      await supabase.from('meeting_participants').insert(meetingParticipants);
    }

    const { data: event, error } = await supabase
      .from('calendar_events')
      .insert({
        title: title.trim(),
        description: description.trim() || null,
        event_date: format(date, 'yyyy-MM-dd'),
        start_time: startTime || null,
        end_time: endTime || null,
        location: location.trim() || null,
        created_by: user.id,
        meeting_id: meetingId,
      })
      .select('id')
      .single();

    if (error || !event) {
      toast.error(t('create.errorEvent'));
      setSaving(false);
      return;
    }

    const participantRows = [
      ...selectedUsers.map(uid => ({ event_id: event.id, user_id: uid })),
      ...externalParticipants.map(name => ({ event_id: event.id, external_name: name })),
    ];
    if (participantRows.length > 0) {
      await supabase.from('calendar_event_participants').insert(participantRows);
    }

    toast.success(createMeeting ? t('create.successWithMeeting') : t('create.successEvent'));
    reset();
    onOpenChange(false);
    onCreated();
    setSaving(false);
  };

  const toggleUser = (uid: string) => {
    setSelectedUsers(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('create.title')}</DialogTitle>
          <DialogDescription>{t('create.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t('create.fields.title')} *</Label>
            <Input placeholder={t('create.fields.titlePlaceholder')} value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>{t('create.fields.date')} *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !date && 'text-muted-foreground')}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'PPP', { locale: getCurrentLocale() }) : t('create.fields.datePlaceholder')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={date} onSelect={setDate} locale={getCurrentLocale()} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('create.fields.startTime')}</Label>
              <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('create.fields.endTime')}</Label>
              <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('create.fields.location')}</Label>
            <Input placeholder={t('create.fields.locationPlaceholder')} value={location} onChange={e => setLocation(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>{t('create.fields.descLabel')}</Label>
            <Textarea placeholder={t('create.fields.descPlaceholder')} value={description} onChange={e => setDescription(e.target.value)} rows={3} />
          </div>

          <div className="space-y-2">
            <Label>{t('create.fields.participants')}</Label>
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2">
              {profiles.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t('create.fields.noUsers')}</p>
              ) : (
                profiles.map(p => (
                  <label key={p.user_id} className="flex items-center gap-2 rounded p-1 text-sm hover:bg-accent cursor-pointer">
                    <Checkbox checked={selectedUsers.includes(p.user_id)} onCheckedChange={() => toggleUser(p.user_id)} />
                    {p.display_name || t('detail.noName')}
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('create.fields.externalParticipants')}</Label>
            <div className="flex gap-2">
              <Input
                placeholder={t('create.fields.externalPlaceholder')}
                value={externalName}
                onChange={e => setExternalName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addExternal(); } }}
              />
              <Button type="button" size="sm" variant="outline" onClick={addExternal}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {externalParticipants.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {externalParticipants.map(name => (
                  <Badge key={name} variant="secondary" className="gap-1">
                    {name}
                    <button type="button" onClick={() => setExternalParticipants(prev => prev.filter(n => n !== name))} className="ml-0.5 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 rounded-lg border p-3">
            <Switch checked={createMeeting} onCheckedChange={setCreateMeeting} />
            <div>
              <p className="text-sm font-medium">{t('create.createMeeting')}</p>
              <p className="text-xs text-muted-foreground">{t('create.createMeetingDesc')}</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('create.cancel')}</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? t('create.saving') : t('create.save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
