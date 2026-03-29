import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { MessageSquarePlus, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import SupportChat from './SupportChat';

interface Ticket {
  id: string;
  subject: string;
  status: string;
  created_by: string;
  created_at: string;
  closed_at: string | null;
  creator_name?: string;
}

interface SupportTicketListProps {
  role: 'admin' | 'solution_admin';
}

export default function SupportTicketList({ role }: SupportTicketListProps) {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [firstMessage, setFirstMessage] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      // Fetch creator names
      const userIds = [...new Set(data.map(t => t.created_by))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', userIds);
      const nameMap = new Map((profiles || []).map(p => [p.user_id, p.display_name]));

      setTickets(data.map(t => ({
        ...t,
        creator_name: nameMap.get(t.created_by) || 'Desconhecido',
      })));
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!subject.trim() || !firstMessage.trim()) {
      toast.error('Preencha o assunto e a mensagem');
      return;
    }
    setCreating(true);
    try {
      const { data: ticket, error } = await supabase
        .from('support_tickets')
        .insert({ subject: subject.trim(), created_by: user!.id })
        .select()
        .single();

      if (error) throw error;

      await supabase.from('support_messages').insert({
        ticket_id: ticket.id,
        user_id: user!.id,
        content: firstMessage.trim(),
      });

      toast.success('Chamado aberto com sucesso!');
      setSubject('');
      setFirstMessage('');
      setCreateOpen(false);
      await loadTickets();
      setSelectedTicket({ ...ticket, creator_name: 'Você' });
    } catch {
      toast.error('Erro ao criar chamado');
    }
    setCreating(false);
  };

  const filteredTickets = tickets.filter(t => filter === 'all' || t.status === filter);

  if (selectedTicket) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => { setSelectedTicket(null); loadTickets(); }}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar aos chamados
        </Button>
        <SupportChat
          ticket={selectedTicket}
          role={role}
          onClose={() => { setSelectedTicket(null); loadTickets(); }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="open">Abertos</SelectItem>
            <SelectItem value="closed">Encerrados</SelectItem>
          </SelectContent>
        </Select>

        {role === 'admin' && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <MessageSquarePlus className="h-4 w-4 mr-2" />
                Novo Chamado
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Abrir Chamado de Suporte</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Assunto *</Label>
                  <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Descreva brevemente o problema" />
                </div>
                <div className="space-y-2">
                  <Label>Mensagem *</Label>
                  <Textarea value={firstMessage} onChange={e => setFirstMessage(e.target.value)} placeholder="Detalhe sua solicitação..." rows={4} />
                </div>
                <Button onClick={handleCreate} disabled={creating} className="w-full">
                  {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Enviar Chamado
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredTickets.length === 0 ? (
        <p className="text-center text-muted-foreground py-10">Nenhum chamado encontrado.</p>
      ) : (
        <div className="space-y-2">
          {filteredTickets.map(ticket => (
            <Card
              key={ticket.id}
              className="cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => setSelectedTicket(ticket)}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div className="space-y-1">
                  <p className="font-medium">{ticket.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    {role === 'solution_admin' && `${ticket.creator_name} · `}
                    {format(new Date(ticket.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <Badge variant={ticket.status === 'open' ? 'default' : 'secondary'}>
                  {ticket.status === 'open' ? 'Aberto' : 'Encerrado'}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
