import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
}

export function useNotificationsQuery() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async (): Promise<Notification[]> => {
      if (!user) return [];
      const { data } = await supabase
        .from('notifications')
        .select('id, type, title, message, reference_id, is_read, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      return (data as Notification[]) ?? [];
    },
    enabled: !!user,
    staleTime: 15_000,
  });
}

export function useInvalidateNotifications() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return () =>
    queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
}
