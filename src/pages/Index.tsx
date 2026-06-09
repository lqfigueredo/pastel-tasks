import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Plus, X, Download, Calendar as CalendarIcon, LayoutGrid, Archive, SlidersHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { getCurrentLocale } from '@/lib/date';
import { KanbanBoard, KanbanBoardRef } from '@/components/kanban/KanbanBoard';
import { CreateTaskDialog } from '@/components/kanban/CreateTaskDialog';
import { useUserRoles } from '@/hooks/useUserRoles';
import { HelpButton } from '@/components/HelpButton';
import { useProfilesQuery } from '@/hooks/useProfilesQuery';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
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
  const isMobile = useIsMobile();
  const [filtersSheetOpen, setFiltersSheetOpen] = useState(false);
  const { t } = useTranslation('kanban');
  const [createOpen, setCreateOpen] = useState(false);
  const { user } = useAuth();
  const [filterAssigneeId, setFilterAssigneeId] = useState<string | null>(user?.id ?? null);
  const [counts, setCounts] = useState<{ visible: number; total: number }>({ visible: 0, total: 0 });
  const [exportStartDate, setExportStartDate] = useState<Date | undefined>(undefined);
  const [exportEndDate, setExportEndDate] = useState<Date | undefined>(undefined);
  const [exportPopoverOpen, setExportPopoverOpen] = useState(false);
  const [showCompleted, setShowCompleted] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('kanban-show-completed') === '1';
  });
  useEffect(() => {
    window.localStorage.setItem('kanban-show-completed', showCompleted ? '1' : '0');
  }, [showCompleted]);
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

  useEffect(() => {
    setFilterAssigneeId((current) => (current === null && user?.id ? user.id : current));
  }, [user?.id]);

  const handleTaskCreated = () => boardRef.current?.refresh();
  const handleCountChange = useCallback((visible: number, total: number) => setCounts({ visible, total }), []);

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
    ? t('page.subtitleFiltered', { visible: counts.visible, total: counts.total, count: counts.total })
    : t('page.subtitleAll', { count: counts.total });

  const { data: tasksData } = useTasksQuery();
  const { data: statuses } = useStatusesQuery();

  const handleExportCsv = useCallback(() => {
    const allTasks = tasksData?.tasks ?? [];
    const statusMap = new Map((statuses ?? []).map((s) => [s.id, s.name]));

    let tasks = filterAssigneeId
      ? allTasks.filter((t) => t.assignees.some((a) => a.user_id === filterAssigneeId))
      : allTasks;

    if (exportStartDate || exportEndDate) {
      const startMs = exportStartDate ? new Date(exportStartDate).setHours(0, 0, 0, 0) : -Infinity;
      const endMs = exportEndDate ? new Date(exportEndDate).setHours(23, 59, 59, 999) : Infinity;
      tasks = tasks.filter((tk) => {
        if (!tk.created_at) return false;
        const ms = new Date(tk.created_at).getTime();
        return ms >= startMs && ms <= endMs;
      });
    }

    if (tasks.length === 0) {
      toast.info(t('export.empty'));
      return;
    }

    const headers = [
      t('export.headers.id'),
      t('export.headers.title'),
      t('export.headers.description'),
      t('export.headers.status'),
      t('export.headers.assignees'),
      t('export.headers.startDate'),
      t('export.headers.estimatedDate'),
      t('export.headers.endDate'),
      t('export.headers.critical'),
      t('export.headers.createdAt'),
    ];

    const rows = tasks.map((tk) => [
      tk.id,
      tk.title,
      tk.description ?? '',
      statusMap.get(tk.status_id) ?? '',
      tk.assignees.map((a) => a.display_name || t('export.noAssigneeName')).join('; '),
      tk.start_date ?? '',
      tk.estimated_delivery_date ?? '',
      tk.end_date ?? '',
      tk.is_critical ? t('export.yes') : t('export.no'),
      tk.created_at ? format(new Date(tk.created_at), 'dd/MM/yyyy HH:mm') : '',
    ]);

    const csv = buildCsv(headers, rows);
    const filename = `tarefas_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    downloadCsv(filename, csv);
    toast.success(t('export.success', { count: tasks.length }));
    setExportPopoverOpen(false);
  }, [tasksData, statuses, filterAssigneeId, exportStartDate, exportEndDate, t]);

  const clearExportDates = useCallback(() => {
    setExportStartDate(undefined);
    setExportEndDate(undefined);
  }, []);

  const dateLocale = getCurrentLocale();

  return (
    <div className="animate-fade-in min-w-0">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-xl md:text-2xl font-bold text-foreground truncate">{t('page.title')}</h1>
            <HelpButton pageKey="tasks" />
          </div>
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
            {filteredAssignee && (
              <Badge variant="secondary" className="gap-1 pl-2 pr-1">
                <span className="text-xs truncate max-w-[160px]">
                  {t('page.filterPrefix', { name: filteredAssignee.display_name || t('page.noName') })}
                </span>
                <button
                  type="button"
                  onClick={() => setFilterAssigneeId(null)}
                  className="rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors shrink-0"
                  aria-label={t('page.removeFilter')}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>
        </div>
        <div className="hidden md:flex flex-wrap items-center gap-2 md:gap-3 w-full md:w-auto">
          <KanbanSavedFilters
            current={{ assigneeId: filterAssigneeId }}
            onApply={(f) => setFilterAssigneeId(f.assigneeId ?? null)}
          />
          <Select
            value={filterAssigneeId ?? 'all'}
            onValueChange={(v) => setFilterAssigneeId(v === 'all' ? null : v)}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder={t('page.filterByAssignee')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('page.allAssignees')}</SelectItem>
              {profiles.map((p) => (
                <SelectItem key={p.user_id} value={p.user_id}>
                  {p.display_name || t('page.noName')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Popover open={exportPopoverOpen} onOpenChange={setExportPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2 flex-1 sm:flex-none">
                <Download className="h-4 w-4" />
                {t('export.trigger')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold">{t('export.title')}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{t('export.description')}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">{t('export.startDate')}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !exportStartDate && 'text-muted-foreground',
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {exportStartDate ? format(exportStartDate, 'dd/MM/yyyy') : t('export.select')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={exportStartDate}
                        onSelect={setExportStartDate}
                        locale={dateLocale}
                        disabled={(date) => (exportEndDate ? date > exportEndDate : false)}
                        initialFocus
                        className={cn('p-3 pointer-events-auto')}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">{t('export.endDate')}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !exportEndDate && 'text-muted-foreground',
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {exportEndDate ? format(exportEndDate, 'dd/MM/yyyy') : t('export.select')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={exportEndDate}
                        onSelect={setExportEndDate}
                        locale={dateLocale}
                        disabled={(date) => (exportStartDate ? date < exportStartDate : false)}
                        initialFocus
                        className={cn('p-3 pointer-events-auto')}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex justify-between gap-2 pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearExportDates}
                    disabled={!exportStartDate && !exportEndDate}
                  >
                    {t('export.clear')}
                  </Button>
                  <Button size="sm" onClick={handleExportCsv} className="gap-2">
                    <Download className="h-4 w-4" />
                    {t('export.download')}
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Button
            variant={showCompleted ? 'secondary' : 'outline'}
            onClick={() => setShowCompleted((v) => !v)}
            className="gap-2 flex-1 sm:flex-none"
            title={showCompleted ? t('page.hideCompleted') : t('page.showCompleted')}
          >
            <Archive className="h-4 w-4" />
            {showCompleted ? t('page.hideCompleted') : t('page.showCompleted')}
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/configuracoes')}
            className="gap-2 flex-1 sm:flex-none"
          >
            <LayoutGrid className="h-4 w-4" />
            {t('page.newKanban')}
          </Button>
          <Button onClick={() => setCreateOpen(true)} className="gap-2 flex-1 sm:flex-none">
            <Plus className="h-4 w-4" />
            {t('page.newTask')}
          </Button>
        </div>

        {/* Mobile compact controls */}
        <div className="flex md:hidden items-center gap-2 w-full">
          <Select
            value={filterAssigneeId ?? 'all'}
            onValueChange={(v) => setFilterAssigneeId(v === 'all' ? null : v)}
          >
            <SelectTrigger className="h-11 flex-1">
              <SelectValue placeholder={t('page.filterByAssignee')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('page.allAssignees')}</SelectItem>
              {profiles.map((p) => (
                <SelectItem key={p.user_id} value={p.user_id}>
                  {p.display_name || t('page.noName')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Sheet open={filtersSheetOpen} onOpenChange={setFiltersSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="h-11 w-11 shrink-0" aria-label={t('export.title')}>
                <SlidersHorizontal className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl">
              <SheetHeader>
                <SheetTitle>{t('export.title')}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-3">
                <Button
                  variant={showCompleted ? 'secondary' : 'outline'}
                  onClick={() => setShowCompleted((v) => !v)}
                  className="w-full h-12 justify-start gap-2"
                >
                  <Archive className="h-4 w-4" />
                  {showCompleted ? t('page.hideCompleted') : t('page.showCompleted')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { setFiltersSheetOpen(false); navigate('/configuracoes'); }}
                  className="w-full h-12 justify-start gap-2"
                >
                  <LayoutGrid className="h-4 w-4" />
                  {t('page.newKanban')}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleExportCsv}
                  className="w-full h-12 justify-start gap-2"
                >
                  <Download className="h-4 w-4" />
                  {t('export.download')}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      <KanbanBoard ref={boardRef} filterAssigneeId={filterAssigneeId} showCompleted={showCompleted} onCountChange={handleCountChange} />
      {isMobile && (
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          aria-label={t('page.newTask')}
          className="md:hidden fixed right-4 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center active:scale-95 transition-transform"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5.5rem)' }}
        >
          <Plus className="h-6 w-6" />
        </button>
      )}
      <CreateTaskDialog open={createOpen} onOpenChange={setCreateOpen} onTaskCreated={handleTaskCreated} />
    </div>
  );
};

export default Index;
