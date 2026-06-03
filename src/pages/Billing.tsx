import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { CreditCard, AlertTriangle, Users, Calendar, ArrowUp, Sparkles } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { getCurrentLocale } from '@/lib/date';
import BillingProfileForm from '@/components/billing/BillingProfileForm';
import InvoiceHistory from '@/components/billing/InvoiceHistory';
import { ActivateSubscriptionDialog } from '@/components/billing/ActivateSubscriptionDialog';
import { RequestSeatsDialog } from '@/components/admin/RequestSeatsDialog';
import { PageLoader } from '@/components/ui/loaders';

interface Subscription {
  id: string;
  provider: string;
  status: string;
  seats_purchased: number;
  minimum_seats: number;
  price_per_seat_cents: number;
  currency: string;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  past_due_since: string | null;
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  trialing: 'secondary',
  active: 'default',
  past_due: 'destructive',
  suspended: 'destructive',
  canceled: 'outline',
  pending: 'secondary',
};

export default function Billing() {
  const { t, i18n } = useTranslation('billing');
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [pendingSeats, setPendingSeats] = useState(10);
  const [activateOpen, setActivateOpen] = useState(false);
  const [activateContext, setActivateContext] = useState<{ subject: string; label: string }>({
    subject: t('payment.activateSubject'),
    label: t('payment.activateLabel'),
  });
  const [requestSeatsOpen, setRequestSeatsOpen] = useState(false);

  const dateFmt = (d: string | Date) =>
    format(new Date(d), 'PPP', { locale: getCurrentLocale() });
  const moneyFmt = (value: number, currency: string) =>
    value.toLocaleString(i18n.language || 'pt-BR', { style: 'currency', currency });

  const { data: billingData, isLoading: loading } = useQuery({
    queryKey: ['billing', user?.id],
    queryFn: async () => {
      const [subRes, countRes] = await Promise.all([
        supabase.from('subscriptions').select('*').eq('admin_user_id', user!.id).maybeSingle(),
        supabase.rpc('get_admin_active_users_count', { _admin_id: user!.id }),
      ]);
      return {
        sub: (subRes.data as Subscription | null) ?? null,
        activeUsers: typeof countRes.data === 'number' ? countRes.data : 0,
      };
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const sub = billingData?.sub ?? null;
  const activeUsers = billingData?.activeUsers ?? 0;

  useEffect(() => {
    if (sub) setPendingSeats(sub.seats_purchased);
  }, [sub?.seats_purchased]);

  const load = () => queryClient.invalidateQueries({ queryKey: ['billing', user?.id] });

  const openActivate = (subject: string, label: string) => {
    setActivateContext({ subject, label });
    setActivateOpen(true);
  };

  const handleUpgrade = async () => {
    const current = sub?.seats_purchased ?? 0;
    if (pendingSeats > current) {
      setRequestSeatsOpen(true);
      return;
    }
    openActivate(
      t('adjust.reduceSubject', { seats: pendingSeats, delta: pendingSeats - current }),
      t('adjust.reduceLabel', { seats: pendingSeats }),
    );
  };

  const handleManagePayment = async () => {
    openActivate(t('payment.updateSubject'), t('payment.updateLabel'));
  };

  const handleActivateNow = () => {
    openActivate(t('payment.activateSubject'), t('payment.activateLabel'));
  };

  if (loading) {
    return <PageLoader />;
  }

  if (!sub) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('notFound.title')}</CardTitle>
            <CardDescription>{t('notFound.description')}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const statusLabel = t(`status.${sub.status}`, { defaultValue: sub.status });
  const statusVariant = STATUS_VARIANT[sub.status] ?? 'outline';
  const monthlyTotal = (sub.seats_purchased * sub.price_per_seat_cents) / 100;
  const pendingTotal = (pendingSeats * sub.price_per_seat_cents) / 100;
  const isProblem = sub.status === 'past_due' || sub.status === 'suspended';
  const seatsUsedPct = Math.min(100, Math.round((activeUsers / sub.seats_purchased) * 100));
  const trialDaysLeft = sub.trial_ends_at ? differenceInDays(new Date(sub.trial_ends_at), new Date()) : null;

  return (
    <div className="container mx-auto space-y-6 p-6 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">{t('page.title')}</h1>
          <p className="text-muted-foreground">{t('page.subtitle')}</p>
        </div>
        <Badge variant={statusVariant} className="text-sm">{statusLabel}</Badge>
      </div>

      {/* Banners */}
      {sub.price_per_seat_cents === 0 && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="flex items-start gap-3 pt-6 flex-wrap">
            <Sparkles className="mt-1 h-5 w-5 text-primary shrink-0" />
            <div className="flex-1 min-w-[200px]">
              <p className="font-semibold">{t('alerts.freePlanTitle')}</p>
              <p className="text-sm text-muted-foreground">
                {t('alerts.freePlanDesc', { date: sub.current_period_end ? dateFmt(sub.current_period_end) : '—' })}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {isProblem && (
        <Card className="border-destructive">
          <CardContent className="flex items-start gap-3 pt-6">
            <AlertTriangle className="mt-1 h-5 w-5 text-destructive" />
            <div className="flex-1">
              <p className="font-semibold">{t('alerts.pastDueTitle')}</p>
              <p className="text-sm text-muted-foreground">
                {sub.status === 'suspended' ? t('alerts.suspendedDesc') : t('alerts.pastDueDesc')}
              </p>
              <Button onClick={handleManagePayment} className="mt-3" size="sm">
                {t('alerts.updatePayment')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {sub.status === 'trialing' && trialDaysLeft !== null && trialDaysLeft >= 0 && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="flex items-start gap-3 pt-6 flex-wrap">
            <Sparkles className="mt-1 h-5 w-5 text-primary shrink-0" />
            <div className="flex-1 min-w-[200px]">
              <p className="font-semibold">
                {trialDaysLeft <= 7
                  ? t('alerts.trialEndingSoon', { days: trialDaysLeft })
                  : t('alerts.trialActive', { days: trialDaysLeft })}
              </p>
              <p className="text-sm text-muted-foreground">{t('alerts.trialActivateCta')}</p>
            </div>
            <Button onClick={handleActivateNow} size="sm">{t('alerts.activateNow')}</Button>
          </CardContent>
        </Card>
      )}

      {sub.cancel_at_period_end && (
        <Card className="border-orange-500/40 bg-orange-500/5">
          <CardContent className="flex items-start gap-3 pt-6">
            <AlertTriangle className="mt-1 h-5 w-5 text-orange-600" />
            <div>
              <p className="font-semibold">{t('alerts.cancelScheduledTitle')}</p>
              <p className="text-sm text-muted-foreground">
                {t('alerts.cancelScheduledDesc', { date: sub.current_period_end ? dateFmt(sub.current_period_end) : '—' })}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resumo */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Users className="h-4 w-4" /> {t('summary.seatsPurchased')}
            </CardDescription>
            <CardTitle className="text-3xl">{sub.seats_purchased}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">{t('summary.minSeats', { n: sub.minimum_seats })}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('summary.inUse')}</CardDescription>
            <CardTitle className="text-3xl">{activeUsers}<span className="text-base font-normal text-muted-foreground"> / {sub.seats_purchased}</span></CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div className="h-full bg-primary transition-all" style={{ width: `${seatsUsedPct}%` }} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('summary.monthlyEstimate')}</CardDescription>
            <CardTitle className="text-3xl">
              {sub.price_per_seat_cents > 0 ? moneyFmt(monthlyTotal, sub.currency) : '—'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {sub.price_per_seat_cents > 0
                ? t('summary.perSeat', { value: moneyFmt(sub.price_per_seat_cents / 100, sub.currency) })
                : t('summary.priceTbd')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Ajuste de assentos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ArrowUp className="h-5 w-5" /> {t('adjust.title')}</CardTitle>
          <CardDescription>{t('adjust.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">{t('adjust.newTotal')}</span>
            <span className="text-2xl font-bold">{pendingSeats}</span>
          </div>
          <Slider
            value={[pendingSeats]}
            min={Math.max(sub.minimum_seats, activeUsers)}
            max={Math.max(100, sub.seats_purchased + 50)}
            step={1}
            onValueChange={(v) => setPendingSeats(v[0])}
          />
          <div className="flex items-center justify-between rounded-lg border p-4 flex-wrap gap-3">
            <div>
              <p className="text-sm text-muted-foreground">{t('adjust.newMonthly')}</p>
              <p className="text-xl font-semibold">
                {sub.price_per_seat_cents > 0 ? moneyFmt(pendingTotal, sub.currency) : '—'}
              </p>
            </div>
            <Button onClick={handleUpgrade} disabled={pendingSeats === sub.seats_purchased}>
              {pendingSeats > sub.seats_purchased
                ? t('adjust.requestUpgrade')
                : pendingSeats < sub.seats_purchased
                  ? t('adjust.scheduleReduction')
                  : t('adjust.noChanges')}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('adjust.minSeatsHelp', { n: Math.max(sub.minimum_seats, activeUsers) })}
            {activeUsers > sub.minimum_seats && t('adjust.activeUsersHelp', { n: activeUsers })}
          </p>
        </CardContent>
      </Card>

      {/* Ciclo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" /> {t('cycle.title')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">{t('cycle.periodStart')}</p>
            <p className="font-medium">{sub.current_period_start ? dateFmt(sub.current_period_start) : '—'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('cycle.nextCharge')}</p>
            <p className="font-medium">{sub.current_period_end ? dateFmt(sub.current_period_end) : '—'}</p>
          </div>
          {sub.trial_ends_at && (
            <div className="sm:col-span-2">
              <p className="text-sm text-muted-foreground">{t('cycle.trialEndsAt')}</p>
              <p className="font-medium">{dateFmt(sub.trial_ends_at)}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Faturas */}
      <InvoiceHistory />

      {/* Dados fiscais */}
      <BillingProfileForm />

      {/* Pagamento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" /> {t('payment.title')}</CardTitle>
          <CardDescription>{t('payment.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleManagePayment}>{t('payment.manage')}</Button>
        </CardContent>
      </Card>

      <ActivateSubscriptionDialog
        open={activateOpen}
        onOpenChange={setActivateOpen}
        defaultSubject={activateContext.subject}
        contextLabel={activateContext.label}
        onSuccess={load}
      />

      <RequestSeatsDialog
        open={requestSeatsOpen}
        onOpenChange={setRequestSeatsOpen}
        currentSeats={sub.seats_purchased}
        suggestedSeats={pendingSeats}
        onSuccess={load}
      />
    </div>
  );
}
