import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Gift, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  subscriptionId: string;
  adminName: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const DURATION_OPTIONS = [
  { value: '1', label: '1 mês' },
  { value: '3', label: '3 meses' },
  { value: '6', label: '6 meses' },
  { value: '12', label: '12 meses' },
  { value: 'unlimited', label: 'Indefinido (sem expiração)' },
];

export default function CompActivationDialog({ subscriptionId, adminName, open, onClose, onSuccess }: Props) {
  const [duration, setDuration] = useState('1');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const months = duration === 'unlimited' ? null : parseInt(duration, 10);
  const previewDate = months ? new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000) : null;

  const handleSubmit = async () => {
    if (reason.trim().length < 5) {
      toast.error('Descreva o motivo (mínimo 5 caracteres)');
      return;
    }
    setSaving(true);
    const { error } = await supabase.rpc('comp_activate_subscription', {
      _subscription_id: subscriptionId,
      _months: months,
      _reason: reason.trim(),
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Assinatura ativada como cortesia');
    setReason('');
    setDuration('1');
    onSuccess();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Ativar como cortesia
          </DialogTitle>
          <DialogDescription>
            Marca a assinatura de <strong>{adminName}</strong> como ativa <strong>sem cobrança</strong>.
            Nenhuma fatura será gerada.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Duração da cortesia</Label>
            <Select value={duration} onValueChange={setDuration} disabled={saving}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Motivo (obrigatório)</Label>
            <Textarea
              placeholder="Ex: parceria comercial, conta interna, beta tester estratégico..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              disabled={saving}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Será registrado no histórico e nas notas internas da assinatura.
            </p>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <div className="text-xs space-y-1">
              <p className="font-semibold">
                {previewDate
                  ? `A conta ficará ativa até ${format(previewDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}.`
                  : 'A conta ficará ativa indefinidamente, sem expiração automática.'}
              </p>
              <p>
                Após o vencimento, ela voltará ao fluxo normal (past_due → suspended)
                a menos que outra ação seja tomada.
                {!previewDate && ' Cortesia indefinida nunca expira automaticamente.'}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Ativar gratuitamente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
