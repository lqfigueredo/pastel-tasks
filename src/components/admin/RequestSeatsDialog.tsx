import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2, Users } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  currentSeats: number;
  suggestedSeats?: number;
  onSuccess?: () => void;
}

export const RequestSeatsDialog = ({
  open,
  onOpenChange,
  currentSeats,
  suggestedSeats,
  onSuccess,
}: Props) => {
  const { user } = useAuth();
  const [requested, setRequested] = useState<number>(suggestedSeats ?? currentSeats + 5);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setRequested(suggestedSeats ?? currentSeats + 5);
      setReason('');
    }
  }, [open, suggestedSeats, currentSeats]);

  const diff = requested - currentSeats;

  const submit = async () => {
    if (!user) return;
    if (requested <= currentSeats) {
      toast.error(`A quantidade solicitada deve ser maior que ${currentSeats}.`);
      return;
    }
    if (reason.trim().length < 10) {
      toast.error('Descreva o motivo (mínimo 10 caracteres).');
      return;
    }
    setSubmitting(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', user.id)
        .maybeSingle();

      const adminName = profile?.display_name || user.email || 'Administrador';

      const { data: ticket, error: tErr } = await supabase
        .from('support_tickets')
        .insert({
          subject: 'Solicitação de aumento de assentos',
          created_by: user.id,
          status: 'open',
        })
        .select('id')
        .single();
      if (tErr) throw tErr;

      const content = [
        `[Solicitação de assentos adicionais]`,
        ``,
        `Administrador: ${adminName}`,
        `Assentos atuais: ${currentSeats}`,
        `Assentos solicitados: ${requested}`,
        `Diferença: +${diff}`,
        ``,
        `Motivo:`,
        reason.trim(),
      ].join('\n');

      const { error: mErr } = await supabase.from('support_messages').insert({
        ticket_id: ticket.id,
        user_id: user.id,
        content,
      });
      if (mErr) throw mErr;

      toast.success('Pedido enviado ao Financeiro. Entraremos em contato em breve.');
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
            <Users className="h-5 w-5" /> Solicitar mais assentos
          </DialogTitle>
          <DialogDescription>
            Seu plano atual permite {currentSeats} usuários. Informe quantos assentos adicionais você precisa
            e o motivo. O Financeiro analisará e entrará em contato.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="seats">Quantidade total desejada</Label>
            <Input
              id="seats"
              type="number"
              min={currentSeats + 1}
              value={requested}
              onChange={(e) => setRequested(Number(e.target.value) || currentSeats + 1)}
            />
            {diff > 0 && (
              <p className="text-xs text-muted-foreground">
                Você está pedindo <span className="font-semibold text-foreground">+{diff}</span> assentos
                além dos {currentSeats} atuais.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Motivo da solicitação</Label>
            <Textarea
              id="reason"
              placeholder="Ex.: Estamos contratando 3 novos colaboradores para o time de vendas no próximo mês."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Enviar solicitação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RequestSeatsDialog;
