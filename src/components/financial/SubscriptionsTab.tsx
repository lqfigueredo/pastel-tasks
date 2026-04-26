import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Search, Eye, AlertTriangle, Clock, TrendingUp, Users as UsersIcon } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { getCurrentLocale } from '@/lib/date';
import SubscriptionDetailDrawer from './SubscriptionDetailDrawer';

export interface SubscriptionRow {
  id: string;
  admin_user_id: string;
  status: string;
  provider: string;
  seats_purchased: number;
  minimum_seats: number;
  price_per_seat_cents: number;
  currency: string;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  past_due_since: string | null;
  cancel_at_period_end: boolean;
  admin_name: string;
  active_users: number;
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  trialing: 'secondary',
  active: 'default',
  past_due: 'destructive',
  suspended: 'destructive',
  canceled: 'outline',
  pending: 'secondary',
};

export default function SubscriptionsTab() {
  const { t, i18n } = useTranslation('financial');
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SubscriptionRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<SubscriptionRow | null>(null);

  const formatMoney = (cents: number, currency: string) =>
    (cents / 100).toLocaleString(i18n.language || 'pt-BR', { style: 'currency', currency });

  const load = async () => {
    setLoading(true);
    const { data: subs } = await supabase.from('subscriptions').select('*');
    if (!subs) {
      setRows([]);
      setLoading(false);
      return;
    }
    const adminIds = subs.map((s) => s.admin_user_id);
    const [profilesRes, approvalsRes] = await Promise.all([
      supabase.from('profiles').select('user_id, display_name').in('user_id', adminIds),
      supabase.from('user_approvals').select('created_by_admin, status').in('created_by_admin', adminIds).eq('status', 'approved'),
    ]);
    const nameMap = new Map((profilesRes.data || []).map((p) => [p.user_id, p.display_name]));
    const usageMap = new Map<string, number>();
    (approvalsRes.data || []).forEach((a: any) => {
      usageMap.set(a.created_by_admin, (usageMap.get(a.created_by_admin) || 0) + 1);
    });
    setRows(
      subs.map((s: any) => ({
        ...s,
        admin_name: nameMap.get(s.admin_user_id) || t('subscriptions.table.noName'),
        active_users: usageMap.get(s.admin_user_id) || 0,
      })),
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (search && !r.admin_name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [rows, statusFilter, search]);

  const kpis = useMemo(() => {
    const active = rows.filter((r) => r.status === 'active');
    const trial = rows.filter((r) => r.status === 'trialing');
    const pastDue = rows.filter((r) => r.status === 'past_due');
    const suspended = rows.filter((r) => r.status === 'suspended');
    const canceled = rows.filter((r) => r.status === 'canceled');
    const mrr = active.reduce((acc, r) => acc + r.seats_purchased * r.price_per_seat_cents, 0);
    const mrrTrial = trial.reduce((acc, r) => acc + r.seats_purchased * r.price_per_seat_cents, 0);
    const totalSeats = rows.filter((r) => !['suspended', 'canceled'].includes(r.status)).reduce((a, r) => a + r.seats_purchased, 0);
    const usedSeats = rows.reduce((a, r) => a + r.active_users, 0);
    const occupancy = totalSeats > 0 ? Math.round((usedSeats / totalSeats) * 100) : 0;
    return { active, trial, pastDue, suspended, canceled, mrr, mrrTrial, totalSeats, usedSeats, occupancy };
  }, [rows]);

  const trialAlerts = rows.filter(
    (r) => r.status === 'trialing' && r.trial_ends_at && new Date(r.trial_ends_at).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000,
  );

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2"><TrendingUp className="h-4 w-4" /> {t('subscriptions.kpis.mrrTitle')}</CardDescription>
            <CardTitle className="text-2xl">{formatMoney(kpis.mrr, 'BRL')}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {t('subscriptions.kpis.mrrTrialSuffix', { value: formatMoney(kpis.mrrTrial, 'BRL') })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('subscriptions.kpis.byStatus')}</CardDescription>
            <CardTitle className="text-base font-normal flex flex-wrap gap-1">
              <Badge>{t('subscriptions.kpis.active', { n: kpis.active.length })}</Badge>
              <Badge variant="secondary">{t('subscriptions.kpis.trial', { n: kpis.trial.length })}</Badge>
              <Badge variant="destructive">{t('subscriptions.kpis.pastDue', { n: kpis.pastDue.length })}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {t('subscriptions.kpis.suspendedCanceled', { suspended: kpis.suspended.length, canceled: kpis.canceled.length })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2"><UsersIcon className="h-4 w-4" /> {t('subscriptions.kpis.occupancy')}</CardDescription>
            <CardTitle className="text-2xl">{kpis.occupancy}%</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {t('subscriptions.kpis.occupancyDetail', { used: kpis.usedSeats, total: kpis.totalSeats })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> {t('subscriptions.kpis.alerts')}</CardDescription>
            <CardTitle className="text-2xl">{trialAlerts.length + kpis.pastDue.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {t('subscriptions.kpis.alertsDetail', { trial: trialAlerts.length, pastDue: kpis.pastDue.length })}
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('subscriptions.filters.searchAdmin')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('subscriptions.filters.allStatus')}</SelectItem>
            <SelectItem value="active">{t('subscriptions.filters.active')}</SelectItem>
            <SelectItem value="trialing">{t('subscriptions.filters.trialing')}</SelectItem>
            <SelectItem value="past_due">{t('subscriptions.filters.pastDue')}</SelectItem>
            <SelectItem value="suspended">{t('subscriptions.filters.suspended')}</SelectItem>
            <SelectItem value="canceled">{t('subscriptions.filters.canceled')}</SelectItem>
            <SelectItem value="pending">{t('subscriptions.filters.pending')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabela */}
      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('subscriptions.table.admin')}</TableHead>
              <TableHead>{t('subscriptions.table.status')}</TableHead>
              <TableHead>{t('subscriptions.table.seats')}</TableHead>
              <TableHead>{t('subscriptions.table.monthly')}</TableHead>
              <TableHead>{t('subscriptions.table.nextCycle')}</TableHead>
              <TableHead>{t('subscriptions.table.provider')}</TableHead>
              <TableHead className="text-right">{t('subscriptions.table.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  {t('subscriptions.table.empty')}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => {
                const variant = STATUS_VARIANT[r.status] ?? 'outline';
                const label = t(`subscriptions.status.${r.status}`, { defaultValue: r.status });
                const monthly = (r.seats_purchased * r.price_per_seat_cents) / 100;
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {r.admin_name}
                      {r.status === 'trialing' && r.trial_ends_at && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="h-3 w-3" />
                          {t('subscriptions.table.trialEnds', { relative: formatDistanceToNow(new Date(r.trial_ends_at), { addSuffix: true, locale: getCurrentLocale() }) })}
                        </div>
                      )}
                      {r.status === 'past_due' && r.past_due_since && (
                        <div className="text-xs text-destructive flex items-center gap-1 mt-0.5">
                          <AlertTriangle className="h-3 w-3" />
                          {t('subscriptions.table.pastDueSince', { date: format(new Date(r.past_due_since), 'dd/MM/yyyy', { locale: getCurrentLocale() }) })}
                        </div>
                      )}
                    </TableCell>
                    <TableCell><Badge variant={variant}>{label}</Badge></TableCell>
                    <TableCell>
                      <span className={r.active_users > r.seats_purchased ? 'text-destructive font-semibold' : ''}>
                        {r.active_users}/{r.seats_purchased}
                      </span>
                    </TableCell>
                    <TableCell>{r.price_per_seat_cents > 0 ? formatMoney(monthly * 100, r.currency) : '—'}</TableCell>
                    <TableCell className="text-sm">
                      {r.current_period_end ? format(new Date(r.current_period_end), 'dd/MM/yyyy', { locale: getCurrentLocale() }) : '—'}
                    </TableCell>
                    <TableCell><Badge variant="outline">{r.provider}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => setSelected(r)}>
                        <Eye className="h-4 w-4 mr-1" /> {t('subscriptions.table.details')}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <SubscriptionDetailDrawer
        subscription={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        onChanged={load}
      />
    </div>
  );
}
