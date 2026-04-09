import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CalendarDays, Plus, CheckCircle2, Circle, UserRound, Pencil, Paperclip } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AddPendencyDialog } from '@/components/meetings/AddPendencyDialog';
import { EditMeetingDialog } from '@/components/meetings/EditMeetingDialog';
import { MeetingAttachments } from '@/components/meetings/MeetingAttachments';
import { MeetingRecorder } from '@/components/meetings/MeetingRecorder';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Pendency {
  id: string;
  description: string;
  responsible_user_id: string | null;
  responsible_external_name: string | null;
  due_date: string | null;
  is_completed: boolean;
  completed_at: string | null;
  responsible_name?: string;
}

interface Participant {
  user_id: string;
  display_name: string;
}

export default function MeetingMinuteDetail() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [meeting, setMeeting] = useState<any>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [externalParticipants, setExternalParticipants] = useState<string[]>([]);
  const [pendencies, setPendencies] = useState<Pendency[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendencyDialogOpen, setPendencyDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const loadData = async (showLoading: boolean) => {
    if (!meetingId) return;
    if (showLoading) setLoading(true);

    const [{ data: meetingData }, { data: partData }, { data: pendData }] = await Promise.all([
      supabase.from('meeting_minutes').select('*').eq('id', meetingId).single(),
      supabase.from('meeting_participants').select('user_id').eq('meeting_id', meetingId),
      supabase.from('meeting_pendencies').select('*').eq('meeting_id', meetingId).order('created_at'),
    ]);

    setMeeting(meetingData);
    setExternalParticipants((meetingData as any)?.external_participants || []);

    // Fetch participant profiles
    if (partData && partData.length > 0) {
      const userIds = partData.map((p) => p.user_id);
      if (meetingData?.created_by && !userIds.includes(meetingData.created_by)) {
        userIds.push(meetingData.created_by);
      }
      const { data: profiles } = await supabase.from('profiles').select('user_id, display_name').in('user_id', userIds);
      setParticipants(
        (profiles || []).map((p) => ({ user_id: p.user_id, display_name: p.display_name || 'Sem nome' }))
      );
    }

    // Enrich pendencies with responsible name
    if (pendData && pendData.length > 0) {
      const responsibleIds = [...new Set(pendData.filter((p) => p.responsible_user_id).map((p) => p.responsible_user_id!))];
      let profileMap: Record<string, string> = {};
      if (responsibleIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('user_id, display_name').in('user_id', responsibleIds);
        profileMap = Object.fromEntries((profiles || []).map((p) => [p.user_id, p.display_name || 'Sem nome']));
      }
      setPendencies(pendData.map((p) => ({
        ...p,
        responsible_name: p.responsible_user_id
          ? (profileMap[p.responsible_user_id] || 'Desconhecido')
          : (p.responsible_external_name ? `${p.responsible_external_name} (Externo)` : 'Não definido'),
      })));
    } else {
      setPendencies([]);
    }

    if (showLoading) setLoading(false);
  };

  const fetchAll = () => loadData(true);
  const refreshData = () => loadData(false);

  useEffect(() => {
    fetchAll();
  }, [meetingId]);

  const togglePendency = async (pendency: Pendency) => {
    const newCompleted = !pendency.is_completed;
    const { error } = await supabase
      .from('meeting_pendencies')
      .update({
        is_completed: newCompleted,
        completed_at: newCompleted ? new Date().toISOString() : null,
      })
      .eq('id', pendency.id);

    if (error) {
      toast.error('Erro ao atualizar pendência');
      return;
    }

    // Sync linked task in Kanban
    const { data: linkedTask } = await supabase
      .from('tasks')
      .select('id')
      .eq('meeting_pendency_id', pendency.id)
      .maybeSingle();

    if (linkedTask) {
      await supabase.from('tasks').update({
        actual_end_date: newCompleted ? new Date().toISOString().split('T')[0] : null,
      }).eq('id', linkedTask.id);
    }

    setPendencies((prev) =>
      prev.map((p) =>
        p.id === pendency.id ? { ...p, is_completed: newCompleted, completed_at: newCompleted ? new Date().toISOString() : null } : p
      )
    );
    toast.success(newCompleted ? 'Pendência encerrada' : 'Pendência reaberta');
  };

  if (loading) return <p className="text-muted-foreground">Carregando...</p>;
  if (!meeting) return <p className="text-destructive">Ata não encontrada.</p>;

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate('/atas')} className="mb-2">
        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
      </Button>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              {format(new Date(meeting.meeting_date + 'T00:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </div>
            <CardTitle className="text-lg mt-1">Descrição da Reunião</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <MeetingRecorder meetingId={meetingId!} onRecorded={refreshData} />
            {meeting.created_by === user?.id && (
              <Button size="sm" variant="outline" onClick={() => setEditDialogOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" /> Editar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="whitespace-pre-wrap text-sm text-foreground">{meeting.description}</p>

          <div>
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">Participantes</h3>
            <div className="flex flex-wrap gap-2">
              {participants.map((p) => (
                <div key={p.user_id} className="flex items-center gap-1.5">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-[10px]">{getInitials(p.display_name)}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-foreground">{p.display_name}</span>
                </div>
              ))}
              {externalParticipants.map((name) => (
                <div key={`ext-${name}`} className="flex items-center gap-1.5">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-[10px] bg-muted">
                      <UserRound className="h-3 w-3" />
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-foreground">{name}</span>
                  <Badge variant="outline" className="text-[10px] px-1 py-0">Externo</Badge>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Pendências</CardTitle>
          <Button size="sm" onClick={() => setPendencyDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Adicionar
          </Button>
        </CardHeader>
        <CardContent>
          {pendencies.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma pendência registrada.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Data Conclusão</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendencies.map((p) => (
                  <TableRow key={p.id} className={cn(p.is_completed && 'opacity-60')}>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => togglePendency(p)}>
                        {p.is_completed ? (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className={cn(p.is_completed && 'line-through text-muted-foreground')}>
                      {p.description}
                    </TableCell>
                    <TableCell className={cn(p.is_completed && 'line-through text-muted-foreground')}>
                      {p.responsible_name}
                    </TableCell>
                    <TableCell className={cn(p.is_completed && 'line-through text-muted-foreground')}>
                      {p.due_date
                        ? format(new Date(p.due_date + 'T00:00:00'), 'dd/MM/yyyy')
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.is_completed ? 'secondary' : 'outline'}>
                        {p.is_completed ? 'Encerrada' : 'Aberta'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Paperclip className="h-4 w-4" /> Anexos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MeetingAttachments
            meetingId={meetingId!}
            canUpload={meeting.created_by === user?.id || participants.some(p => p.user_id === user?.id)}
            createdBy={meeting.created_by}
          />
        </CardContent>
      </Card>

      <AddPendencyDialog
        open={pendencyDialogOpen}
        onOpenChange={setPendencyDialogOpen}
        meetingId={meetingId!}
        participants={participants}
        externalParticipants={externalParticipants}
        onCreated={refreshData}
      />

      {meeting && (
        <EditMeetingDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onUpdated={refreshData}
          meeting={meeting}
          currentParticipantIds={participants.map(p => p.user_id)}
        />
      )}
    </div>
  );
}
