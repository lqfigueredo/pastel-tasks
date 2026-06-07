import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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

const onlyDigits = (s: string) => s.replace(/\D/g, '');

export const Step1Profile = ({ onNext, onSkip }: Props) => {
  const { t } = useTranslation('onboarding');
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [entityType, setEntityType] = useState<'individual' | 'company'>('individual');
  const [legalName, setLegalName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [billingEmail, setBillingEmail] = useState(user?.email || '');
  const [postalCode, setPostalCode] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressNumber, setAddressNumber] = useState('');
  const [addressComplement, setAddressComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: profile }, { data: bp }] = await Promise.all([
        supabase.from('profiles').select('display_name').eq('user_id', user.id).maybeSingle(),
        supabase.from('billing_profiles').select('*').eq('admin_user_id', user.id).maybeSingle(),
      ]);
      if (profile?.display_name) setDisplayName(profile.display_name);
      if (bp) {
        setEntityType((bp.entity_type as 'individual' | 'company') || 'individual');
        setLegalName(bp.legal_name || '');
        setTaxId(bp.tax_id || '');
        setBillingEmail(bp.email || user.email || '');
        setPostalCode(bp.postal_code || '');
        setAddressLine1(bp.address_line1 || '');
        setAddressNumber(bp.address_number || '');
        setAddressComplement(bp.address_complement || '');
        setNeighborhood(bp.neighborhood || '');
        setCity(bp.city || '');
        setState(bp.state || '');
      }
    })();
  }, [user]);

  const lookupCep = async (cep: string) => {
    const digits = onlyDigits(cep);
    if (digits.length !== 8) return;
    setCepLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`, { signal: controller.signal });
      const data = await res.json();
      if (data.erro) {
        toast({ title: t('step1.errors.cepNotFound'), variant: 'destructive' });
        return;
      }
      setAddressLine1(data.logradouro || '');
      setNeighborhood(data.bairro || '');
      setCity(data.localidade || '');
      setState(data.uf || '');
    } catch {
      toast({ title: t('step1.errors.cepFailed'), variant: 'destructive' });
    } finally {
      clearTimeout(timer);
      setCepLoading(false);
    }
  };

  const hasAnyInput =
    displayName.trim() ||
    legalName.trim() ||
    taxId.trim() ||
    postalCode.trim() ||
    addressLine1.trim();

  const legalNameLabel = entityType === 'company' ? t('step1.legalNameCompany') : t('step1.legalNameIndividual');
  const taxIdLabel = entityType === 'company' ? t('step1.taxIdCompany') : t('step1.taxIdIndividual');

  const handleSave = async () => {
    if (!user) return;
    const required: Array<[string, string]> = [
      [t('step1.displayName'), displayName],
      [legalNameLabel, legalName],
      [taxIdLabel, taxId],
      [t('step1.billingEmail'), billingEmail],
      [t('step1.postalCode'), postalCode],
      [t('step1.addressLine1'), addressLine1],
      [t('step1.addressNumber'), addressNumber],
      [t('step1.neighborhood'), neighborhood],
      [t('step1.city'), city],
      [t('step1.state'), state],
    ];
    const missing = required.filter(([, v]) => !v.trim()).map(([k]) => k);
    if (missing.length > 0) {
      toast({ title: t('step1.errors.requiredFields'), description: missing.join(', '), variant: 'destructive' });
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
        tax_id: onlyDigits(taxId),
        email: billingEmail.trim(),
        postal_code: onlyDigits(postalCode),
        address_line1: addressLine1.trim(),
        address_number: addressNumber.trim(),
        address_complement: addressComplement.trim() || null,
        neighborhood: neighborhood.trim(),
        city: city.trim(),
        state: state.trim().toUpperCase().slice(0, 2),
      };

      const { error: bErr } = existing
        ? await supabase.from('billing_profiles').update(payload).eq('id', existing.id)
        : await supabase.from('billing_profiles').insert(payload);
      if (bErr) throw bErr;

      onNext();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('step1.errors.unexpected');
      toast({ title: t('step1.errors.saveFailed'), description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
      <div>
        <h3 className="text-lg font-semibold mb-1">{t('step1.title')}</h3>
        <p className="text-sm text-muted-foreground">{t('step1.subtitle')}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="displayName">{t('step1.displayName')}</Label>
        <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={t('step1.displayNamePlaceholder')} />
      </div>

      <div className="space-y-2">
        <Label>{t('step1.entityType')}</Label>
        <RadioGroup value={entityType} onValueChange={(v) => setEntityType(v as 'individual' | 'company')} className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <RadioGroupItem value="individual" /> {t('step1.individual')}
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <RadioGroupItem value="company" /> {t('step1.company')}
          </label>
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label htmlFor="legalName">{legalNameLabel}</Label>
        <Input id="legalName" value={legalName} onChange={(e) => setLegalName(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="taxId">{taxIdLabel}</Label>
          <Input id="taxId" value={taxId} onChange={(e) => setTaxId(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="billingEmail">{t('step1.billingEmail')}</Label>
          <Input id="billingEmail" type="email" value={billingEmail} onChange={(e) => setBillingEmail(e.target.value)} />
        </div>
      </div>

      <div className="border-t pt-4 space-y-3">
        <h4 className="font-semibold text-sm">{t('step1.billingAddress')}</h4>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label htmlFor="postalCode">{t('step1.postalCode')}</Label>
            <div className="relative">
              <Input
                id="postalCode"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                onBlur={(e) => lookupCep(e.target.value)}
                placeholder="00000-000"
                maxLength={9}
              />
              {cepLoading && <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
          </div>
          <div className="col-span-2 space-y-2">
            <Label htmlFor="addressLine1">{t('step1.addressLine1')}</Label>
            <Input id="addressLine1" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label htmlFor="addressNumber">{t('step1.addressNumber')}</Label>
            <Input id="addressNumber" value={addressNumber} onChange={(e) => setAddressNumber(e.target.value)} />
          </div>
          <div className="col-span-2 space-y-2">
            <Label htmlFor="addressComplement">{t('step1.addressComplement')}</Label>
            <Input id="addressComplement" value={addressComplement} onChange={(e) => setAddressComplement(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="neighborhood">{t('step1.neighborhood')}</Label>
          <Input id="neighborhood" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2 space-y-2">
            <Label htmlFor="city">{t('step1.city')}</Label>
            <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">{t('step1.state')}</Label>
            <Input id="state" value={state} onChange={(e) => setState(e.target.value.toUpperCase())} maxLength={2} />
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-4 gap-2 sticky bottom-0 bg-background pb-1">
        <Button variant="ghost" onClick={onSkip}>{t('common.skipAll')}</Button>
        <div className="flex gap-2">
          {!hasAnyInput && (
            <Button variant="outline" onClick={onNext}>{t('common.skip')}</Button>
          )}
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {t('common.saveAndContinue')}
          </Button>
        </div>
      </div>
    </div>
  );
};
