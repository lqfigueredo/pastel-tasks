import React, { useState, useEffect } from 'react';
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
import { Upload, FileText } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

interface Profile {
  user_id: string;
  display_name: string;
}

export function CreateMeetingDialog({ open, onOpenChange, onCreated }: Props) {
  const { user } = useAuth();
  const { t } = useTranslation('meetings');
  const [date, setDate] = useState<Date>();
  const [description, setDescription] = useState('');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [externalParticipants, setExternalParticipants] = useState<string[]>([]);
  const [externalName, setExternalName] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

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
    setDate(undefined);
    setDescription('');
    setSelectedUsers([]);
    setExternalParticipants([]);
    setExternalName('');
    setSelectedFiles([]);
  };

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

  const handleSave = async () => {
    if (!user || !date || !description.trim()) {
      toast.error(t('create.requiredFields'));
      return;
    }
    setSaving(true);

    const { data: meeting, error } = await supabase
      .from('meeting_minutes')
      .insert({
        meeting_date: format(date, 'yyyy-MM-dd'),
        description: description.trim(),
        created_by: user.id,
        external_participants: externalParticipants,
      })
      .select('id')
      .single();

    if (error || !meeting) {
      toast.error(t('create.errorCreate'));
      setSaving(false);
      return;
    }

    if (selectedUsers.length > 0) {
      const rows = selectedUsers.map((uid) => ({ meeting_id: meeting.id, user_id: uid }));
      await supabase.from('meeting_participants').insert(rows);
    }
    await supabase.from('meeting_participants').insert({ meeting_id: meeting.id, user_id: user.id });

    // Upload attachments
    for (const file of selectedFiles) {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${meeting.id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('meeting-attachments').upload(path, file);
      if (!uploadError) {
        await supabase.from('meeting_attachments').insert({
          meeting_id: meeting.id,
          file_name: file.name,
          file_path: path,
          file_type: file.type,
          uploaded_by: user.id,
        });
      }
    }

    toast.success(t('create.success'));
    reset();
    onOpenChange(false);
    onCreated();
    setSaving(false);
  };

  const toggleUser = (uid: string) => {
    setSelectedUsers((prev) => (prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('create.title')}</DialogTitle>
          <DialogDescription>{t('create.description')}</DialogDescription>
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

          <div className="space-y-2">
            <Label>{t('create.attachments')}</Label>
            <input
              ref={fileRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) {
                  setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                }
              }}
            />
            <Button type="button" variant="outline" size="sm" className="gap-1 text-xs w-full" onClick={() => fileRef.current?.click()}>
              <Upload className="h-3 w-3" /> {t('create.selectFiles')}
            </Button>
            {selectedFiles.length > 0 && (
              <div className="space-y-1">
                {selectedFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs bg-muted/50 rounded p-1.5">
                    <FileText className="h-3 w-3 text-primary shrink-0" />
                    <span className="truncate flex-1">{f.name}</span>
                    <button type="button" onClick={() => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))} className="hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('create.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? t('create.saving') : t('create.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
