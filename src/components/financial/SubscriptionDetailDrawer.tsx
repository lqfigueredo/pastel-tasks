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
import { Loader2, Plus, FileText, History, StickyNote, Settings2, Receipt, AlertCircle, CheckCircle2, Tag } from 'lucide-react';
import type { SubscriptionRow } from './SubscriptionsTab';
import ManualPaymentDialog from './ManualPaymentDialog';
import SubscriptionActionsDialog from './SubscriptionActionsDialog';
import SubscriptionDiscountsSection from './SubscriptionDiscountsSection';
import EditBillingProfileDialog from './EditBillingProfileDialog';
import { Pencil } from 'lucide-react';
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
  comp_activation: 'Ativação como cortesia',
  voucher_applied: 'Voucher aplicado',
  voucher_removed: 'Voucher removido',
  direct_discount: 'Desconto direto aplicado',
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
  const [editFiscalOpen, setEditFiscalOpen] = useState(false);

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
            <SheetDescription className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{subscription.provider}</Badge>
              <Badge>{subscription.status}</Badge>
              {(() => {
                const lastComp = changes.find((c) => c.change_type === 'comp_activation');
                if (!lastComp) return null;
                return (
                  <Badge
                    variant="secondary"
                    className="bg-primary/15 text-primary border-primary/30"
                    title={lastComp.reason || 'Cortesia ativa'}
                  >
                    🎁 Cortesia
                  </Badge>
                );
              })()}
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

            {/* Aviso de dados fiscais incompletos */}
            {billingProfile === null || (() => {
              const required = ['legal_name', 'tax_id', 'email', 'postal_code', 'address_line1', 'address_number', 'neighborhood', 'city', 'state'];
              return billingProfile && required.some((k) => !String((billingProfile as any)[k] || '').trim());
            })() ? (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-amber-700 dark:text-amber-400">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <div className="text-xs space-y-1">
                  <p className="font-semibold">Dados fiscais incompletos</p>
                  <p>
                    Não é possível registrar pagamento ou gerar fatura até o cliente completar
                    o cadastro fiscal. Veja os campos pendentes na aba <strong>Fiscal</strong>.
                  </p>
                </div>
              </div>
            ) : null}

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
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="invoices"><FileText className="h-4 w-4 mr-1" /> Faturas</TabsTrigger>
                <TabsTrigger value="discounts"><Tag className="h-4 w-4 mr-1" /> Descontos</TabsTrigger>
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

                  <TabsContent value="discounts" className="mt-4">
                    <SubscriptionDiscountsSection
                      subscriptionId={subscription.id}
                      onChanged={() => { load(); onChanged(); }}
                    />
                  </TabsContent>

                  <TabsContent value="fiscal" className="space-y-3 mt-4">
                    <div className="flex justify-end">
                      <Button size="sm" variant="outline" onClick={() => setEditFiscalOpen(true)}>
                        <Pencil className="h-3.5 w-3.5 mr-1" />
                        {billingProfile ? 'Editar dados fiscais' : 'Cadastrar dados fiscais'}
                      </Button>
                    </div>
                    {!billingProfile ? (
                      <div className="text-center py-8 space-y-2">
                        <AlertCircle className="h-8 w-8 text-amber-500 mx-auto" />
                        <p className="text-sm text-muted-foreground">
                          Cliente ainda não preencheu os dados fiscais.
                        </p>
                      </div>
                    ) : (() => {
                      const isCompany = billingProfile.entity_type === 'company';
                      const required = ['legal_name', 'tax_id', 'email', 'postal_code', 'address_line1', 'address_number', 'neighborhood', 'city', 'state'];
                      const missing = required.filter((k) => !String((billingProfile as any)[k] || '').trim());
                      const taxIdFmt = billingProfile.tax_id
                        ? (isCompany ? formatCNPJ(billingProfile.tax_id) : formatCPF(billingProfile.tax_id))
                        : '—';
                      return (
                        <>
                          <div className={`flex items-center gap-2 text-sm p-3 rounded-lg ${missing.length === 0 ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'}`}>
                            {missing.length === 0 ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                            {missing.length === 0
                              ? 'Dados completos para emissão de NF'
                              : `Faltam ${missing.length} campo(s) para emissão de NF`}
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-muted-foreground text-xs">Tipo</p>
                              <p>{isCompany ? 'Pessoa jurídica' : 'Pessoa física'}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs">{isCompany ? 'CNPJ' : 'CPF'}</p>
                              <p className="font-mono">{taxIdFmt}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-muted-foreground text-xs">{isCompany ? 'Razão social' : 'Nome'}</p>
                              <p>{billingProfile.legal_name || '—'}</p>
                            </div>
                            {isCompany && billingProfile.trade_name && (
                              <div className="col-span-2">
                                <p className="text-muted-foreground text-xs">Nome fantasia</p>
                                <p>{billingProfile.trade_name}</p>
                              </div>
                            )}
                            {isCompany && (
                              <>
                                <div>
                                  <p className="text-muted-foreground text-xs">Inscrição municipal</p>
                                  <p>{billingProfile.municipal_registration || '—'}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground text-xs">Inscrição estadual</p>
                                  <p>{billingProfile.state_registration || '—'}</p>
                                </div>
                              </>
                            )}
                            <div>
                              <p className="text-muted-foreground text-xs">Email</p>
                              <p className="break-all">{billingProfile.email || '—'}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs">Telefone</p>
                              <p>{billingProfile.phone ? formatPhone(billingProfile.phone) : '—'}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-muted-foreground text-xs">Endereço</p>
                              <p>
                                {[
                                  billingProfile.address_line1,
                                  billingProfile.address_number,
                                  billingProfile.address_complement,
                                ].filter(Boolean).join(', ') || '—'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {[billingProfile.neighborhood, billingProfile.city, billingProfile.state].filter(Boolean).join(' · ')}
                                {billingProfile.postal_code && ` · CEP ${formatCEP(billingProfile.postal_code)}`}
                              </p>
                            </div>
                          </div>
                        </>
                      );
                    })()}
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

      <EditBillingProfileDialog
        open={editFiscalOpen}
        onClose={() => setEditFiscalOpen(false)}
        adminUserId={subscription.admin_user_id}
        adminName={subscription.admin_name}
        onSaved={() => { load(); onChanged(); }}
      />
    </>
  );
}
