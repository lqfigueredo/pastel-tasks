import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Loader2, CreditCard, AlertTriangle, Users, Calendar, ArrowUp, Clock, Sparkles } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import BillingProfileForm from '@/components/billing/BillingProfileForm';
import InvoiceHistory from '@/components/billing/InvoiceHistory';
import { ActivateSubscriptionDialog } from '@/components/billing/ActivateSubscriptionDialog';
import { RequestSeatsDialog } from '@/components/admin/RequestSeatsDialog';

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

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  trialing: { label: 'Em período de teste', variant: 'secondary' },
  active: { label: 'Ativa', variant: 'default' },
  past_due: { label: 'Pagamento pendente', variant: 'destructive' },
  suspended: { label: 'Suspensa', variant: 'destructive' },
  canceled: { label: 'Cancelada', variant: 'outline' },
  pending: { label: 'Aguardando ativação', variant: 'secondary' },
};

export default function Billing() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sub, setSub] = useState<Subscription | null>(null);
  const [activeUsers, setActiveUsers] = useState(0);
  const [pendingSeats, setPendingSeats] = useState(10);
  const [activateOpen, setActivateOpen] = useState(false);
  const [activateContext, setActivateContext] = useState<{ subject: string; label: string }>({
    subject: 'Quero ativar minha assinatura',
    label: 'ativação de assinatura',
  });
  const [requestSeatsOpen, setRequestSeatsOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    load();
  }, [user]);

  const load = async () => {
    setLoading(true);
    const [subRes, countRes] = await Promise.all([
      supabase.from('subscriptions').select('*').eq('admin_user_id', user!.id).maybeSingle(),
      supabase.rpc('get_admin_active_users_count', { _admin_id: user!.id }),
    ]);
    if (subRes.data) {
      setSub(subRes.data as Subscription);
      setPendingSeats(subRes.data.seats_purchased);
    }
    if (typeof countRes.data === 'number') setActiveUsers(countRes.data);
    setLoading(false);
  };

  const openActivate = (subject: string, label: string) => {
    setActivateContext({ subject, label });
    setActivateOpen(true);
  };

  const handleUpgrade = async () => {
    const current = sub?.seats_purchased ?? 0;
    if (pendingSeats > current) {
      // Aumento: usa fluxo unificado de solicitação ao Financeiro
      setRequestSeatsOpen(true);
      return;
    }
    // Redução: mantém o fluxo livre de mensagem
    openActivate(
      `Ajuste de assentos: reduzir para ${pendingSeats} assentos (${pendingSeats - current})`,
      `redução de assentos para ${pendingSeats}`,
    );
  };

  const handleManagePayment = async () => {
    openActivate('Atualizar forma de pagamento', 'atualização de forma de pagamento');
  };

  const handleActivateNow = () => {
    openActivate('Quero ativar minha assinatura agora', 'ativação imediata da assinatura');
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!sub) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Assinatura não encontrada</CardTitle>
            <CardDescription>Sua conta ainda não possui uma assinatura ativa. Entre em contato com o suporte.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const statusInfo = STATUS_LABELS[sub.status] ?? { label: sub.status, variant: 'outline' as const };
  const monthlyTotal = (sub.seats_purchased * sub.price_per_seat_cents) / 100;
  const pendingTotal = (pendingSeats * sub.price_per_seat_cents) / 100;
  const isProblem = sub.status === 'past_due' || sub.status === 'suspended';
  const seatsUsedPct = Math.min(100, Math.round((activeUsers / sub.seats_purchased) * 100));
  const trialDaysLeft = sub.trial_ends_at ? differenceInDays(new Date(sub.trial_ends_at), new Date()) : null;

  return (
    <div className="container mx-auto space-y-6 p-6 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Assinatura e Cobrança</h1>
          <p className="text-muted-foreground">Gerencie seu plano, faturas e dados fiscais</p>
        </div>
        <Badge variant={statusInfo.variant} className="text-sm">{statusInfo.label}</Badge>
      </div>

      {/* Banners */}
      {isProblem && (
        <Card className="border-destructive">
          <CardContent className="flex items-start gap-3 pt-6">
            <AlertTriangle className="mt-1 h-5 w-5 text-destructive" />
            <div className="flex-1">
              <p className="font-semibold">Atenção: pagamento pendente</p>
              <p className="text-sm text-muted-foreground">
                {sub.status === 'suspended'
                  ? 'Sua assinatura foi suspensa por falta de pagamento. Regularize para reativar o acesso.'
                  : 'Detectamos um problema com o último pagamento. Atualize sua forma de pagamento para evitar suspensão.'}
              </p>
              <Button onClick={handleManagePayment} className="mt-3" size="sm">
                Atualizar pagamento
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
                  ? `Período de teste termina em ${trialDaysLeft} dia(s)`
                  : `Você está em período de teste (${trialDaysLeft} dias restantes)`}
              </p>
              <p className="text-sm text-muted-foreground">
                Ative sua assinatura agora para garantir continuidade do acesso da equipe.
              </p>
            </div>
            <Button onClick={handleActivateNow} size="sm">Ativar agora</Button>
          </CardContent>
        </Card>
      )}

      {sub.cancel_at_period_end && (
        <Card className="border-orange-500/40 bg-orange-500/5">
          <CardContent className="flex items-start gap-3 pt-6">
            <AlertTriangle className="mt-1 h-5 w-5 text-orange-600" />
            <div>
              <p className="font-semibold">Cancelamento agendado</p>
              <p className="text-sm text-muted-foreground">
                Sua assinatura será cancelada em{' '}
                {sub.current_period_end ? format(new Date(sub.current_period_end), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : '—'}.
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
              <Users className="h-4 w-4" /> Assentos contratados
            </CardDescription>
            <CardTitle className="text-3xl">{sub.seats_purchased}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Mínimo de {sub.minimum_seats} assentos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Em uso</CardDescription>
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
            <CardDescription>Mensalidade estimada</CardDescription>
            <CardTitle className="text-3xl">
              {sub.price_per_seat_cents > 0
                ? monthlyTotal.toLocaleString('pt-BR', { style: 'currency', currency: sub.currency })
                : '—'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {sub.price_per_seat_cents > 0
                ? `${(sub.price_per_seat_cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: sub.currency })} por assento`
                : 'Preço a ser definido'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Ajuste de assentos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ArrowUp className="h-5 w-5" /> Ajustar assentos</CardTitle>
          <CardDescription>Aumente para adicionar mais usuários. Reduções entram em vigor no próximo ciclo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Novo total de assentos</span>
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
              <p className="text-sm text-muted-foreground">Novo valor mensal estimado</p>
              <p className="text-xl font-semibold">
                {sub.price_per_seat_cents > 0
                  ? pendingTotal.toLocaleString('pt-BR', { style: 'currency', currency: sub.currency })
                  : '—'}
              </p>
            </div>
            <Button onClick={handleUpgrade} disabled={pendingSeats === sub.seats_purchased}>
              {pendingSeats > sub.seats_purchased ? 'Solicitar upgrade' : pendingSeats < sub.seats_purchased ? 'Agendar redução' : 'Sem alterações'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Mínimo de {Math.max(sub.minimum_seats, activeUsers)} assentos
            {activeUsers > sub.minimum_seats && ` (você tem ${activeUsers} usuários ativos)`}.
          </p>
        </CardContent>
      </Card>

      {/* Ciclo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" /> Ciclo atual</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Início do período</p>
            <p className="font-medium">
              {sub.current_period_start
                ? format(new Date(sub.current_period_start), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                : '—'}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Próxima cobrança</p>
            <p className="font-medium">
              {sub.current_period_end
                ? format(new Date(sub.current_period_end), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                : '—'}
            </p>
          </div>
          {sub.trial_ends_at && (
            <div className="sm:col-span-2">
              <p className="text-sm text-muted-foreground">Período de teste termina em</p>
              <p className="font-medium">
                {format(new Date(sub.trial_ends_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
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
          <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" /> Forma de pagamento</CardTitle>
          <CardDescription>Em breve: gestão automática de cartão e boleto via provedor.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleManagePayment}>Gerenciar pagamento</Button>
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
