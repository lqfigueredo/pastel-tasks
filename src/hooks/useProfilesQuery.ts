import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ProfileInfo {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
}

export function useProfilesQuery() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('user_id, display_name, avatar_url');
      return new Map<string, ProfileInfo>((data || []).map((p) => [p.user_id, p]));
    },
    enabled: !!user,
    staleTime: 120_000,
  });
}

export function useInvalidateProfiles() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['profiles'] });
}
