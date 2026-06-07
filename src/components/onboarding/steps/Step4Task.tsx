import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStatusesQuery } from '@/hooks/useStatusesQuery';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface Props {
  teamId: string | null;
  onFinish: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export const Step4Task = ({ teamId, onFinish, onBack, onSkip }: Props) => {
  const { t } = useTranslation('onboarding');
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: statuses } = useStatusesQuery();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleCreate = async () => {
    if (!user) return;
    if (!title.trim()) {
      toast({ title: t('step4.errors.titleRequired'), variant: 'destructive' });
      return;
    }
    let defaultStatus = statuses?.find((s) => s.is_default) || statuses?.[0];
    if (!defaultStatus) {
      // Fallback: cria status "A fazer" on-the-fly se não houver nenhum
      const { data: created, error: statusErr } = await supabase
        .from('task_statuses')
        .insert({ name: 'A fazer', color: '#6366f1', position: 0, created_by: user.id })
        .select('id, name, color, position, is_default, team_id, created_by, created_at, deleted_at')
        .single();
      if (statusErr || !created) {
        toast({ title: t('step4.errors.noStatus'), description: statusErr?.message, variant: 'destructive' });
        return;
      }
      defaultStatus = created as typeof defaultStatus;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from('tasks').insert({
        title: title.trim(),
        description: description.trim() || null,
        status_id: defaultStatus.id,
        team_id: teamId,
        created_by: user.id,
      });
      if (error) throw error;
      toast({ title: t('step4.success') });
      onFinish();
    } catch (err: any) {
      toast({ title: t('step4.errors.createFailed'), description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold mb-1">{t('step4.title')}</h3>
        <p className="text-sm text-muted-foreground">{t('step4.subtitle')}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="taskTitle">{t('step4.taskTitle')}</Label>
        <Input id="taskTitle" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('step4.taskTitlePlaceholder')} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="taskDesc">{t('step4.description')}</Label>
        <Textarea id="taskDesc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      </div>

      <div className="flex justify-between pt-4 gap-2">
        <Button variant="ghost" onClick={onSkip}>{t('step4.skipFinish')}</Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack}>{t('common.back')}</Button>
          <Button onClick={handleCreate} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('step4.create')}
          </Button>
        </div>
      </div>
    </div>
  );
};
