import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  formatCPF, formatCNPJ, formatCEP, formatPhone, onlyDigits,
  isValidCPF, isValidCNPJ, isValidCEP, UF_LIST, lookupCEP,
} from '@/lib/br-validators';

type EntityType = 'individual' | 'company';

interface Profile {
  id?: string;
  entity_type: EntityType;
  legal_name: string;
  trade_name: string;
  tax_id: string;
  municipal_registration: string;
  state_registration: string;
  email: string;
  phone: string;
  postal_code: string;
  address_line1: string; // logradouro/rua
  address_number: string;
  address_complement: string;
  neighborhood: string;
  city: string;
  state: string;
  country: string;
}

const empty: Profile = {
  entity_type: 'individual',
  legal_name: '',
  trade_name: '',
  tax_id: '',
  municipal_registration: '',
  state_registration: '',
  email: '',
  phone: '',
  postal_code: '',
  address_line1: '',
  address_number: '',
  address_complement: '',
  neighborhood: '',
  city: '',
  state: '',
  country: 'BR',
};

export default function BillingProfileForm() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [cepLoading, setCepLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('billing_profiles')
      .select('*')
      .eq('admin_user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const d = data as any;
          setProfile({
            ...empty,
            ...d,
            entity_type: (d.entity_type === 'company' ? 'company' : 'individual') as EntityType,
            tax_id: d.entity_type === 'company' ? formatCNPJ(d.tax_id || '') : formatCPF(d.tax_id || ''),
            postal_code: formatCEP(d.postal_code || ''),
            phone: formatPhone(d.phone || ''),
            trade_name: d.trade_name || '',
            municipal_registration: d.municipal_registration || '',
            state_registration: d.state_registration || '',
            address_number: d.address_number || '',
            address_complement: d.address_complement || d.address_line2 || '',
            neighborhood: d.neighborhood || '',
          });
        } else {
          setProfile({ ...empty, email: user.email || '' });
        }
        setLoading(false);
      });
  }, [user]);

  const update = <K extends keyof Profile>(key: K, value: Profile[K]) => {
    setProfile((p) => ({ ...p, [key]: value }));
    if (errors[key as string]) setErrors((e) => ({ ...e, [key as string]: '' }));
  };

  const handleEntityType = (v: EntityType) => {
    setProfile((p) => ({
      ...p,
      entity_type: v,
      tax_id: '',
      trade_name: v === 'individual' ? '' : p.trade_name,
      municipal_registration: v === 'individual' ? '' : p.municipal_registration,
      state_registration: v === 'individual' ? '' : p.state_registration,
    }));
    setErrors((e) => ({ ...e, tax_id: '' }));
  };

  const handleCepBlur = async () => {
    if (!isValidCEP(profile.postal_code)) return;
    setCepLoading(true);
    const result = await lookupCEP(profile.postal_code);
    setCepLoading(false);
    if (!result) {
      toast.error('CEP não encontrado');
      return;
    }
    setProfile((p) => ({
      ...p,
      address_line1: result.street || p.address_line1,
      neighborhood: result.neighborhood || p.neighborhood,
      city: result.city || p.city,
      state: result.state || p.state,
    }));
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!profile.legal_name.trim()) e.legal_name = 'Obrigatório';
    if (profile.entity_type === 'company' && !isValidCNPJ(profile.tax_id)) e.tax_id = 'CNPJ inválido';
    if (profile.entity_type === 'individual' && !isValidCPF(profile.tax_id)) e.tax_id = 'CPF inválido';
    if (!profile.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) e.email = 'Email inválido';
    if (profile.postal_code && !isValidCEP(profile.postal_code)) e.postal_code = 'CEP inválido';
    if (profile.state && !UF_LIST.includes(profile.state.toUpperCase() as any)) e.state = 'UF inválida';
    if (profile.address_line1 && !profile.address_number.trim()) e.address_number = 'Informe o número';
    if (profile.address_line1 && !profile.neighborhood.trim()) e.neighborhood = 'Informe o bairro';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!user) return;
    if (!validate()) {
      toast.error('Verifique os campos destacados');
      return;
    }
    setSaving(true);
    const payload = {
      admin_user_id: user.id,
      entity_type: profile.entity_type,
      legal_name: profile.legal_name.trim(),
      trade_name: profile.trade_name.trim() || null,
      tax_id: onlyDigits(profile.tax_id),
      municipal_registration: profile.municipal_registration.trim() || null,
      state_registration: profile.state_registration.trim() || null,
      email: profile.email.trim(),
      phone: onlyDigits(profile.phone) || null,
      postal_code: onlyDigits(profile.postal_code) || null,
      address_line1: profile.address_line1.trim() || null,
      address_number: profile.address_number.trim() || null,
      address_complement: profile.address_complement.trim() || null,
      address_line2: profile.address_complement.trim() || null, // mantém legado em sincronia
      neighborhood: profile.neighborhood.trim() || null,
      city: profile.city.trim() || null,
      state: profile.state ? profile.state.toUpperCase() : null,
      country: (profile.country || 'BR').toUpperCase(),
    };
    const { error } = await supabase
      .from('billing_profiles')
      .upsert(payload, { onConflict: 'admin_user_id' });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Dados fiscais salvos');
  };

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  const isCompany = profile.entity_type === 'company';
  const taxIdValid = isCompany ? isValidCNPJ(profile.tax_id) : isValidCPF(profile.tax_id);

  // Cálculo de completude para emissão de NF
  const requiredFields: (keyof Profile)[] = isCompany
    ? ['legal_name', 'tax_id', 'email', 'postal_code', 'address_line1', 'address_number', 'neighborhood', 'city', 'state']
    : ['legal_name', 'tax_id', 'email', 'postal_code', 'address_line1', 'address_number', 'neighborhood', 'city', 'state'];
  const filledCount = requiredFields.filter((f) => String(profile[f] || '').trim()).length;
  const isComplete = filledCount === requiredFields.length && taxIdValid;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" /> Dados fiscais
        </CardTitle>
        <CardDescription>
          Necessários para emissão de nota fiscal e cobrança.
        </CardDescription>
        <div className={`flex items-center gap-2 text-sm mt-2 ${isComplete ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
          {isComplete ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {isComplete
            ? 'Dados completos para emissão de NF'
            : `Faltam dados para emissão de NF (${filledCount}/${requiredFields.length})`}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup
          value={profile.entity_type}
          onValueChange={(v) => handleEntityType(v as EntityType)}
          className="flex gap-6"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="individual" id="ind" />
            <Label htmlFor="ind" className="font-normal cursor-pointer">Pessoa física (CPF)</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="company" id="comp" />
            <Label htmlFor="comp" className="font-normal cursor-pointer">Pessoa jurídica (CNPJ)</Label>
          </div>
        </RadioGroup>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>{isCompany ? 'Razão social *' : 'Nome completo *'}</Label>
            <Input
              value={profile.legal_name}
              onChange={(e) => update('legal_name', e.target.value)}
              aria-invalid={!!errors.legal_name}
            />
            {errors.legal_name && <p className="text-xs text-destructive mt-1">{errors.legal_name}</p>}
          </div>

          <div>
            <Label>{isCompany ? 'CNPJ *' : 'CPF *'}</Label>
            <Input
              value={profile.tax_id}
              onChange={(e) => update('tax_id', isCompany ? formatCNPJ(e.target.value) : formatCPF(e.target.value))}
              placeholder={isCompany ? '00.000.000/0000-00' : '000.000.000-00'}
              aria-invalid={!!errors.tax_id}
            />
            {errors.tax_id && <p className="text-xs text-destructive mt-1">{errors.tax_id}</p>}
          </div>

          {isCompany && (
            <>
              <div>
                <Label>Nome fantasia</Label>
                <Input
                  value={profile.trade_name}
                  onChange={(e) => update('trade_name', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Inscrição municipal</Label>
                  <Input
                    value={profile.municipal_registration}
                    onChange={(e) => update('municipal_registration', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Inscrição estadual</Label>
                  <Input
                    value={profile.state_registration}
                    onChange={(e) => update('state_registration', e.target.value)}
                    placeholder="ISENTO se não tiver"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <Label>Email de cobrança *</Label>
            <Input
              type="email"
              value={profile.email}
              onChange={(e) => update('email', e.target.value)}
              aria-invalid={!!errors.email}
            />
            {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
          </div>

          <div>
            <Label>Telefone</Label>
            <Input
              value={profile.phone}
              onChange={(e) => update('phone', formatPhone(e.target.value))}
              placeholder="(00) 00000-0000"
            />
          </div>

          <div>
            <Label>CEP *</Label>
            <div className="relative">
              <Input
                value={profile.postal_code}
                onChange={(e) => update('postal_code', formatCEP(e.target.value))}
                onBlur={handleCepBlur}
                placeholder="00000-000"
                aria-invalid={!!errors.postal_code}
              />
              {cepLoading && <Loader2 className="h-4 w-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />}
            </div>
            {errors.postal_code && <p className="text-xs text-destructive mt-1">{errors.postal_code}</p>}
          </div>

          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-[1fr_140px] gap-3">
            <div>
              <Label>Logradouro *</Label>
              <Input
                value={profile.address_line1}
                onChange={(e) => update('address_line1', e.target.value)}
                placeholder="Rua, Avenida..."
              />
            </div>
            <div>
              <Label>Número *</Label>
              <Input
                value={profile.address_number}
                onChange={(e) => update('address_number', e.target.value)}
                aria-invalid={!!errors.address_number}
              />
              {errors.address_number && <p className="text-xs text-destructive mt-1">{errors.address_number}</p>}
            </div>
          </div>

          <div>
            <Label>Complemento</Label>
            <Input
              value={profile.address_complement}
              onChange={(e) => update('address_complement', e.target.value)}
              placeholder="Sala, andar..."
            />
          </div>

          <div>
            <Label>Bairro *</Label>
            <Input
              value={profile.neighborhood}
              onChange={(e) => update('neighborhood', e.target.value)}
              aria-invalid={!!errors.neighborhood}
            />
            {errors.neighborhood && <p className="text-xs text-destructive mt-1">{errors.neighborhood}</p>}
          </div>

          <div>
            <Label>Cidade *</Label>
            <Input
              value={profile.city}
              onChange={(e) => update('city', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>UF *</Label>
              <Select
                value={profile.state}
                onValueChange={(v) => update('state', v)}
              >
                <SelectTrigger aria-invalid={!!errors.state}>
                  <SelectValue placeholder="UF" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {UF_LIST.map((uf) => (
                    <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.state && <p className="text-xs text-destructive mt-1">{errors.state}</p>}
            </div>
            <div>
              <Label>País</Label>
              <Input
                value={profile.country}
                onChange={(e) => update('country', e.target.value.toUpperCase().slice(0, 2))}
                maxLength={2}
              />
            </div>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Salvar dados fiscais
        </Button>
      </CardContent>
    </Card>
  );
}
