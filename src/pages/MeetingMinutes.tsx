import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, FileText, CalendarDays, Users, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CreateMeetingDialog } from '@/components/meetings/CreateMeetingDialog';

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

    // Fetch counts
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Atas de Reunião</h1>
          <p className="text-sm text-muted-foreground">Gerencie suas atas e pendências</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nova Ata
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : meetings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">Nenhuma ata encontrada</p>
            <Button variant="outline" className="mt-4" onClick={() => setDialogOpen(true)}>
              Criar primeira ata
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {meetings.map((m) => (
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
