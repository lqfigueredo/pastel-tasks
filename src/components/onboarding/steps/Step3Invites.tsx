import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface Props {
  teamId: string | null;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export const Step3Invites = ({ teamId, onNext, onBack, onSkip }: Props) => {
  const { t } = useTranslation('onboarding');
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email1, setEmail1] = useState('');
  const [email2, setEmail2] = useState('');

  const handleInvite = async () => {
    const emails = [email1, email2].map((e) => e.trim()).filter(Boolean);
    if (emails.length === 0) {
      onNext();
      return;
    }
    setLoading(true);
    let success = 0;
    const failed: string[] = [];
    for (const email of emails) {
      try {
        const { error } = await supabase.functions.invoke('invite-team-member', {
          body: { email, teamId },
        });
        if (error) throw error;
        success++;
      } catch (err: any) {
        failed.push(`${email}: ${err.context?.error || err.message}`);
      }
    }
    setLoading(false);
    if (success > 0) toast({ title: t('step3.sentCount', { count: success }) });
    if (failed.length > 0) {
      toast({
        title: t('step3.someFailed'),
        description: failed.join('\n'),
        variant: 'destructive',
      });
    }
    onNext();
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold mb-1">{t('step3.title')}</h3>
        <p className="text-sm text-muted-foreground">{t('step3.subtitle')}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email1">{t('step3.email1')}</Label>
        <Input id="email1" type="email" value={email1} onChange={(e) => setEmail1(e.target.value)} placeholder={t('step3.emailPlaceholder1')} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email2">{t('step3.email2')}</Label>
        <Input id="email2" type="email" value={email2} onChange={(e) => setEmail2(e.target.value)} placeholder={t('step3.emailPlaceholder2')} />
      </div>

      <div className="flex justify-between pt-4 gap-2">
        <Button variant="ghost" onClick={onSkip}>{t('common.skipAll')}</Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack}>{t('common.back')}</Button>
          <Button variant="outline" onClick={onNext}>{t('common.skip')}</Button>
          <Button onClick={handleInvite} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('step3.send')}
          </Button>
        </div>
      </div>
    </div>
  );
};
