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

    Promise.all([
      supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' }),
      supabase.rpc('has_role', { _user_id: user.id, _role: 'user' }),
      supabase.rpc('has_role', { _user_id: user.id, _role: 'solution_admin' }),
    ]).then(([adminRes, userRes, solutionRes]) => {
      const result = {
        isAdmin: !!adminRes.data,
        isRegularUser: !!userRes.data,
        isSolutionAdmin: !!solutionRes.data,
      };
      cachedRoles = { userId: user.id, roles: result };
      setRoles({ ...result, loading: false });
    });
  }, [user]);

  return roles;
}
