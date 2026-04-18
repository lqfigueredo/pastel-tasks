import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { Loader2, Plus, FileText, History, StickyNote, Settings2, Receipt, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { SubscriptionRow } from './SubscriptionsTab';
import ManualPaymentDialog from './ManualPaymentDialog';
import SubscriptionActionsDialog from './SubscriptionActionsDialog';
import { formatCPF, formatCNPJ, formatCEP, formatPhone } from '@/lib/br-validators';

interface Props {
  subscription: SubscriptionRow | null;
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
}

interface Invoice {
  id: string;
  period_start: string;
  period_end: string;
  amount_cents: number;
  currency: string;
  status: string;
  paid_at: string | null;
  payment_method: string | null;
  notes: string | null;
}

interface Change {
  id: string;
  change_type: string;
  old_value: any;
  new_value: any;
  reason: string | null;
  created_at: string;
}

interface Note {
  id: string;
  content: string;
  author_id: string;
  created_at: string;
}

interface BillingProfile {
  entity_type: string;
  legal_name: string | null;
  trade_name: string | null;
  tax_id: string | null;
  municipal_registration: string | null;
  state_registration: string | null;
  email: string | null;
  phone: string | null;
  postal_code: string | null;
  address_line1: string | null;
  address_number: string | null;
  address_complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
}

const CHANGE_LABELS: Record<string, string> = {
  seats_changed: 'Assentos alterados',
  status_changed: 'Status alterado',
  trial_extended: 'Trial estendido',
  manual_payment: 'Pagamento manual',
  cycle_advanced: 'Ciclo avançado',
  created: 'Assinatura criada',
  cancellation_scheduled: 'Cancelamento agendado',
  reactivated: 'Reativada',
  note: 'Anotação',
};

export default function SubscriptionDetailDrawer({ subscription, open, onClose, onChanged }: Props) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [changes, setChanges] = useState<Change[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [billingProfile, setBillingProfile] = useState<BillingProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);

  const load = async () => {
    if (!subscription) return;
    setLoading(true);
    const [inv, ch, nt, bp] = await Promise.all([
      supabase.from('invoices').select('*').eq('subscription_id', subscription.id).order('created_at', { ascending: false }),
      supabase.from('subscription_changes').select('*').eq('subscription_id', subscription.id).order('created_at', { ascending: false }).limit(50),
      supabase.from('subscription_notes').select('*').eq('subscription_id', subscription.id).order('created_at', { ascending: false }),
      supabase.from('billing_profiles').select('*').eq('admin_user_id', subscription.admin_user_id).maybeSingle(),
    ]);
    setInvoices((inv.data as Invoice[]) || []);
    setChanges((ch.data as Change[]) || []);
    setNotes((nt.data as Note[]) || []);
    setBillingProfile((bp.data as BillingProfile) || null);
    setLoading(false);
  };

  useEffect(() => {
    if (open && subscription) load();
  }, [open, subscription?.id]);

  const handleAddNote = async () => {
    if (!newNote.trim() || !subscription) return;
    setSavingNote(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('subscription_notes').insert({
      subscription_id: subscription.id,
      author_id: user!.id,
      content: newNote.trim(),
    });
    setSavingNote(false);
    if (error) {
      toast.error('Erro ao salvar nota');
      return;
    }
    setNewNote('');
    load();
  };

  if (!subscription) return null;

  const monthly = (subscription.seats_purchased * subscription.price_per_seat_cents) / 100;
  const formatMoney = (cents: number, currency: string) =>
    (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency });

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{subscription.admin_name}</SheetTitle>
            <SheetDescription>
              <Badge variant="outline">{subscription.provider}</Badge>{' '}
              <Badge>{subscription.status}</Badge>
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {/* Resumo rápido */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Assentos</p>
                <p className="font-semibold">{subscription.active_users} / {subscription.seats_purchased}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Mensalidade</p>
                <p className="font-semibold">{subscription.price_per_seat_cents > 0 ? formatMoney(monthly * 100, subscription.currency) : '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Próximo ciclo</p>
                <p className="font-semibold">
                  {subscription.current_period_end ? format(new Date(subscription.current_period_end), 'dd/MM/yyyy', { locale: ptBR }) : '—'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Trial termina</p>
                <p className="font-semibold">
                  {subscription.trial_ends_at ? format(new Date(subscription.trial_ends_at), 'dd/MM/yyyy', { locale: ptBR }) : '—'}
                </p>
              </div>
            </div>

            {/* Ações rápidas */}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setPaymentOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Registrar pagamento
              </Button>
              <Button size="sm" variant="outline" onClick={() => setActionsOpen(true)}>
                <Settings2 className="h-4 w-4 mr-1" /> Gerenciar assinatura
              </Button>
            </div>

            <Separator />

            <Tabs defaultValue="invoices">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="invoices"><FileText className="h-4 w-4 mr-1" /> Faturas</TabsTrigger>
                <TabsTrigger value="fiscal"><Receipt className="h-4 w-4 mr-1" /> Fiscal</TabsTrigger>
                <TabsTrigger value="changes"><History className="h-4 w-4 mr-1" /> Histórico</TabsTrigger>
                <TabsTrigger value="notes"><StickyNote className="h-4 w-4 mr-1" /> Notas</TabsTrigger>
              </TabsList>

              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : (
                <>
                  <TabsContent value="invoices" className="space-y-2 mt-4">
                    {invoices.length === 0 ? (
                      <p className="text-center text-muted-foreground text-sm py-6">Sem faturas registradas.</p>
                    ) : invoices.map((inv) => (
                      <div key={inv.id} className="flex items-start justify-between border rounded-lg p-3">
                        <div>
                          <p className="font-medium">{formatMoney(inv.amount_cents, inv.currency)}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(inv.period_start), 'dd/MM/yy', { locale: ptBR })} → {format(new Date(inv.period_end), 'dd/MM/yy', { locale: ptBR })}
                          </p>
                          {inv.notes && <p className="text-xs text-muted-foreground mt-1">{inv.notes}</p>}
                        </div>
                        <div className="text-right">
                          <Badge variant={inv.status === 'paid' ? 'default' : inv.status === 'failed' ? 'destructive' : 'secondary'}>
                            {inv.status}
                          </Badge>
                          {inv.payment_method && <p className="text-xs text-muted-foreground mt-1">{inv.payment_method}</p>}
                        </div>
                      </div>
                    ))}
                  </TabsContent>

                  <TabsContent value="changes" className="space-y-2 mt-4">
                    {changes.length === 0 ? (
                      <p className="text-center text-muted-foreground text-sm py-6">Sem mudanças registradas.</p>
                    ) : changes.map((ch) => (
                      <div key={ch.id} className="border-l-2 border-primary/40 pl-3 py-1">
                        <p className="text-sm font-medium">{CHANGE_LABELS[ch.change_type] || ch.change_type}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(ch.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                        {(ch.old_value || ch.new_value) && (
                          <p className="text-xs mt-1 font-mono text-muted-foreground">
                            {ch.old_value && <>de: {JSON.stringify(ch.old_value)}<br /></>}
                            {ch.new_value && <>para: {JSON.stringify(ch.new_value)}</>}
                          </p>
                        )}
                        {ch.reason && <p className="text-xs italic mt-1">{ch.reason}</p>}
                      </div>
                    ))}
                  </TabsContent>

                  <TabsContent value="notes" className="space-y-3 mt-4">
                    <div className="space-y-2">
                      <Textarea
                        placeholder="Adicionar nota interna (visível só para solution_admin)..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        rows={2}
                      />
                      <Button size="sm" onClick={handleAddNote} disabled={!newNote.trim() || savingNote}>
                        {savingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Adicionar'}
                      </Button>
                    </div>
                    {notes.length === 0 ? (
                      <p className="text-center text-muted-foreground text-sm py-4">Sem notas.</p>
                    ) : notes.map((n) => (
                      <div key={n.id} className="border rounded-lg p-3 bg-muted/30">
                        <p className="text-sm whitespace-pre-wrap">{n.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(n.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    ))}
                  </TabsContent>
                </>
              )}
            </Tabs>
          </div>
        </SheetContent>
      </Sheet>

      <ManualPaymentDialog
        subscription={subscription}
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        onSuccess={() => { setPaymentOpen(false); load(); onChanged(); }}
      />

      <SubscriptionActionsDialog
        subscription={subscription}
        open={actionsOpen}
        onClose={() => setActionsOpen(false)}
        onSuccess={() => { setActionsOpen(false); load(); onChanged(); }}
      />
    </>
  );
}
