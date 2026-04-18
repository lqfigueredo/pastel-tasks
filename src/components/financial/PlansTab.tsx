import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Plus, Pencil, Star, Power, PowerOff, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Plan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price_per_seat_cents: number;
  currency: string;
  minimum_seats: number;
  billing_interval: 'month' | 'year';
  features: string[];
  is_active: boolean;
  is_default: boolean;
  created_at: string;
}

const empty = {
  code: '',
  name: '',
  description: '',
  price_per_seat_cents: 0,
  currency: 'BRL',
  minimum_seats: 10,
  billing_interval: 'month' as 'month' | 'year',
  features: '',
  is_active: true,
};

const formatMoney = (cents: number, currency: string) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency });

export default function PlansTab() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .order('is_default', { ascending: false })
      .order('price_per_seat_cents');
    if (error) toast.error('Erro ao carregar planos');
    setPlans(((data || []) as any[]).map((p) => ({ ...p, features: p.features || [] })));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };

  const openEdit = (p: Plan) => {
    setEditing(p);
    setForm({
      code: p.code,
      name: p.name,
      description: p.description || '',
      price_per_seat_cents: p.price_per_seat_cents,
      currency: p.currency,
      minimum_seats: p.minimum_seats,
      billing_interval: p.billing_interval,
      features: (p.features || []).join('\n'),
      is_active: p.is_active,
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error('Código e nome são obrigatórios');
      return;
    }
    setSaving(true);
    const payload = {
      code: form.code.trim().toLowerCase(),
      name: form.name.trim(),
      description: form.description.trim() || null,
      price_per_seat_cents: Math.max(0, Math.round(form.price_per_seat_cents)),
      currency: form.currency,
      minimum_seats: Math.max(1, form.minimum_seats),
      billing_interval: form.billing_interval,
      features: form.features
        .split('\n')
        .map((f) => f.trim())
        .filter(Boolean),
      is_active: form.is_active,
    };
    const res = editing
      ? await supabase.from('plans').update(payload).eq('id', editing.id)
      : await supabase.from('plans').insert(payload);
    setSaving(false);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    toast.success(editing ? 'Plano atualizado' : 'Plano criado');
    setOpen(false);
    load();
  };

  const setDefault = async (p: Plan) => {
    // Limpa default atual, depois marca o novo
    const { error: e1 } = await supabase.from('plans').update({ is_default: false }).eq('is_default', true);
    if (e1) {
      toast.error('Erro ao limpar default');
      return;
    }
    const { error: e2 } = await supabase.from('plans').update({ is_default: true }).eq('id', p.id);
    if (e2) toast.error(e2.message);
    else toast.success(`${p.name} é o novo plano padrão`);
    load();
  };

  const toggleActive = async (p: Plan) => {
    const { error } = await supabase.from('plans').update({ is_active: !p.is_active }).eq('id', p.id);
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
        <p className="text-sm text-muted-foreground">
          Catálogo de planos. Mudar o preço aqui só afeta novas assinaturas.
        </p>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> Novo plano
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {plans.map((p) => (
          <Card key={p.id} className={!p.is_active ? 'opacity-60' : ''}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {p.name}
                    {p.is_default && (
                      <Badge variant="default" className="text-xs">
                        <Star className="h-3 w-3 mr-1" /> Padrão
                      </Badge>
                    )}
                    {!p.is_active && <Badge variant="outline">Inativo</Badge>}
                  </CardTitle>
                  <CardDescription className="font-mono text-xs">{p.code}</CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{formatMoney(p.price_per_seat_cents, p.currency)}</p>
                  <p className="text-xs text-muted-foreground">/assento/{p.billing_interval === 'month' ? 'mês' : 'ano'}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {p.description && <p className="text-sm text-muted-foreground">{p.description}</p>}
              <p className="text-xs text-muted-foreground">Mínimo {p.minimum_seats} assentos</p>
              {p.features && p.features.length > 0 && (
                <ul className="text-sm space-y-1">
                  {p.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
                  <Pencil className="h-3 w-3 mr-1" /> Editar
                </Button>
                {!p.is_default && p.is_active && (
                  <Button size="sm" variant="outline" onClick={() => setDefault(p)}>
                    <Star className="h-3 w-3 mr-1" /> Tornar padrão
                  </Button>
                )}
                {!p.is_default && (
                  <Button size="sm" variant="ghost" onClick={() => toggleActive(p)}>
                    {p.is_active ? <PowerOff className="h-3 w-3 mr-1" /> : <Power className="h-3 w-3 mr-1" />}
                    {p.is_active ? 'Desativar' : 'Ativar'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar plano' : 'Novo plano'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Código</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="starter"
                  disabled={!!editing}
                />
              </div>
              <div>
                <Label>Nome</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Starter" />
              </div>
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Preço por assento (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price_per_seat_cents / 100}
                  onChange={(e) =>
                    setForm({ ...form, price_per_seat_cents: Math.round(parseFloat(e.target.value || '0') * 100) })
                  }
                />
              </div>
              <div>
                <Label>Mínimo assentos</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.minimum_seats}
                  onChange={(e) => setForm({ ...form, minimum_seats: parseInt(e.target.value || '1') })}
                />
              </div>
              <div>
                <Label>Ciclo</Label>
                <Select
                  value={form.billing_interval}
                  onValueChange={(v: 'month' | 'year') => setForm({ ...form, billing_interval: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">Mensal</SelectItem>
                    <SelectItem value="year">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Features (uma por linha)</Label>
              <Textarea
                rows={4}
                value={form.features}
                onChange={(e) => setForm({ ...form, features: e.target.value })}
                placeholder="Tarefas ilimitadas&#10;Suporte 24/7&#10;Relatórios avançados"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="active">Ativo</Label>
              <Switch
                id="active"
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
