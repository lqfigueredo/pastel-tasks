import { useEffect, useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, AlertTriangle } from 'lucide-react';
import type { SubscriptionRow } from './SubscriptionsTab';
import { checkFiscalReadiness, type FiscalReadiness } from '@/lib/fiscal-readiness';

interface Props {
  subscription: SubscriptionRow;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ManualPaymentDialog({ subscription, open, onClose, onSuccess }: Props) {
  const { t } = useTranslation('financial');
  const defaultAmount = ((subscription.seats_purchased * subscription.price_per_seat_cents) / 100).toFixed(2);
  const [amount, setAmount] = useState(defaultAmount);
  const [method, setMethod] = useState('pix');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [advance, setAdvance] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fiscal, setFiscal] = useState<FiscalReadiness | null>(null);
  const [checkingFiscal, setCheckingFiscal] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCheckingFiscal(true);
    checkFiscalReadiness(subscription.admin_user_id)
      .then(setFiscal)
      .finally(() => setCheckingFiscal(false));
  }, [open, subscription.admin_user_id]);

  const handleSave = async () => {
    if (fiscal && !fiscal.ready) {
      toast.error(t('manualPayment.errors.fiscal'));
      return;
    }
    const amountCents = Math.round(parseFloat(amount) * 100);
    if (!amountCents || amountCents < 0) {
      toast.error(t('manualPayment.errors.invalidAmount'));
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
      const msg = error.message || '';
      if (msg.includes('FISCAL_INCOMPLETE')) {
        toast.error(t('manualPayment.errors.fiscalServer'));
      } else {
        toast.error(msg);
      }
      return;
    }
    toast.success(t('manualPayment.success'));
    onSuccess();
  };

  const blocked = fiscal !== null && !fiscal.ready;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('manualPayment.title')}</DialogTitle>
          <DialogDescription>{t('manualPayment.description')}</DialogDescription>
        </DialogHeader>

        {checkingFiscal ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : blocked ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t('manualPayment.fiscalIncomplete.title')}</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>
                {t('manualPayment.fiscalIncomplete.intro')}
                {!fiscal!.hasProfile && ' ' + t('manualPayment.fiscalIncomplete.noProfile')}
              </p>
              <div>
                <p className="text-xs font-semibold mb-1">{t('manualPayment.fiscalIncomplete.missingHeader')}</p>
                <ul className="text-xs list-disc pl-4 space-y-0.5">
                  {fiscal!.missingLabels.map((l) => <li key={l}>{l}</li>)}
                </ul>
              </div>
              <p className="text-xs">
                <Trans
                  i18nKey="manualPayment.fiscalIncomplete.askClient"
                  t={t}
                  components={{ strong: <strong /> }}
                />
              </p>
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            <div>
              <Label>{t('manualPayment.fields.amount')}</Label>
              <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <Label>{t('manualPayment.fields.method')}</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">{t('manualPayment.methods.pix')}</SelectItem>
                  <SelectItem value="boleto">{t('manualPayment.methods.boleto')}</SelectItem>
                  <SelectItem value="card">{t('manualPayment.methods.card')}</SelectItem>
                  <SelectItem value="manual">{t('manualPayment.methods.manual')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('manualPayment.fields.reference')}</Label>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder={t('manualPayment.fields.referencePlaceholder')} />
            </div>
            <div>
              <Label>{t('manualPayment.fields.notes')}</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="advance" checked={advance} onCheckedChange={(c) => setAdvance(!!c)} />
              <Label htmlFor="advance" className="font-normal cursor-pointer">
                {t('manualPayment.fields.advance')}
              </Label>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{blocked ? t('manualPayment.close') : t('manualPayment.cancel')}</Button>
          {!blocked && (
            <Button onClick={handleSave} disabled={saving || checkingFiscal}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('manualPayment.submit')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
