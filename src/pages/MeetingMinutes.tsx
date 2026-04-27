import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, FileText, CalendarDays, Users, AlertCircle, Search, X, CalendarIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { getCurrentLocale } from '@/lib/date';
import { cn } from '@/lib/utils';
import { CreateMeetingDialog } from '@/components/meetings/CreateMeetingDialog';
import { HelpButton } from '@/components/HelpButton';
import { EmptyState } from '@/components/ui/empty-state';
import { ListSkeleton } from '@/components/ui/loaders';

interface MeetingRow {
  id: string;
  meeting_date: string;
  description: string;
  created_by: string;
  created_at: string;
  participant_count?: number;
  pendency_count?: number;
}

export default function MeetingMinutes() {
  const { user } = useAuth();
  const { t } = useTranslation('meetings');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [onlyWithPendencies, setOnlyWithPendencies] = useState(false);

  const { data: meetings = [], isLoading: loading } = useQuery({
    queryKey: ['meetings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meeting_minutes')
        .select('*, meeting_participants(count)')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const meetingIds = (data || []).map((m: any) => m.id);
      const openCounts = new Map<string, number>();
      if (meetingIds.length > 0) {
        const { data: openPend, error: pErr } = await supabase
          .from('meeting_pendencies')
          .select('meeting_id')
          .eq('is_completed', false)
          .in('meeting_id', meetingIds);
        if (pErr) throw pErr;
        for (const row of openPend || []) {
          openCounts.set(row.meeting_id, (openCounts.get(row.meeting_id) || 0) + 1);
        }
      }

      return (data || []).map((m: any) => ({
        ...m,
        participant_count: m.meeting_participants?.[0]?.count ?? 0,
        pendency_count: openCounts.get(m.id) ?? 0,
      })) as MeetingRow[];
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const fetchMeetings = () => queryClient.invalidateQueries({ queryKey: ['meetings', user?.id] });

  const filteredMeetings = useMemo(() => {
    return meetings.filter((m) => {
      if (search && !m.description.toLowerCase().includes(search.toLowerCase())) return false;
      if (dateFrom && m.meeting_date < format(dateFrom, 'yyyy-MM-dd')) return false;
      if (dateTo && m.meeting_date > format(dateTo, 'yyyy-MM-dd')) return false;
      if (onlyWithPendencies && (!m.pendency_count || m.pendency_count === 0)) return false;
      return true;
    });
  }, [meetings, search, dateFrom, dateTo, onlyWithPendencies]);

  const hasFilters = search || dateFrom || dateTo || onlyWithPendencies;

  const clearFilters = () => {
    setSearch('');
    setDateFrom(undefined);
    setDateTo(undefined);
    setOnlyWithPendencies(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">{t('list.title')}</h1>
            <HelpButton pageKey="meetings" />
          </div>
          <p className="text-sm text-muted-foreground">{t('list.subtitle')}</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> {t('list.newMeeting')}
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('list.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateFrom ? format(dateFrom, "dd/MM/yyyy") : t('list.dateFrom')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className="p-3 pointer-events-auto" locale={getCurrentLocale()} />
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateTo ? format(dateTo, "dd/MM/yyyy") : t('list.dateTo')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className="p-3 pointer-events-auto" locale={getCurrentLocale()} />
          </PopoverContent>
        </Popover>
        <Button
          variant={onlyWithPendencies ? "default" : "outline"}
          size="sm"
          onClick={() => setOnlyWithPendencies(!onlyWithPendencies)}
          className="gap-1"
        >
          <AlertCircle className="h-4 w-4" />
          {t('list.withPendencies')}
        </Button>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="mr-1 h-4 w-4" /> {t('list.clear')}
          </Button>
        )}
      </div>

      {loading ? (
        <ListSkeleton variant="card" rows={6} />
      ) : filteredMeetings.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={FileText}
              title={hasFilters ? t('empty.noResultsTitle') : t('empty.noMeetingsTitle')}
              description={
                hasFilters
                  ? t('empty.noResultsDesc')
                  : t('empty.noMeetingsDesc')
              }
              action={
                hasFilters
                  ? { label: t('empty.clearFilters'), onClick: clearFilters }
                  : { label: t('empty.createFirst'), onClick: () => setDialogOpen(true) }
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredMeetings.map((m) => (
            <Card
              key={m.id}
              className={cn(
                "cursor-pointer transition-shadow hover:shadow-md",
                m.pendency_count && m.pendency_count > 0 && "border-l-4 border-l-orange-500"
              )}
              onClick={() => navigate(`/atas/${m.id}`)}
            >
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarDays className="h-4 w-4" />
                    {format(new Date(m.meeting_date + 'T00:00:00'), "PPP", { locale: getCurrentLocale() })}
                  </div>
                  {m.pendency_count !== undefined && m.pendency_count > 0 && (
                    <Badge variant="destructive" className="bg-orange-500 hover:bg-orange-600">
                      {t('list.pendencies', { count: m.pendency_count })}
                    </Badge>
                  )}
                </div>
                <p className="line-clamp-2 text-sm text-foreground">{m.description}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" /> {t('list.participants', { count: m.participant_count || 0 })}
                  </span>
                  {(!m.pendency_count || m.pendency_count === 0) && (
                    <span className="flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" /> {t('list.noPendencies')}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateMeetingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={fetchMeetings}
      />
    </div>
  );
}
