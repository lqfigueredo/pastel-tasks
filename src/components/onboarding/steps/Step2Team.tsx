import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface Props {
  onNext: (teamId: string | null) => void;
  onBack: () => void;
  onSkip: () => void;
}

export const Step2Team = ({ onNext, onBack, onSkip }: Props) => {
  const { t } = useTranslation('onboarding');
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleCreate = async () => {
    if (!user) return;
    if (!name.trim()) {
      toast({ title: t('step2.errors.nameRequired'), variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { data: team, error } = await supabase
        .from('teams')
        .insert({ name: name.trim(), description: description.trim() || null, created_by: user.id })
        .select('id')
        .single();
      if (error) throw error;

      // Add creator as team member
      await supabase.from('team_members').insert({ team_id: team.id, user_id: user.id });

      toast({ title: t('step2.success') });
      onNext(team.id);
    } catch (err: any) {
      toast({ title: t('step2.errors.createFailed'), description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold mb-1">{t('step2.title')}</h3>
        <p className="text-sm text-muted-foreground">{t('step2.subtitle')}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="teamName">{t('step2.name')}</Label>
        <Input id="teamName" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('step2.namePlaceholder')} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="teamDesc">{t('step2.description')}</Label>
        <Textarea id="teamDesc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      </div>

      <div className="flex justify-between pt-4 gap-2">
        <Button variant="ghost" onClick={onSkip}>{t('common.skipAll')}</Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack}>{t('common.back')}</Button>
          <Button variant="outline" onClick={() => onNext(null)}>{t('common.skip')}</Button>
          <Button onClick={handleCreate} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('step2.create')}
          </Button>
        </div>
      </div>
    </div>
  );
};
