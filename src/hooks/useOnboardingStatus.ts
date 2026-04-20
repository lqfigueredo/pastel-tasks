import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface OnboardingStatus {
  shouldShow: boolean;
  loading: boolean;
}

export function useOnboardingStatus() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['onboarding-status', user?.id],
    queryFn: async () => {
      if (!user) return { shouldShow: false };

      // Check role
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      const isAdmin = (roles || []).some((r) => r.role === 'admin');
      if (!isAdmin) return { shouldShow: false };

      // Check profile completion timestamp
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed_at')
        .eq('user_id', user.id)
        .maybeSingle();

      const shouldShow = !profile?.onboarding_completed_at;
      return { shouldShow };
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });
}

export function useInvalidateOnboarding() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['onboarding-status'] });
}
