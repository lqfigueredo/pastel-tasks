import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TeamData {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  max_members: number;
}

export interface TeamMember {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  joined_at: string;
}

export interface TeamTask {
  id: string;
  title: string;
  status_name: string;
  status_color: string;
  estimated_delivery_date: string | null;
  assignees: string[];
}

export interface TeamDetail {
  team: TeamData | null;
  members: TeamMember[];
  tasks: TeamTask[];
}

async function fetchTeamDetail(teamId: string): Promise<TeamDetail> {
  const { data: teamData } = await supabase
    .from('teams')
    .select('id, name, description, created_by, max_members')
    .eq('id', teamId)
    .single();

  if (!teamData) return { team: null, members: [], tasks: [] };

  const { data: memberRows } = await supabase
    .from('team_members')
    .select('user_id, joined_at')
    .eq('team_id', teamData.id);

  let members: TeamMember[] = [];
  if (memberRows && memberRows.length > 0) {
    const userIds = memberRows.map((m) => m.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url')
      .in('user_id', userIds);

    members = memberRows.map((m) => {
      const p = profiles?.find((p) => p.user_id === m.user_id);
      return {
        user_id: m.user_id,
        display_name: p?.display_name || 'Usuário',
        avatar_url: p?.avatar_url || null,
        joined_at: m.joined_at,
      };
    });
  }

  const { data: taskRows } = await supabase
    .from('tasks')
    .select('id, title, status_id, estimated_delivery_date')
    .eq('team_id', teamData.id)
    .order('created_at', { ascending: false });

  let tasks: TeamTask[] = [];
  if (taskRows && taskRows.length > 0) {
    const statusIds = [...new Set(taskRows.map((t) => t.status_id))];
    const { data: statuses } = await supabase
      .from('task_statuses')
      .select('id, name, color')
      .in('id', statusIds);

    const taskIds = taskRows.map((t) => t.id);
    const { data: assigneeRows } = await supabase
      .from('task_assignees')
      .select('task_id, user_id')
      .in('task_id', taskIds);

    const assigneeUserIds = [...new Set(assigneeRows?.map((a) => a.user_id) || [])];
    const { data: assigneeProfiles } =
      assigneeUserIds.length > 0
        ? await supabase
            .from('profiles')
            .select('user_id, display_name')
            .in('user_id', assigneeUserIds)
        : { data: [] as Array<{ user_id: string; display_name: string }> };

    tasks = taskRows.map((t) => {
      const s = statuses?.find((s) => s.id === t.status_id);
      const taskAssignees = assigneeRows?.filter((a) => a.task_id === t.id) || [];
      const names = taskAssignees.map((a) => {
        const p = assigneeProfiles?.find((p) => p.user_id === a.user_id);
        return p?.display_name || 'Usuário';
      });
      return {
        id: t.id,
        title: t.title,
        status_name: s?.name || 'Desconhecido',
        status_color: s?.color || '#94A3B8',
        estimated_delivery_date: t.estimated_delivery_date,
        assignees: names,
      };
    });
  }

  return { team: teamData, members, tasks };
}

export function useTeamDetailQuery(teamId: string | undefined) {
  return useQuery({
    queryKey: ['team-detail', teamId],
    queryFn: () => fetchTeamDetail(teamId!),
    enabled: !!teamId,
    staleTime: 30_000,
  });
}

export function useInvalidateTeamDetail() {
  const queryClient = useQueryClient();
  return (teamId: string) =>
    queryClient.invalidateQueries({ queryKey: ['team-detail', teamId] });
}
