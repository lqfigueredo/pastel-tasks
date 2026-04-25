import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { getCurrentLocale } from '@/lib/date';

interface Invoice {
  id: string;
  amount_cents: number;
  currency: string;
  status: string;
  paid_at: string | null;
  payment_method: string | null;
  period_start: string;
  period_end: string;
  created_at: string;
}

const STATUS_VARIANT: Record<string, any> = {
  paid: 'default',
  open: 'secondary',
  failed: 'destructive',
  void: 'outline',
  refunded: 'outline',
};

export default function InvoiceHistory() {
  const { t, i18n } = useTranslation('billing');
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('invoices')
      .select('*')
      .eq('admin_user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setInvoices((data as Invoice[]) || []);
        setLoading(false);
      });
  }, [user]);

  const fmtMoney = (cents: number, currency: string) =>
    new Intl.NumberFormat(i18n.language || 'pt-BR', { style: 'currency', currency }).format(cents / 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> {t('invoices.title')}</CardTitle>
        <CardDescription>{t('invoices.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">{t('invoices.empty')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('invoices.columns.date')}</TableHead>
                <TableHead>{t('invoices.columns.period')}</TableHead>
                <TableHead>{t('invoices.columns.amount')}</TableHead>
                <TableHead>{t('invoices.columns.method')}</TableHead>
                <TableHead>{t('invoices.columns.status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => {
                const variant = STATUS_VARIANT[inv.status] || 'outline';
                const label = t(`invoices.status.${inv.status}`, { defaultValue: inv.status });
                return (
                  <TableRow key={inv.id}>
                    <TableCell className="text-sm">
                      {format(new Date(inv.paid_at || inv.created_at), 'dd/MM/yyyy', { locale: getCurrentLocale() })}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(inv.period_start), 'dd/MM/yy', { locale: getCurrentLocale() })} → {format(new Date(inv.period_end), 'dd/MM/yy', { locale: getCurrentLocale() })}
                    </TableCell>
                    <TableCell className="font-medium">{fmtMoney(inv.amount_cents, inv.currency)}</TableCell>
                    <TableCell className="capitalize text-sm">{inv.payment_method || '—'}</TableCell>
                    <TableCell><Badge variant={variant}>{label}</Badge></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
