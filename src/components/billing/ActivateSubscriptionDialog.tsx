import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2, MessageCircle } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultSubject?: string;
  contextLabel?: string;
  onSuccess?: () => void;
}

export const ActivateSubscriptionDialog = ({
  open,
  onOpenChange,
  defaultSubject = 'Quero ativar minha assinatura',
  contextLabel = 'ativação de assinatura',
  onSuccess,
}: Props) => {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!user) return;
    if (!message.trim()) {
      toast.error('Conte um pouco sobre seu pedido para o time comercial.');
      return;
    }
    setSubmitting(true);
    try {
      const { data: ticket, error: tErr } = await supabase
        .from('support_tickets')
        .insert({
          subject: defaultSubject,
          created_by: user.id,
          status: 'open',
        })
        .select('id')
        .single();
      if (tErr) throw tErr;

      const { error: mErr } = await supabase.from('support_messages').insert({
        ticket_id: ticket.id,
        user_id: user.id,
        content: `[${contextLabel}]\n\n${message.trim()}`,
      });
      if (mErr) throw mErr;

      toast.success('Pedido enviado! Nosso time entrará em contato em breve.');
      setMessage('');
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      const m = err instanceof Error ? err.message : 'Erro inesperado';
      toast.error(`Não foi possível enviar: ${m}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" /> Falar com o time comercial
          </DialogTitle>
          <DialogDescription>
            Como ainda não temos checkout automático, abrimos um chamado para o nosso time comercial entrar em contato e ativar sua assinatura.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="msg">Sua mensagem</Label>
          <Textarea
            id="msg"
            placeholder="Ex.: Quero ativar minha conta com 15 assentos a partir do próximo mês."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Enviar pedido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
