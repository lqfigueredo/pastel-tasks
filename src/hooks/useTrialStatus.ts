import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRoles } from '@/hooks/useUserRoles';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays } from 'date-fns';

export type TrialUrgency = 'info' | 'warning' | 'critical';

interface TrialStatus {
  isTrialing: boolean;
  daysLeft: number;
  urgency: TrialUrgency;
  trialEndsAt: string | null;
  loading: boolean;
}

export function useTrialStatus(): TrialStatus {
  const { user } = useAuth();
  const { isAdmin, loading: rolesLoading } = useUserRoles();
  const [data, setData] = useState<{ status: string; trial_ends_at: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (rolesLoading) return;
    if (!user || !isAdmin) {
      setData(null);
      setLoading(false);
      return;
    }
    let mounted = true;
    supabase
      .from('subscriptions')
      .select('status, trial_ends_at')
      .eq('admin_user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!mounted) return;
        setData(data as { status: string; trial_ends_at: string | null } | null);
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [user, isAdmin, rolesLoading]);

  if (!data || data.status !== 'trialing' || !data.trial_ends_at) {
    return { isTrialing: false, daysLeft: 0, urgency: 'info', trialEndsAt: null, loading };
  }

  const daysLeft = Math.max(0, differenceInDays(new Date(data.trial_ends_at), new Date()));
  let urgency: TrialUrgency = 'info';
  if (daysLeft <= 3) urgency = 'critical';
  else if (daysLeft <= 7) urgency = 'warning';

  return {
    isTrialing: true,
    daysLeft,
    urgency,
    trialEndsAt: data.trial_ends_at,
    loading,
  };
}
