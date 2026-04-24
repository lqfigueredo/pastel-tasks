import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FinancialLead {
  id: string;
  name: string;
  email: string;
  created_at: string;
  replied_at: string | null;
  reply_message: string | null;
}

export interface FinancialApproval {
  id: string;
  user_id: string;
  status: string;
  requested_at: string;
  reviewed_at: string | null;
  license_expires_at: string | null;
  display_name: string;
  email: string;
  created_by_admin: string | null;
}

export interface FinancialAdminLimit {
  admin_user_id: string;
  display_name: string;
  max_users: number;
  current_users: number;
}

export interface FinancialOverview {
  leads: FinancialLead[];
  approvals: FinancialApproval[];
  adminLimits: FinancialAdminLimit[];
}

const KEY = ['financial-overview'] as const;

async function fetchOverview(): Promise<FinancialOverview> {
  const [leadsRes, approvalsRes, adminSettingsRes] = await Promise.all([
    supabase
      .from('leads')
      .select('id, name, email, created_at, replied_at, reply_message')
      .order('created_at', { ascending: false }),
    supabase
      .from('user_approvals')
      .select('id, user_id, status, requested_at, reviewed_at, license_expires_at, created_by_admin')
      .order('requested_at', { ascending: false }),
    supabase.from('admin_settings').select('admin_user_id, max_users'),
  ]);

  const leads = (leadsRes.data as FinancialLead[] | null) ?? [];
  const rawApprovals = (approvalsRes.data ?? []) as Array<Omit<FinancialApproval, 'display_name' | 'email'>>;

  if (rawApprovals.length === 0) {
    return { leads, approvals: [], adminLimits: [] };
  }

  const userIds = rawApprovals.map((a) => a.user_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, display_name')
    .in('user_id', userIds);

  const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p.display_name]));

  const approvals: FinancialApproval[] = rawApprovals.map((a) => ({
    ...a,
    display_name: profileMap.get(a.user_id) || 'Sem nome',
    email: '',
  }));

  const { data: adminRoles } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'admin');

  const adminUserIds = (adminRoles ?? []).map((r) => r.user_id);
  const settingsMap = new Map(
    (adminSettingsRes.data ?? []).map((s) => [s.admin_user_id, s.max_users]),
  );

  const adminProfileIds = adminUserIds.filter((id) => !profileMap.has(id));
  const fullProfileMap = new Map(profileMap);
  if (adminProfileIds.length > 0) {
    const { data: adminProfiles } = await supabase
      .from('profiles')
      .select('user_id, display_name')
      .in('user_id', adminProfileIds);
    (adminProfiles ?? []).forEach((p) => fullProfileMap.set(p.user_id, p.display_name));
  }

  const adminLimits: FinancialAdminLimit[] = adminUserIds.map((adminId) => ({
    admin_user_id: adminId,
    display_name: fullProfileMap.get(adminId) || 'Sem nome',
    max_users: settingsMap.get(adminId) ?? 10,
    current_users: rawApprovals.filter((a) => a.created_by_admin === adminId).length,
  }));

  return { leads, approvals, adminLimits };
}

export function useFinancialDataQuery(enabled: boolean) {
  return useQuery({
    queryKey: KEY,
    queryFn: fetchOverview,
    enabled,
    staleTime: 30_000,
  });
}

export function useInvalidateFinancialData() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: KEY });
}
