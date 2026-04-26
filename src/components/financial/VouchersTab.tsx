import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Plus, Pencil, Power, PowerOff, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { getCurrentLocale } from '@/lib/date';
import { toast } from 'sonner';

interface Voucher {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'percent' | 'fixed_amount';
  discount_value: number;
  duration: 'once' | 'repeating' | 'forever';
  duration_in_months: number | null;
  max_redemptions: number | null;
  times_redeemed: number;
  valid_from: string | null;
  valid_until: string | null;
  applies_to_plan_id: string | null;
  is_active: boolean;
  created_at: string;
}

interface Plan {
  id: string;
  name: string;
}

const emptyForm = {
  code: '',
  description: '',
  discount_type: 'percent' as 'percent' | 'fixed_amount',
  discount_value: 10,
  duration: 'once' as 'once' | 'repeating' | 'forever',
  duration_in_months: 3,
  max_redemptions: '' as string | number,
  valid_from: '',
  valid_until: '',
  applies_to_plan_id: 'any',
  is_active: true,
};

export default function VouchersTab() {
  const { t, i18n } = useTranslation('financial');
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Voucher | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const formatDiscount = (v: Voucher) =>
    v.discount_type === 'percent'
      ? `${v.discount_value}%`
      : (v.discount_value / 100).toLocaleString(i18n.language || 'pt-BR', { style: 'currency', currency: 'BRL' });

  const durationLabel = (v: Voucher) => {
    if (v.duration === 'once') return t('vouchers.duration.once');
    if (v.duration === 'forever') return t('vouchers.duration.forever');
    return t('vouchers.duration.months', { n: v.duration_in_months });
  };

  const load = async () => {
    setLoading(true);
    const [vRes, pRes] = await Promise.all([
      supabase
        .from('discount_vouchers')
        .select('*')
        .eq('is_adhoc', false)
        .order('created_at', { ascending: false }),
      supabase.from('plans').select('id, name').eq('is_active', true),
    ]);
    setVouchers((vRes.data as Voucher[]) || []);
    setPlans((pRes.data as Plan[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (v: Voucher) => {
    setEditing(v);
    setForm({
      code: v.code,
      description: v.description || '',
      discount_type: v.discount_type,
      discount_value: v.discount_value,
      duration: v.duration,
      duration_in_months: v.duration_in_months || 3,
      max_redemptions: v.max_redemptions ?? '',
      valid_from: v.valid_from ? v.valid_from.slice(0, 10) : '',
      valid_until: v.valid_until ? v.valid_until.slice(0, 10) : '',
      applies_to_plan_id: v.applies_to_plan_id || 'any',
      is_active: v.is_active,
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.code.trim()) {
      toast.error(t('vouchers.errors.codeRequired'));
      return;
    }
    if (form.discount_value <= 0) {
      toast.error(t('vouchers.errors.valuePositive'));
      return;
    }
    if (form.discount_type === 'percent' && form.discount_value > 100) {
      toast.error(t('vouchers.errors.percentMax'));
      return;
    }
    setSaving(true);
    const payload: any = {
      code: form.code.trim().toUpperCase(),
      description: form.description.trim() || null,
      discount_type: form.discount_type,
      discount_value: Math.round(form.discount_value),
      duration: form.duration,
      duration_in_months: form.duration === 'repeating' ? form.duration_in_months : null,
      max_redemptions: form.max_redemptions === '' ? null : Number(form.max_redemptions),
      valid_from: form.valid_from || null,
      valid_until: form.valid_until || null,
      applies_to_plan_id: form.applies_to_plan_id === 'any' ? null : form.applies_to_plan_id,
      is_active: form.is_active,
    };
    const res = editing
      ? await supabase.from('discount_vouchers').update(payload).eq('id', editing.id)
      : await supabase.from('discount_vouchers').insert(payload);
    setSaving(false);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    toast.success(editing ? t('vouchers.messages.updated') : t('vouchers.messages.created'));
    setOpen(false);
    load();
  };

  const toggleActive = async (v: Voucher) => {
    const { error } = await supabase.from('discount_vouchers').update({ is_active: !v.is_active }).eq('id', v.id);
    if (error) toast.error(error.message);
    else load();
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{t('vouchers.intro')}</p>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> {t('vouchers.new')}
        </Button>
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('vouchers.columns.code')}</TableHead>
              <TableHead>{t('vouchers.columns.discount')}</TableHead>
              <TableHead>{t('vouchers.columns.duration')}</TableHead>
              <TableHead>{t('vouchers.columns.redemptions')}</TableHead>
              <TableHead>{t('vouchers.columns.validity')}</TableHead>
              <TableHead>{t('vouchers.columns.status')}</TableHead>
              <TableHead className="text-right">{t('vouchers.columns.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vouchers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  {t('vouchers.empty')}
                </TableCell>
              </TableRow>
            ) : (
              vouchers.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-mono font-medium">
                    <div className="flex items-center gap-1">
                      <Tag className="h-3 w-3 text-muted-foreground" />
                      {v.code}
                    </div>
                    {v.description && <p className="text-xs text-muted-foreground font-sans mt-0.5">{v.description}</p>}
                  </TableCell>
                  <TableCell className="font-semibold">{formatDiscount(v)}</TableCell>
                  <TableCell className="text-sm">{durationLabel(v)}</TableCell>
                  <TableCell className="text-sm">
                    {v.times_redeemed}
                    {v.max_redemptions != null && ` / ${v.max_redemptions}`}
                  </TableCell>
                  <TableCell className="text-xs">
                    {v.valid_until
                      ? t('vouchers.validityUntil', { date: format(new Date(v.valid_until), 'dd/MM/yy', { locale: getCurrentLocale() }) })
                      : t('vouchers.noLimit')}
                  </TableCell>
                  <TableCell>
                    {v.is_active ? <Badge>{t('vouchers.active')}</Badge> : <Badge variant="outline">{t('vouchers.inactive')}</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(v)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => toggleActive(v)}>
                      {v.is_active ? <PowerOff className="h-3 w-3" /> : <Power className="h-3 w-3" />}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? t('vouchers.edit') : t('vouchers.new')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{t('vouchers.form.code')}</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder={t('vouchers.form.codePlaceholder')}
                disabled={!!editing}
                className="font-mono"
              />
            </div>
            <div>
              <Label>{t('vouchers.form.description')}</Label>
              <Textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('vouchers.form.type')}</Label>
                <Select
                  value={form.discount_type}
                  onValueChange={(v: 'percent' | 'fixed_amount') => setForm({ ...form, discount_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">{t('vouchers.form.typePercent')}</SelectItem>
                    <SelectItem value="fixed_amount">{t('vouchers.form.typeFixed')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{form.discount_type === 'percent' ? t('vouchers.form.valuePercent') : t('vouchers.form.valueFixed')}</Label>
                <Input
                  type="number"
                  step={form.discount_type === 'percent' ? '1' : '0.01'}
                  min="0"
                  max={form.discount_type === 'percent' ? '100' : undefined}
                  value={form.discount_type === 'percent' ? form.discount_value : form.discount_value / 100}
                  onChange={(e) => {
                    const n = parseFloat(e.target.value || '0');
                    setForm({
                      ...form,
                      discount_value: form.discount_type === 'percent' ? Math.round(n) : Math.round(n * 100),
                    });
                  }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('vouchers.form.duration')}</Label>
                <Select
                  value={form.duration}
                  onValueChange={(v: 'once' | 'repeating' | 'forever') => setForm({ ...form, duration: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="once">{t('vouchers.form.durationOnce')}</SelectItem>
                    <SelectItem value="repeating">{t('vouchers.form.durationRepeating')}</SelectItem>
                    <SelectItem value="forever">{t('vouchers.form.durationForever')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.duration === 'repeating' && (
                <div>
                  <Label>{t('vouchers.form.months')}</Label>
                  <Input
                    type="number"
                    min="1"
                    value={form.duration_in_months}
                    onChange={(e) => setForm({ ...form, duration_in_months: parseInt(e.target.value || '1') })}
                  />
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('vouchers.form.redemptionLimit')}</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder={t('vouchers.form.redemptionLimitPlaceholder')}
                  value={form.max_redemptions}
                  onChange={(e) => setForm({ ...form, max_redemptions: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('vouchers.form.appliesTo')}</Label>
                <Select
                  value={form.applies_to_plan_id}
                  onValueChange={(v) => setForm({ ...form, applies_to_plan_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">{t('vouchers.form.anyPlan')}</SelectItem>
                    {plans.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('vouchers.form.validFrom')}</Label>
                <Input
                  type="date"
                  value={form.valid_from}
                  onChange={(e) => setForm({ ...form, valid_from: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('vouchers.form.validUntil')}</Label>
                <Input
                  type="date"
                  value={form.valid_until}
                  onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="active">{t('vouchers.form.active')}</Label>
              <Switch
                id="active"
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t('vouchers.form.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t('vouchers.form.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
