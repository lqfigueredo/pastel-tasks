import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Mail, CheckCircle2, XCircle, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';

interface EmailLog {
  id: string;
  message_id: string | null;
  template_name: string;
  recipient_email: string;
  status: string;
  error_message: string | null;
  created_at: string;
}

interface EmailStats {
  total: number;
  sent: number;
  failed: number;
  suppressed: number;
}

interface EmailResponse {
  stats: EmailStats;
  templates: string[];
  logs: EmailLog[];
  total: number;
  page: number;
  pageSize: number;
}

const PERIODS = [
  { value: '24h', label: 'Últimas 24h' },
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
];

const statusConfig: Record<string, { label: string; variant: 'default' | 'destructive' | 'secondary' | 'outline'; className?: string }> = {
  sent: { label: 'Enviado', variant: 'default', className: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30' },
  pending: { label: 'Pendente', variant: 'secondary' },
  dlq: { label: 'Falhou', variant: 'destructive' },
  failed: { label: 'Falhou', variant: 'destructive' },
  suppressed: { label: 'Suprimido', variant: 'outline', className: 'bg-amber-500/15 text-amber-700 border-amber-500/30' },
  bounced: { label: 'Rejeitado', variant: 'destructive' },
  complained: { label: 'Reclamação', variant: 'destructive' },
};

export default function EmailDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<EmailResponse | null>(null);
  const [period, setPeriod] = useState('7d');
  const [template, setTemplate] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ period, page: String(page) });
      if (template) params.set('template', template);
      if (status) params.set('status', status);

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-email-logs?${params.toString()}`;
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const resp = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });

      if (!resp.ok) throw new Error('Failed to fetch');
      const json = await resp.json();
      setData(json);
    } catch (err) {
      console.error('Error fetching email logs:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    setPage(0);
  }, [period, template, status]);

  useEffect(() => {
    fetchData();
  }, [period, template, status, page]);

  const getStatusBadge = (s: string) => {
    const config = statusConfig[s] || { label: s, variant: 'outline' as const };
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {data && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Enviados</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{data.stats.sent}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Falhos</CardTitle>
              <XCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{data.stats.failed}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Suprimidos</CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{data.stats.suppressed}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            {PERIODS.map((p) => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={template || 'all'} onValueChange={(v) => setTemplate(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Template" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os templates</SelectItem>
            {(data?.templates || []).map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status || 'all'} onValueChange={(v) => setStatus(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="sent">Enviados</SelectItem>
            <SelectItem value="failed">Falhos</SelectItem>
            <SelectItem value="suppressed">Suprimidos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template</TableHead>
                    <TableHead>Destinatário</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Erro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.logs || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Nenhum email encontrado para os filtros selecionados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (data?.logs || []).map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">{log.template_name}</TableCell>
                        <TableCell className="text-muted-foreground">{log.recipient_email}</TableCell>
                        <TableCell>{getStatusBadge(log.status)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(log.created_at).toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-xs text-destructive">
                          {log.error_message || '—'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Página {page + 1} de {totalPages} ({data?.total} emails)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
