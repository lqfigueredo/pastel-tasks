import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, FileText, CalendarDays, Users, AlertCircle, Search, X, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { CreateMeetingDialog } from '@/components/meetings/CreateMeetingDialog';
import { HelpButton } from '@/components/HelpButton';

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
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<MeetingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const fetchMeetings = async () => {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('meeting_minutes')
      .select('*')
      .order('meeting_date', { ascending: false });

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    const enriched = await Promise.all(
      (data || []).map(async (m) => {
        const [{ count: pCount }, { count: penCount }] = await Promise.all([
          supabase.from('meeting_participants').select('*', { count: 'exact', head: true }).eq('meeting_id', m.id),
          supabase.from('meeting_pendencies').select('*', { count: 'exact', head: true }).eq('meeting_id', m.id),
        ]);
        return { ...m, participant_count: pCount ?? 0, pendency_count: penCount ?? 0 };
      })
    );

    setMeetings(enriched);
    setLoading(false);
  };

  useEffect(() => {
    fetchMeetings();
  }, [user]);

  const filteredMeetings = useMemo(() => {
    return meetings.filter((m) => {
      if (search && !m.description.toLowerCase().includes(search.toLowerCase())) return false;
      if (dateFrom && m.meeting_date < format(dateFrom, 'yyyy-MM-dd')) return false;
      if (dateTo && m.meeting_date > format(dateTo, 'yyyy-MM-dd')) return false;
      return true;
    });
  }, [meetings, search, dateFrom, dateTo]);

  const hasFilters = search || dateFrom || dateTo;

  const clearFilters = () => {
    setSearch('');
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">Atas de Reunião</h1>
            <HelpButton pageKey="meetings" />
          </div>
          <p className="text-sm text-muted-foreground">Gerencie suas atas e pendências</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nova Ata
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Data início"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className="p-3 pointer-events-auto" locale={ptBR} />
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateTo ? format(dateTo, "dd/MM/yyyy") : "Data fim"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className="p-3 pointer-events-auto" locale={ptBR} />
          </PopoverContent>
        </Popover>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="mr-1 h-4 w-4" /> Limpar
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : filteredMeetings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">{hasFilters ? 'Nenhuma ata encontrada com os filtros aplicados' : 'Nenhuma ata encontrada'}</p>
            {!hasFilters && (
              <Button variant="outline" className="mt-4" onClick={() => setDialogOpen(true)}>
                Criar primeira ata
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredMeetings.map((m) => (
            <Card
              key={m.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => navigate(`/atas/${m.id}`)}
            >
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarDays className="h-4 w-4" />
                  {format(new Date(m.meeting_date + 'T00:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </div>
                <p className="line-clamp-2 text-sm text-foreground">{m.description}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" /> {m.participant_count} participante(s)
                  </span>
                  <span className="flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" /> {m.pendency_count} pendência(s)
                  </span>
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
