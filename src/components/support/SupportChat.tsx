import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Lock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  sender_name?: string;
}

interface SupportChatProps {
  ticket: {
    id: string;
    subject: string;
    status: string;
    created_by: string;
  };
  role: 'admin' | 'solution_admin';
  onClose: () => void;
}

export default function SupportChat({ ticket, role, onClose }: SupportChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [ticketStatus, setTicketStatus] = useState(ticket.status);
  const [profileMap, setProfileMap] = useState<Map<string, string>>(new Map());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();

    const channel = supabase
      .channel(`support:${ticket.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'support_messages',
        filter: `ticket_id=eq.${ticket.id}`,
      }, (payload) => {
        const msg = payload.new as Message;
        msg.sender_name = profileMap.get(msg.user_id) || 'Carregando...';
        setMessages(prev => [...prev, msg]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [ticket.id]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async () => {
    const { data } = await supabase
      .from('support_messages')
      .select('*')
      .eq('ticket_id', ticket.id)
      .order('created_at', { ascending: true });

    if (data) {
      const userIds = [...new Set(data.map(m => m.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', userIds);

      const map = new Map((profiles || []).map(p => [p.user_id, p.display_name]));
      setProfileMap(map);

      setMessages(data.map(m => ({
        ...m,
        sender_name: map.get(m.user_id) || 'Desconhecido',
      })));
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || ticketStatus === 'closed') return;
    setSending(true);
    try {
      const { error } = await supabase.from('support_messages').insert({
        ticket_id: ticket.id,
        user_id: user!.id,
        content: newMessage.trim(),
      });
      if (error) throw error;
      setNewMessage('');
      // Realtime will add it, but also reload to be safe
      await loadMessages();
    } catch {
      toast.error('Erro ao enviar mensagem');
    }
    setSending(false);
  };

  const handleClose = async () => {
    setClosing(true);
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status: 'closed', closed_by: user!.id, closed_at: new Date().toISOString() })
        .eq('id', ticket.id);
      if (error) throw error;
      setTicketStatus('closed');
      toast.success('Chamado encerrado.');
    } catch {
      toast.error('Erro ao encerrar chamado');
    }
    setClosing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="flex flex-col h-[calc(100vh-16rem)]">
      <CardHeader className="flex-row items-center justify-between gap-2 pb-3 space-y-0">
        <div>
          <CardTitle className="text-base">{ticket.subject}</CardTitle>
          <Badge variant={ticketStatus === 'open' ? 'default' : 'secondary'} className="mt-1">
            {ticketStatus === 'open' ? 'Aberto' : 'Encerrado'}
          </Badge>
        </div>
        {ticketStatus === 'open' && (
          <Button variant="outline" size="sm" onClick={handleClose} disabled={closing}>
            {closing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Lock className="h-4 w-4 mr-1" />}
            Encerrar Chamado
          </Button>
        )}
      </CardHeader>

      <CardContent className="flex-1 flex flex-col min-h-0 gap-3 pb-4">
        <ScrollArea className="flex-1 pr-3">
          <div className="space-y-3">
            {messages.map(msg => {
              const isOwn = msg.user_id === user?.id;
              return (
                <div key={msg.id} className={cn('flex flex-col max-w-[80%]', isOwn ? 'ml-auto items-end' : 'items-start')}>
                  <span className="text-[11px] text-muted-foreground mb-0.5 px-1">
                    {msg.sender_name}
                  </span>
                  <div className={cn(
                    'rounded-lg px-3 py-2 text-sm whitespace-pre-wrap',
                    isOwn
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  )}>
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-0.5 px-1">
                    {format(new Date(msg.created_at), "dd/MM HH:mm", { locale: ptBR })}
                  </span>
                </div>
              );
            })}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        {ticketStatus === 'open' ? (
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua mensagem..."
              disabled={sending}
            />
            <Button onClick={handleSend} disabled={sending || !newMessage.trim()} size="icon">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        ) : (
          <p className="text-center text-sm text-muted-foreground py-2">
            Este chamado foi encerrado.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
