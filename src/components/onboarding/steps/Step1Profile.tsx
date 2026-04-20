import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface Props {
  onNext: () => void;
  onSkip: () => void;
}

export const Step1Profile = ({ onNext, onSkip }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [entityType, setEntityType] = useState<'individual' | 'company'>('individual');
  const [legalName, setLegalName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [billingEmail, setBillingEmail] = useState(user?.email || '');

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: profile }, { data: bp }] = await Promise.all([
        supabase.from('profiles').select('display_name').eq('user_id', user.id).maybeSingle(),
        supabase.from('billing_profiles').select('*').eq('admin_user_id', user.id).maybeSingle(),
      ]);
      if (profile?.display_name) setDisplayName(profile.display_name);
      if (bp) {
        setEntityType((bp.entity_type as any) || 'individual');
        setLegalName(bp.legal_name || '');
        setTaxId(bp.tax_id || '');
        setBillingEmail(bp.email || user.email || '');
      }
    })();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    if (!displayName.trim() || !legalName.trim() || !taxId.trim() || !billingEmail.trim()) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { error: pErr } = await supabase
        .from('profiles')
        .update({ display_name: displayName.trim() })
        .eq('user_id', user.id);
      if (pErr) throw pErr;

      const { data: existing } = await supabase
        .from('billing_profiles')
        .select('id')
        .eq('admin_user_id', user.id)
        .maybeSingle();

      const payload = {
        admin_user_id: user.id,
        entity_type: entityType,
        legal_name: legalName.trim(),
        tax_id: taxId.trim(),
        email: billingEmail.trim(),
      };

      const { error: bErr } = existing
        ? await supabase.from('billing_profiles').update(payload).eq('id', existing.id)
        : await supabase.from('billing_profiles').insert(payload);
      if (bErr) throw bErr;

      onNext();
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold mb-1">Bem-vindo!</h3>
        <p className="text-sm text-muted-foreground">
          Vamos configurar seu perfil em poucos passos. Você pode pular qualquer etapa.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="displayName">Seu nome</Label>
        <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Como devemos te chamar" />
      </div>

      <div className="space-y-2">
        <Label>Tipo de cadastro</Label>
        <RadioGroup value={entityType} onValueChange={(v) => setEntityType(v as any)} className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <RadioGroupItem value="individual" /> Pessoa física
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <RadioGroupItem value="company" /> Pessoa jurídica
          </label>
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label htmlFor="legalName">{entityType === 'company' ? 'Razão social' : 'Nome completo'}</Label>
        <Input id="legalName" value={legalName} onChange={(e) => setLegalName(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="taxId">{entityType === 'company' ? 'CNPJ' : 'CPF'}</Label>
          <Input id="taxId" value={taxId} onChange={(e) => setTaxId(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="billingEmail">Email de cobrança</Label>
          <Input id="billingEmail" type="email" value={billingEmail} onChange={(e) => setBillingEmail(e.target.value)} />
        </div>
      </div>

      <div className="flex justify-between pt-4 gap-2">
        <Button variant="ghost" onClick={onSkip}>Pular tudo</Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onNext}>Pular</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar e continuar
          </Button>
        </div>
      </div>
    </div>
  );
};
