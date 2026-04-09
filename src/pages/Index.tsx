import { useState, useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { KanbanBoard, KanbanBoardRef } from '@/components/kanban/KanbanBoard';
import { CreateTaskDialog } from '@/components/kanban/CreateTaskDialog';
import { useUserRoles } from '@/hooks/useUserRoles';
import { HelpButton } from '@/components/HelpButton';
import { useProfilesQuery, ProfileInfo } from '@/hooks/useProfilesQuery';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const Index = () => {
  const [createOpen, setCreateOpen] = useState(false);
  const [filterAssigneeId, setFilterAssigneeId] = useState<string | null>(null);
  const boardRef = useRef<KanbanBoardRef>(null);
  const { isSolutionAdmin, isAdmin, isRegularUser } = useUserRoles();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profilesMap } = useProfilesQuery();

  const { data: visibleIds } = useQuery({
    queryKey: ['visible-user-ids', user?.id],
    queryFn: async () => {
      if (!user) return new Set<string>();

      const [{ data: myTeams }, { data: approvals }] = await Promise.all([
        supabase.from('team_members').select('team_id').eq('user_id', user.id),
        supabase.from('user_approvals').select('user_id').eq('created_by_admin', user.id),
      ]);

      const teamIds = myTeams?.map(t => t.team_id) || [];
      let teammateIds: string[] = [];
      if (teamIds.length > 0) {
        const { data: teammates } = await supabase
          .from('team_members')
          .select('user_id')
          .in('team_id', teamIds);
        teammateIds = teammates?.map(t => t.user_id) || [];
      }

      return new Set([
        user.id,
        ...(approvals?.map(a => a.user_id) || []),
        ...teammateIds,
      ]);
    },
    enabled: !!user,
    staleTime: 120_000,
  });

  useEffect(() => {
    if (isSolutionAdmin && !isAdmin && !isRegularUser) {
      navigate('/financeiro', { replace: true });
    }
  }, [isSolutionAdmin, isAdmin, isRegularUser, navigate]);

  const handleTaskCreated = () => {
    boardRef.current?.refresh();
  };

  const profiles = profilesMap && visibleIds
    ? Array.from(profilesMap.values()).filter(p => visibleIds.has(p.user_id))
    : [];

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-foreground">Minhas Tarefas</h1>
            <HelpButton pageKey="tasks" />
          </div>
          <p className="text-sm text-muted-foreground">Gerencie suas atividades no quadro Kanban</p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={filterAssigneeId ?? 'all'}
            onValueChange={(v) => setFilterAssigneeId(v === 'all' ? null : v)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrar por responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os responsáveis</SelectItem>
              {profiles.map((p) => (
                <SelectItem key={p.user_id} value={p.user_id}>
                  {p.display_name || 'Sem nome'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Tarefa
          </Button>
        </div>
      </div>
      <KanbanBoard ref={boardRef} filterAssigneeId={filterAssigneeId} />
      <CreateTaskDialog open={createOpen} onOpenChange={setCreateOpen} onTaskCreated={handleTaskCreated} />
    </div>
  );
};

export default Index;
