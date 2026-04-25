import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, Trash2, ExternalLink, FileDown } from 'lucide-react';

interface KnowledgeSource {
  id: string;
  title: string;
  description: string | null;
  reference_url: string | null;
  file_path: string | null;
  file_name: string | null;
  scope: string;
  team_id: string | null;
  created_by: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: KnowledgeSource | null;
  teams: { id: string; name: string }[];
  isOwner: boolean;
}

export function EditKnowledgeDialog({ open, onOpenChange, source, teams, isOwner }: Props) {
  const { t } = useTranslation('knowledge');
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [referenceUrl, setReferenceUrl] = useState('');
  const [scope, setScope] = useState('individual');
  const [teamId, setTeamId] = useState('');

  useEffect(() => {
    if (source) {
      setTitle(source.title);
      setDescription(source.description || '');
      setReferenceUrl(source.reference_url || '');
      setScope(source.scope);
      setTeamId(source.team_id || '');
    }
  }, [source]);

  const handleUpdate = async () => {
    if (!source || !title.trim()) return;
    setLoading(true);

    const { error } = await supabase.from('knowledge_sources').update({
      title: title.trim(),
      description: description.trim() || null,
      reference_url: referenceUrl.trim() || null,
      scope,
      team_id: scope === 'team' ? teamId || null : null,
    }).eq('id', source.id);

    if (error) {
      toast({ title: t('edit.errorUpdate'), description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t('edit.updated') });
      queryClient.invalidateQueries({ queryKey: ['knowledge-sources'] });
      onOpenChange(false);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!source) return;
    setLoading(true);

    if (source.file_path) {
      await supabase.storage.from('knowledge-attachments').remove([source.file_path]);
    }

    const { error } = await supabase.from('knowledge_sources').delete().eq('id', source.id);
    if (error) {
      toast({ title: t('edit.errorDelete'), description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t('edit.deleted') });
      queryClient.invalidateQueries({ queryKey: ['knowledge-sources'] });
      onOpenChange(false);
    }
    setLoading(false);
  };

  const handleDownload = async () => {
    if (!source?.file_path) return;
    const { data } = await supabase.storage.from('knowledge-attachments').createSignedUrl(source.file_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  if (!source) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isOwner ? t('edit.titleEdit') : t('edit.titleView')}</DialogTitle>
          <DialogDescription>
            {isOwner ? t('edit.descEdit') : t('edit.descView')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label>{t('edit.titleLabel')}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} disabled={!isOwner} />
          </div>

          <div className="space-y-1">
            <Label>{t('edit.descLabel')}</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} disabled={!isOwner} />
          </div>

          <div className="space-y-1">
            <Label>{t('edit.linkLabel')}</Label>
            <div className="flex gap-2">
              <Input type="url" value={referenceUrl} onChange={(e) => setReferenceUrl(e.target.value)} disabled={!isOwner} className="flex-1" />
              {source.reference_url && (
                <Button variant="outline" size="icon" asChild>
                  <a href={source.reference_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>

          {source.file_name && (
            <div className="space-y-1">
              <Label>{t('edit.fileLabel')}</Label>
              <Button variant="outline" size="sm" onClick={handleDownload} className="w-full justify-start">
                <FileDown className="mr-2 h-4 w-4" />
                {source.file_name}
              </Button>
            </div>
          )}

          {isOwner && (
            <>
              <div className="space-y-1">
                <Label>{t('edit.scopeLabel')}</Label>
                <Select value={scope} onValueChange={setScope}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">{t('edit.scopeIndividual')}</SelectItem>
                    <SelectItem value="team">{t('edit.scopeTeam')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {scope === 'team' && (
                <div className="space-y-1">
                  <Label>{t('edit.teamLabel')}</Label>
                  <Select value={teamId} onValueChange={setTeamId}>
                    <SelectTrigger><SelectValue placeholder={t('edit.selectTeam')} /></SelectTrigger>
                    <SelectContent>
                      {teams.map((tm) => (
                        <SelectItem key={tm.id} value={tm.id}>{tm.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          {isOwner && (
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={loading}>
              <Trash2 className="mr-2 h-4 w-4" />{t('edit.delete')}
            </Button>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>{t('edit.close')}</Button>
            {isOwner && (
              <Button onClick={handleUpdate} disabled={loading || !title.trim()}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('edit.save')}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
