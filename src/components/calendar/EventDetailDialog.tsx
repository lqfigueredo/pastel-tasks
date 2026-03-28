import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, MapPin, Clock, FileText, Trash2, UserRound } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  created_by: string;
  meeting_id: string | null;
}

interface Participant {
  id: string;
  user_id: string | null;
  external_name: string | null;
  display_name?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: CalendarEvent | null;
  onUpdated: () => void;
}

export function EventDetailDialog({ open, onOpenChange, event, onUpdated }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<Date>();
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [saving, setSaving] = useState(false);
  const [creatingMeeting, setCreatingMeeting] = useState(false);

  const isOwner = event?.created_by === user?.id;

  useEffect(() => {
    if (!event || !open) return;
    setTitle(event.title);
    setDescription(event.description || '');
    setDate(new Date(event.event_date + 'T00:00:00'));
    setStartTime(event.start_time?.slice(0, 5) || '');
    setEndTime(event.end_time?.slice(0, 5) || '');
    setLocation(event.location || '');
    setEditing(false);

    // Fetch participants
    const fetchParticipants = async () => {
      const { data } = await supabase
        .from('calendar_event_participants')
        .select('id, user_id, external_name')
        .eq('event_id', event.id);

      if (data && data.length > 0) {
        const userIds = data.filter(p => p.user_id).map(p => p.user_id!);
        let profileMap: Record<string, string> = {};
        if (userIds.length > 0) {
          const { data: profiles } = await supabase.from('profiles').select('user_id, display_name').in('user_id', userIds);
          profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p.display_name || 'Sem nome']));
        }
        setParticipants(data.map(p => ({
          ...p,
          display_name: p.user_id ? (profileMap[p.user_id] || 'Sem nome') : undefined,
        })));
      } else {
        setParticipants([]);
      }
    };
    fetchParticipants();
  }, [event, open]);

  const handleSave = async () => {
    if (!event || !date || !title.trim()) return;
    setSaving(true);

    const { error } = await supabase
      .from('calendar_events')
      .update({
        title: title.trim(),
        description: description.trim() || null,
        event_date: format(date, 'yyyy-MM-dd'),
        start_time: startTime || null,
        end_time: endTime || null,
        location: location.trim() || null,
      })
      .eq('id', event.id);

    if (error) {
      toast.error('Erro ao salvar evento');
    } else {
      toast.success('Evento atualizado');
      setEditing(false);
      onUpdated();
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!event) return;
    const { error } = await supabase.from('calendar_events').delete().eq('id', event.id);
    if (error) {
      toast.error('Erro ao excluir evento');
    } else {
      toast.success('Evento excluído');
      onOpenChange(false);
      onUpdated();
    }
  };

  const handleCreateMeeting = async () => {
    if (!event || !user) return;
    setCreatingMeeting(true);

    const { data: meeting, error } = await supabase
      .from('meeting_minutes')
      .insert({
        meeting_date: event.event_date,
        description: event.description || event.title,
        created_by: user.id,
        external_participants: participants.filter(p => p.external_name).map(p => p.external_name!),
      })
      .select('id')
      .single();

    if (error || !meeting) {
      toast.error('Erro ao criar ata');
      setCreatingMeeting(false);
      return;
    }

    // Add user participants to meeting
    const userParticipants = participants.filter(p => p.user_id);
    const meetingParts = [
      { meeting_id: meeting.id, user_id: user.id },
      ...userParticipants.map(p => ({ meeting_id: meeting.id, user_id: p.user_id! })),
    ];
    await supabase.from('meeting_participants').insert(meetingParts);

    // Link event to meeting
    await supabase.from('calendar_events').update({ meeting_id: meeting.id }).eq('id', event.id);

    toast.success('Ata de reunião criada e vinculada');
    setCreatingMeeting(false);
    onUpdated();
  };

  const getInitials = (name: string) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  if (!event) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar Evento' : 'Detalhes do Evento'}</DialogTitle>
          <DialogDescription>
            {editing ? 'Altere os dados do evento' : format(new Date(event.event_date + 'T00:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </DialogDescription>
        </DialogHeader>

        {editing ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Data *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !date && 'text-muted-foreground')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "dd/MM/yyyy") : 'Selecione'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={date} onSelect={setDate} locale={ptBR} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Hora Início</Label>
                <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Hora Fim</Label>
                <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Local</Label>
              <Input value={location} onChange={e => setLocation(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">{event.title}</h3>

            {(event.start_time || event.end_time) && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {event.start_time?.slice(0, 5)}{event.end_time && ` - ${event.end_time.slice(0, 5)}`}
              </div>
            )}

            {event.location && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {event.location}
              </div>
            )}

            {event.description && (
              <p className="text-sm text-foreground whitespace-pre-wrap">{event.description}</p>
            )}

            {participants.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-medium text-muted-foreground">Participantes</h4>
                <div className="flex flex-wrap gap-2">
                  {participants.map(p => (
                    <div key={p.id} className="flex items-center gap-1.5">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-[10px]">
                          {p.display_name ? getInitials(p.display_name) : <UserRound className="h-3 w-3" />}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-foreground">{p.display_name || p.external_name}</span>
                      {p.external_name && <Badge variant="outline" className="text-[10px] px-1 py-0">Externo</Badge>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {event.meeting_id && (
              <Button variant="outline" size="sm" onClick={() => { onOpenChange(false); navigate(`/atas/${event.meeting_id}`); }}>
                <FileText className="mr-2 h-4 w-4" /> Ver Ata de Reunião
              </Button>
            )}

            {!event.meeting_id && isOwner && (
              <Button variant="outline" size="sm" onClick={handleCreateMeeting} disabled={creatingMeeting}>
                <FileText className="mr-2 h-4 w-4" />
                {creatingMeeting ? 'Criando...' : 'Criar Ata de Reunião'}
              </Button>
            )}
          </div>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {isOwner && !editing && (
            <>
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                <Trash2 className="mr-2 h-4 w-4" /> Excluir
              </Button>
              <Button variant="outline" onClick={() => setEditing(true)}>Editar</Button>
            </>
          )}
          {editing && (
            <>
              <Button variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
            </>
          )}
          {!editing && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
