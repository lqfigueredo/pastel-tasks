import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import type { SubscriptionRow } from './SubscriptionsTab';

interface Props {
  subscription: SubscriptionRow;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ManualPaymentDialog({ subscription, open, onClose, onSuccess }: Props) {
  const defaultAmount = ((subscription.seats_purchased * subscription.price_per_seat_cents) / 100).toFixed(2);
  const [amount, setAmount] = useState(defaultAmount);
  const [method, setMethod] = useState('pix');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [advance, setAdvance] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const amountCents = Math.round(parseFloat(amount) * 100);
    if (!amountCents || amountCents < 0) {
      toast.error('Valor inválido');
      return;
    }
    setSaving(true);
    const { error } = await supabase.rpc('register_manual_payment', {
      _subscription_id: subscription.id,
      _amount_cents: amountCents,
      _payment_method: method,
      _payment_reference: reference || null,
      _notes: notes || null,
      _advance_cycle: advance,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Pagamento registrado');
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar pagamento manual</DialogTitle>
          <DialogDescription>
            Cria uma fatura paga e (opcionalmente) avança o ciclo da assinatura.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Valor (R$)</Label>
            <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <Label>Método</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="boleto">Boleto</SelectItem>
                <SelectItem value="card">Cartão</SelectItem>
                <SelectItem value="manual">Outro / Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Referência (opcional)</Label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="ID transação, comprovante..." />
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="advance" checked={advance} onCheckedChange={(c) => setAdvance(!!c)} />
            <Label htmlFor="advance" className="font-normal cursor-pointer">
              Avançar ciclo (+1 mês) e reativar se estava inadimplente
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
