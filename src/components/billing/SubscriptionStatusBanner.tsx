import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRoles } from '@/hooks/useUserRoles';
import { supabase } from '@/integrations/supabase/client';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { differenceInDays } from 'date-fns';
import { useTranslation } from 'react-i18next';

interface Sub {
  status: string;
  trial_ends_at: string | null;
  past_due_since: string | null;
}

export default function SubscriptionStatusBanner() {
  const { t } = useTranslation('billing');
  const { user } = useAuth();
  const { isAdmin, loading: rolesLoading } = useUserRoles();
  const [sub, setSub] = useState<Sub | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!user || !isAdmin) return;
    supabase
      .from('subscriptions')
      .select('status, trial_ends_at, past_due_since')
      .eq('admin_user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setSub(data as Sub | null));
  }, [user, isAdmin]);

  if (rolesLoading || !isAdmin || !sub || dismissed) return null;
  if (location.pathname === '/cobranca') return null;

  let message: string | null = null;
  let tone: 'warning' | 'destructive' = 'warning';

  if (sub.status === 'suspended') {
    message = t('banner.suspended');
    tone = 'destructive';
  } else if (sub.status === 'past_due') {
    message = t('banner.pastDue');
    tone = 'destructive';
  } else if (sub.status === 'trialing' && sub.trial_ends_at) {
    const days = differenceInDays(new Date(sub.trial_ends_at), new Date());
    if (days < 0) {
      message = t('banner.trialExpired');
      tone = 'destructive';
    } else if (days <= 3) {
      message = days === 0 ? t('banner.trialEndingHours') : t('banner.trialEndingDays', { days });
      tone = 'destructive';
    } else if (days <= 7) {
      message = t('banner.trialDaysLeft', { days });
    }
  } else if (sub.status === 'canceled') {
    message = t('banner.canceled');
  }

  if (!message) return null;

  const bg = tone === 'destructive' ? 'bg-destructive text-destructive-foreground' : 'bg-yellow-500/15 text-foreground border-b border-yellow-500/30';
  const Icon = tone === 'destructive' ? AlertTriangle : Clock;

  return (
    <div className={`flex items-center gap-3 px-4 py-2 text-sm ${bg}`}>
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1">{message}</span>
      <Button
        size="sm"
        variant={tone === 'destructive' ? 'secondary' : 'default'}
        onClick={() => navigate('/cobranca')}
      >
        {t('banner.resolve')}
      </Button>
      <button onClick={() => setDismissed(true)} className="opacity-70 hover:opacity-100">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
