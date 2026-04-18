import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Tag, X, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface Props {
  subscriptionId: string;
  onChanged?: () => void;
}

interface AppliedDiscount {
  id: string;
  voucher_id: string;
  applied_at: string;
  expires_at: string | null;
  invoices_remaining: number | null;
  is_active: boolean;
  voucher: {
    code: string;
    discount_type: 'percent' | 'fixed_amount';
    discount_value: number;
    duration: string;
  };
}

interface InvoiceCalc {
  subtotal_cents: number;
  discount_cents: number;
  total_cents: number;
}

const formatMoney = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatDiscount = (d: AppliedDiscount['voucher']) =>
  d.discount_type === 'percent' ? `${d.discount_value}%` : formatMoney(d.discount_value);

export default function SubscriptionDiscountsSection({ subscriptionId, onChanged }: Props) {
  const [discounts, setDiscounts] = useState<AppliedDiscount[]>([]);
  const [calc, setCalc] = useState<InvoiceCalc | null>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [applying, setApplying] = useState(false);

  const load = async () => {
    setLoading(true);
    const [dRes, cRes] = await Promise.all([
      supabase
        .from('subscription_discounts')
        .select('*, voucher:discount_vouchers(code, discount_type, discount_value, duration)')
        .eq('subscription_id', subscriptionId)
        .eq('is_active', true)
        .order('applied_at', { ascending: false }),
      supabase.rpc('calculate_invoice_amount', { _subscription_id: subscriptionId }),
    ]);
    setDiscounts((dRes.data as any[]) || []);
    if (cRes.data && Array.isArray(cRes.data) && cRes.data[0]) {
      setCalc(cRes.data[0] as InvoiceCalc);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [subscriptionId]);

  const handleApply = async () => {
    if (!code.trim()) return;
    setApplying(true);
    const { error } = await supabase.rpc('apply_voucher', {
      _subscription_id: subscriptionId,
      _code: code.trim(),
    });
    setApplying(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Voucher aplicado!');
    setCode('');
    load();
    onChanged?.();
  };

  const handleRemove = async (id: string) => {
    const { error } = await supabase.rpc('remove_voucher', { _subscription_discount_id: id });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Voucher removido');
    load();
    onChanged?.();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Resumo financeiro */}
      {calc && (
        <div className="rounded-lg border p-3 bg-muted/30 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatMoney(calc.subtotal_cents)}</span>
          </div>
          {calc.discount_cents > 0 && (
            <div className="flex justify-between text-primary">
              <span>Descontos</span>
              <span>− {formatMoney(calc.discount_cents)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold pt-1 border-t">
            <span>Próxima cobrança</span>
            <span>{formatMoney(calc.total_cents)}</span>
          </div>
        </div>
      )}

      {/* Aplicar voucher */}
      <div className="flex gap-2">
        <Input
          placeholder="Código do voucher"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          className="font-mono"
        />
        <Button size="sm" onClick={handleApply} disabled={!code.trim() || applying}>
          {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
          Aplicar
        </Button>
      </div>

      {/* Lista de aplicados */}
      <div className="space-y-2">
        {discounts.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-4">Nenhum desconto ativo.</p>
        ) : (
          discounts.map((d) => (
            <div key={d.id} className="flex items-start justify-between border rounded-lg p-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 font-medium">
                  <Tag className="h-3 w-3" />
                  <span className="font-mono">{d.voucher.code}</span>
                  <Badge variant="outline">{formatDiscount(d.voucher)}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Aplicado em {format(new Date(d.applied_at), 'dd/MM/yy', { locale: ptBR })}
                  {d.invoices_remaining != null && ` · ${d.invoices_remaining} faturas restantes`}
                  {d.expires_at && ` · expira ${format(new Date(d.expires_at), 'dd/MM/yy', { locale: ptBR })}`}
                  {d.voucher.duration === 'forever' && ' · vitalício'}
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => handleRemove(d.id)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
