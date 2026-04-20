import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Gift } from 'lucide-react';
import type { SubscriptionRow } from './SubscriptionsTab';
import CompActivationDialog from './CompActivationDialog';

interface Props {
  subscription: SubscriptionRow;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Action = 'seats' | 'status' | 'trial' | 'price';

export default function SubscriptionActionsDialog({ subscription, open, onClose, onSuccess }: Props) {
  const [action, setAction] = useState<Action>('seats');
  const [seats, setSeats] = useState(String(subscription.seats_purchased));
  const [status, setStatus] = useState(subscription.status);
  const [trialDate, setTrialDate] = useState(subscription.trial_ends_at?.slice(0, 10) || '');
  const [pricePerSeat, setPricePerSeat] = useState((subscription.price_per_seat_cents / 100).toFixed(2));
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [compOpen, setCompOpen] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    let update: any = {};
    if (action === 'seats') {
      const n = parseInt(seats);
      if (!n || n < subscription.minimum_seats) {
        toast.error(`Mínimo de ${subscription.minimum_seats} assentos`);
        setSaving(false);
        return;
      }
      update.seats_purchased = n;
    } else if (action === 'status') {
      update.status = status;
      if (status === 'active') update.past_due_since = null;
      if (status === 'past_due' && !subscription.past_due_since) update.past_due_since = new Date().toISOString();
    } else if (action === 'trial') {
      update.trial_ends_at = trialDate ? new Date(trialDate).toISOString() : null;
    } else if (action === 'price') {
      update.price_per_seat_cents = Math.round(parseFloat(pricePerSeat) * 100);
    }

    const { error } = await supabase.from('subscriptions').update(update).eq('id', subscription.id);
    if (error) {
      toast.error(error.message);
      setSaving(false);
      return;
    }

    if (reason.trim()) {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('subscription_changes').insert({
        subscription_id: subscription.id,
        admin_user_id: subscription.admin_user_id,
        change_type: 'note',
        reason: reason.trim(),
        changed_by: user?.id,
      });
    }

    setSaving(false);
    toast.success('Assinatura atualizada');
    onSuccess();
  };

  return (
    <>
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gerenciar assinatura</DialogTitle>
          <DialogDescription>Toda mudança é registrada no histórico.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Button
            variant="outline"
            className="w-full justify-start border-primary/40 text-primary hover:bg-primary/5"
            onClick={() => setCompOpen(true)}
          >
            <Gift className="h-4 w-4 mr-2" />
            Ativar como cortesia (sem cobrança)
          </Button>
          <div>
            <Label>Ação</Label>
            <Select value={action} onValueChange={(v) => setAction(v as Action)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="seats">Ajustar assentos</SelectItem>
                <SelectItem value="status">Alterar status</SelectItem>
                <SelectItem value="trial">Estender / definir trial</SelectItem>
                <SelectItem value="price">Alterar preço por assento</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {action === 'seats' && (
            <div>
              <Label>Novo número de assentos (mín. {subscription.minimum_seats})</Label>
              <Input type="number" min={subscription.minimum_seats} value={seats} onChange={(e) => setSeats(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">Atualiza automaticamente o limite de usuários do admin.</p>
            </div>
          )}
          {action === 'status' && (
            <div>
              <Label>Novo status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativa</SelectItem>
                  <SelectItem value="trialing">Trial</SelectItem>
                  <SelectItem value="past_due">Inadimplente</SelectItem>
                  <SelectItem value="suspended">Suspensa</SelectItem>
                  <SelectItem value="canceled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Suspended/Canceled zeram o limite de usuários do admin.</p>
            </div>
          )}
          {action === 'trial' && (
            <div>
              <Label>Trial termina em</Label>
              <Input type="date" value={trialDate} onChange={(e) => setTrialDate(e.target.value)} />
            </div>
          )}
          {action === 'price' && (
            <div>
              <Label>Preço por assento (R$/mês)</Label>
              <Input type="number" step="0.01" value={pricePerSeat} onChange={(e) => setPricePerSeat(e.target.value)} />
            </div>
          )}

          <div>
            <Label>Motivo / observação (opcional)</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <CompActivationDialog
      subscriptionId={subscription.id}
      adminName={subscription.admin_name}
      open={compOpen}
      onClose={() => setCompOpen(false)}
      onSuccess={() => { setCompOpen(false); onSuccess(); }}
    />
    </>
  );
}
