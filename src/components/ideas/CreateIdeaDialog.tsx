import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateIdeaDialog({ open, onOpenChange, onCreated }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation('ideas');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [teamId, setTeamId] = useState<string>('none');
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchTeams = async () => {
      if (!user) return;
      const { data: memberships } = await supabase
        .from('team_members').select('team_id').eq('user_id', user.id);
      const teamIds = (memberships ?? []).map((m) => m.team_id);
      if (!teamIds.length) { setTeams([]); return; }
      const { data } = await supabase
        .from('teams').select('id, name').in('id', teamIds).order('name');
      if (data) setTeams(data);
    };
    fetchTeams();
  }, [user]);

  const handleSubmit = async () => {
    if (!title.trim() || !user) return;
    setSaving(true);

    const { data: idea, error } = await supabase
      .from('ideas')
      .insert({ title: title.trim(), description: description.trim() || null, created_by: user.id, team_id: teamId !== 'none' ? teamId : null })
      .select('id')
      .single();

    if (error || !idea) {
      toast({ title: t('create.errorCreate'), variant: 'destructive' });
      setSaving(false);
      return;
    }

    for (const file of files) {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('idea-attachments').upload(path, file);
      if (!upErr) {
        await supabase.from('idea_attachments').insert({
          idea_id: idea.id,
          file_name: file.name,
          file_path: path,
          file_type: file.type,
          uploaded_by: user.id,
        });
      }
    }

    setSaving(false);
    setTitle('');
    setDescription('');
    setFiles([]);
    setTeamId('none');
    onOpenChange(false);
    onCreated();
    toast({ title: t('create.success') });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('create.title')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="idea-title">{t('create.titleLabel')}</Label>
            <Input id="idea-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('create.titlePlaceholder')} />
          </div>
          <div>
            <Label htmlFor="idea-desc">{t('create.descLabel')}</Label>
            <Textarea id="idea-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('create.descPlaceholder')} rows={4} />
          </div>
          <div>
            <Label>{t('create.team')}</Label>
            <Select value={teamId} onValueChange={setTeamId}>
              <SelectTrigger>
                <SelectValue placeholder={t('create.noTeam')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('create.noTeam')}</SelectItem>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t('create.attachments')}</Label>
            <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => { if (e.target.files) setFiles(Array.from(e.target.files)); }} />
            <Button type="button" variant="outline" size="sm" className="mt-1 gap-1" onClick={() => fileRef.current?.click()}>
              <Upload className="h-3 w-3" /> {t('create.selectFiles')}
            </Button>
            {files.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">{t('create.filesSelected', { count: files.length })}</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('create.cancel')}</Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || saving}>
            {saving ? t('create.saving') : t('create.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
