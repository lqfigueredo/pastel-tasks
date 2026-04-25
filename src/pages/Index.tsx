import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Plus, X, Download, Calendar as CalendarIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { ptBR } from 'date-fns/locale';
import { KanbanBoard, KanbanBoardRef } from '@/components/kanban/KanbanBoard';
import { CreateTaskDialog } from '@/components/kanban/CreateTaskDialog';
import { useUserRoles } from '@/hooks/useUserRoles';
import { HelpButton } from '@/components/HelpButton';
import { useProfilesQuery } from '@/hooks/useProfilesQuery';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { KanbanSavedFilters } from '@/components/kanban/KanbanSavedFilters';
import { useTasksQuery } from '@/hooks/useTasksQuery';
import { useStatusesQuery } from '@/hooks/useStatusesQuery';
import { buildCsv, downloadCsv } from '@/lib/csv-export';
import { toast } from 'sonner';
import { format } from 'date-fns';

const Index = () => {
  const [createOpen, setCreateOpen] = useState(false);
  const { user } = useAuth();
  // Default filter: show only the logged-in user's tasks. Users can switch to
  // "Todos os responsáveis" via the existing selector to see the full team board.
  const [filterAssigneeId, setFilterAssigneeId] = useState<string | null>(user?.id ?? null);
  const [counts, setCounts] = useState<{ visible: number; total: number }>({ visible: 0, total: 0 });
  const boardRef = useRef<KanbanBoardRef>(null);
  const { isSolutionAdmin, isAdmin, isRegularUser } = useUserRoles();
  const navigate = useNavigate();
  const { data: profilesMap } = useProfilesQuery();

  const { data: visibleIds } = useQuery({
    queryKey: ['visible-user-ids', user?.id],
    queryFn: async () => {
      if (!user) return new Set<string>();
      const { data } = await supabase.rpc('get_visible_user_ids', { _user_id: user.id });
      return new Set<string>((data as string[] | null) ?? []);
    },
    enabled: !!user,
    staleTime: 120_000,
  });

  useEffect(() => {
    if (isSolutionAdmin && !isAdmin && !isRegularUser) {
      navigate('/financeiro', { replace: true });
    }
  }, [isSolutionAdmin, isAdmin, isRegularUser, navigate]);

  // When auth resolves after first render, default the filter to the logged-in user
  // (only if user hasn't manually changed it yet — i.e. it's still null).
  useEffect(() => {
    setFilterAssigneeId((current) => (current === null && user?.id ? user.id : current));
  }, [user?.id]);

  const handleTaskCreated = () => {
    boardRef.current?.refresh();
  };

  const handleCountChange = useCallback((visible: number, total: number) => {
    setCounts({ visible, total });
  }, []);

  const profiles = useMemo(
    () =>
      profilesMap && visibleIds
        ? Array.from(profilesMap.values()).filter((p) => visibleIds.has(p.user_id))
        : [],
    [profilesMap, visibleIds],
  );

  const filteredAssignee = filterAssigneeId
    ? profiles.find((p) => p.user_id === filterAssigneeId)
    : null;

  const subtitle = filterAssigneeId
    ? `${counts.visible} de ${counts.total} tarefa${counts.total === 1 ? '' : 's'}`
    : `${counts.total} tarefa${counts.total === 1 ? '' : 's'} no total`;

  const { data: tasksData } = useTasksQuery();
  const { data: statuses } = useStatusesQuery();

  const handleExportCsv = useCallback(() => {
    const allTasks = tasksData?.tasks ?? [];
    const statusMap = new Map((statuses ?? []).map((s) => [s.id, s.name]));

    // Match the same filter applied to the visible board
    const tasks = filterAssigneeId
      ? allTasks.filter((t) => t.assignees.some((a) => a.user_id === filterAssigneeId))
      : allTasks;

    if (tasks.length === 0) {
      toast.info('Nenhuma tarefa para exportar');
      return;
    }

    const headers = [
      'ID',
      'Título',
      'Descrição',
      'Status',
      'Responsáveis',
      'Data início',
      'Prazo estimado',
      'Data fim',
      'Crítica',
      'Criada em',
    ];

    const rows = tasks.map((t) => [
      t.id,
      t.title,
      t.description ?? '',
      statusMap.get(t.status_id) ?? '',
      t.assignees.map((a) => a.display_name || 'Sem nome').join('; '),
      t.start_date ?? '',
      t.estimated_delivery_date ?? '',
      t.end_date ?? '',
      t.is_critical ? 'Sim' : 'Não',
      t.created_at ? format(new Date(t.created_at), 'dd/MM/yyyy HH:mm') : '',
    ]);

    const csv = buildCsv(headers, rows);
    const filename = `tarefas_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    downloadCsv(filename, csv);
    toast.success(`CSV exportado com ${tasks.length} tarefa${tasks.length === 1 ? '' : 's'}`);
  }, [tasksData, statuses, filterAssigneeId]);


  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-foreground">Minhas Tarefas</h1>
            <HelpButton pageKey="tasks" />
          </div>
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            <p className="text-sm text-muted-foreground">{subtitle}</p>
            {filteredAssignee && (
              <Badge variant="secondary" className="gap-1 pl-2 pr-1">
                <span className="text-xs">Filtro: {filteredAssignee.display_name || 'Sem nome'}</span>
                <button
                  type="button"
                  onClick={() => setFilterAssigneeId(null)}
                  className="rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors"
                  aria-label="Remover filtro"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <KanbanSavedFilters
            current={{ assigneeId: filterAssigneeId }}
            onApply={(f) => setFilterAssigneeId(f.assigneeId ?? null)}
          />
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
          <Button variant="outline" onClick={handleExportCsv} className="gap-2">
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Tarefa
          </Button>
        </div>
      </div>
      <KanbanBoard ref={boardRef} filterAssigneeId={filterAssigneeId} onCountChange={handleCountChange} />
      <CreateTaskDialog open={createOpen} onOpenChange={setCreateOpen} onTaskCreated={handleTaskCreated} />
    </div>
  );
};

export default Index;
