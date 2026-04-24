import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SupportTicket {
  id: string;
  subject: string;
  status: string;
  created_by: string;
  created_at: string;
  closed_at: string | null;
  creator_name?: string;
}

const SUPPORT_TICKETS_KEY = ['support-tickets'] as const;

async function fetchSupportTickets(): Promise<SupportTicket[]> {
  const { data } = await supabase
    .from('support_tickets')
    .select('id, subject, status, created_by, created_at, closed_at')
    .order('created_at', { ascending: false });

  if (!data) return [];

  const userIds = [...new Set(data.map((t) => t.created_by))];
  if (userIds.length === 0) return data as SupportTicket[];

  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, display_name')
    .in('user_id', userIds);

  const nameMap = new Map((profiles || []).map((p) => [p.user_id, p.display_name]));

  return data.map((t) => ({
    ...t,
    creator_name: nameMap.get(t.created_by) || 'Desconhecido',
  }));
}

export function useSupportTicketsQuery() {
  return useQuery({
    queryKey: SUPPORT_TICKETS_KEY,
    queryFn: fetchSupportTickets,
    staleTime: 30_000,
  });
}

export function useInvalidateSupportTickets() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: SUPPORT_TICKETS_KEY });
}
