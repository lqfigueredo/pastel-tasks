import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

const STATUS_LABEL: Record<string, { label: string; variant: any }> = {
  paid: { label: 'Paga', variant: 'default' },
  open: { label: 'Em aberto', variant: 'secondary' },
  failed: { label: 'Falhou', variant: 'destructive' },
  void: { label: 'Cancelada', variant: 'outline' },
  refunded: { label: 'Estornada', variant: 'outline' },
};

export default function InvoiceHistory() {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Histórico de faturas</CardTitle>
        <CardDescription>Pagamentos e faturas em aberto.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma fatura registrada ainda.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Método</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => {
                const s = STATUS_LABEL[inv.status] || { label: inv.status, variant: 'outline' };
                return (
                  <TableRow key={inv.id}>
                    <TableCell className="text-sm">
                      {format(new Date(inv.paid_at || inv.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(inv.period_start), 'dd/MM/yy', { locale: ptBR })} → {format(new Date(inv.period_end), 'dd/MM/yy', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="font-medium">
                      {(inv.amount_cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: inv.currency })}
                    </TableCell>
                    <TableCell className="capitalize text-sm">{inv.payment_method || '—'}</TableCell>
                    <TableCell><Badge variant={s.variant}>{s.label}</Badge></TableCell>
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
