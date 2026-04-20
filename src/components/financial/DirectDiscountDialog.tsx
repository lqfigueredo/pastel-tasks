import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  subscriptionId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSuccess?: () => void;
}

type DiscountType = 'percent' | 'fixed_amount';
type Duration = 'once' | 'repeating' | 'forever';

const formatMoney = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function DirectDiscountDialog({
  subscriptionId,
  open,
  onOpenChange,
  onSuccess,
}: Props) {
  const [discountType, setDiscountType] = useState<DiscountType>('percent');
  const [percentValue, setPercentValue] = useState<number>(10);
  const [fixedReais, setFixedReais] = useState<number>(0);
  const [duration, setDuration] = useState<Duration>('once');
  const [months, setMonths] = useState<number>(3);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setDiscountType('percent');
    setPercentValue(10);
    setFixedReais(0);
    setDuration('once');
    setMonths(3);
    setReason('');
  };

  const handleClose = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const preview = useMemo(() => {
    const valueLabel =
      discountType === 'percent'
        ? `${percentValue}%`
        : formatMoney(Math.round(fixedReais * 100));
    let scope = '';
    if (duration === 'once') scope = 'apenas na próxima fatura';
    else if (duration === 'repeating') scope = `nas próximas ${months} faturas`;
    else scope = 'em todas as faturas (vitalício)';
    return `Aplicará desconto de ${valueLabel} ${scope}.`;
  }, [discountType, percentValue, fixedReais, duration, months]);

  const handleSubmit = async () => {
    if (reason.trim().length < 5) {
      toast.error('Motivo é obrigatório (mín. 5 caracteres)');
      return;
    }
    if (discountType === 'percent' && (percentValue < 1 || percentValue > 100)) {
      toast.error('Percentual deve estar entre 1 e 100');
      return;
    }
    if (discountType === 'fixed_amount' && fixedReais <= 0) {
      toast.error('Valor fixo deve ser maior que zero');
      return;
    }
    if (duration === 'repeating' && (!months || months < 1)) {
      toast.error('Informe a quantidade de meses');
      return;
    }

    const value =
      discountType === 'percent' ? Math.round(percentValue) : Math.round(fixedReais * 100);

    setSaving(true);
    const { error } = await supabase.rpc('apply_direct_discount', {
      _subscription_id: subscriptionId,
      _discount_type: discountType,
      _discount_value: value,
      _duration: duration,
      _duration_in_months: duration === 'repeating' ? months : null,
      _reason: reason.trim(),
    });
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Desconto aplicado com sucesso');
    onSuccess?.();
    handleClose(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Aplicar desconto direto
          </DialogTitle>
          <DialogDescription>
            Aplica um desconto sob medida nesta assinatura sem precisar criar voucher.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo</Label>
              <Select value={discountType} onValueChange={(v: DiscountType) => setDiscountType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Percentual (%)</SelectItem>
                  <SelectItem value="fixed_amount">Valor fixo (R$)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{discountType === 'percent' ? 'Percentual' : 'Valor (R$)'}</Label>
              {discountType === 'percent' ? (
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={percentValue}
                  onChange={(e) => setPercentValue(parseInt(e.target.value || '0'))}
                />
              ) : (
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={fixedReais}
                  onChange={(e) => setFixedReais(parseFloat(e.target.value || '0'))}
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Duração</Label>
              <Select value={duration} onValueChange={(v: Duration) => setDuration(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="once">Apenas uma fatura</SelectItem>
                  <SelectItem value="repeating">Por X meses</SelectItem>
                  <SelectItem value="forever">Vitalício</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {duration === 'repeating' && (
              <div>
                <Label>Meses</Label>
                <Input
                  type="number"
                  min={1}
                  value={months}
                  onChange={(e) => setMonths(parseInt(e.target.value || '1'))}
                />
              </div>
            )}
          </div>

          <div>
            <Label>Motivo *</Label>
            <Textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Desconto de fidelidade, ajuste comercial, retenção..."
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Obrigatório (mín. 5 caracteres). Ficará registrado no histórico.
            </p>
          </div>

          <div className="rounded-lg bg-primary/10 border border-primary/30 p-3 text-sm text-primary">
            {preview}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving || reason.trim().length < 5}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Aplicar desconto'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
