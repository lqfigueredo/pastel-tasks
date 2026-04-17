import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const KEY = ['user-column-order'];

export function useColumnOrderQuery() {
  const { user } = useAuth();
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<string[]> => {
      if (!user) return [];
      const { data } = await supabase
        .from('user_column_order')
        .select('status_ids_order')
        .eq('user_id', user.id)
        .maybeSingle();
      return data?.status_ids_order ?? [];
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });
}

export function useUpdateColumnOrder() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (statusIdsOrder: string[]) => {
      if (!user) throw new Error('Não autenticado');
      const { error } = await supabase.from('user_column_order').upsert(
        {
          user_id: user.id,
          status_ids_order: statusIdsOrder,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
      if (error) throw error;
      return statusIdsOrder;
    },
    onMutate: async (newOrder) => {
      await queryClient.cancelQueries({ queryKey: KEY });
      const prev = queryClient.getQueryData<string[]>(KEY);
      queryClient.setQueryData(KEY, newOrder);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(KEY, ctx.prev);
    },
  });
}
