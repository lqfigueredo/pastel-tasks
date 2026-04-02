import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UserRoles {
  isAdmin: boolean;
  isSolutionAdmin: boolean;
  isRegularUser: boolean;
  loading: boolean;
}

let cachedRoles: { userId: string; roles: Omit<UserRoles, 'loading'> } | null = null;

export function useUserRoles(): UserRoles {
  const { user } = useAuth();
  const [roles, setRoles] = useState<UserRoles>({
    isAdmin: false,
    isSolutionAdmin: false,
    isRegularUser: false,
    loading: true,
  });

  useEffect(() => {
    if (!user) {
      cachedRoles = null;
      setRoles({ isAdmin: false, isSolutionAdmin: false, isRegularUser: false, loading: false });
      return;
    }

    if (cachedRoles && cachedRoles.userId === user.id) {
      setRoles({ ...cachedRoles.roles, loading: false });
      return;
    }

    // Single query instead of 3 RPC calls
    supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .then(({ data }) => {
        const roleSet = new Set((data || []).map((r) => r.role));
        const result = {
          isAdmin: roleSet.has('admin'),
          isRegularUser: roleSet.has('user'),
          isSolutionAdmin: roleSet.has('solution_admin'),
        };
        cachedRoles = { userId: user.id, roles: result };
        setRoles({ ...result, loading: false });
      });
  }, [user]);

  return roles;
}
