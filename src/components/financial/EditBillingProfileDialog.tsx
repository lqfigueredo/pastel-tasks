import { useEffect, useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  formatCPF, formatCNPJ, formatCEP, formatPhone, onlyDigits,
  isValidCPF, isValidCNPJ, isValidCEP, UF_LIST, lookupCEP,
} from '@/lib/br-validators';

type EntityType = 'individual' | 'company';

interface Profile {
  entity_type: EntityType;
  legal_name: string;
  trade_name: string;
  tax_id: string;
  municipal_registration: string;
  state_registration: string;
  email: string;
  phone: string;
  postal_code: string;
  address_line1: string;
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

interface Props {
  open: boolean;
  onClose: () => void;
  adminUserId: string;
  adminName: string;
  onSaved: () => void;
}

export default function EditBillingProfileDialog({ open, onClose, adminUserId, adminName, onSaved }: Props) {
  const { t } = useTranslation('financial');
  const [profile, setProfile] = useState<Profile>(empty);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [cepLoading, setCepLoading] = useState(false);

  useEffect(() => {
    if (!open || !adminUserId) return;
    setLoading(true);
    setErrors({});
    supabase
      .from('billing_profiles')
      .select('*')
      .eq('admin_user_id', adminUserId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const d = data as any;
          const et: EntityType = d.entity_type === 'company' ? 'company' : 'individual';
          setProfile({
            ...empty,
            ...d,
            entity_type: et,
            tax_id: et === 'company' ? formatCNPJ(d.tax_id || '') : formatCPF(d.tax_id || ''),
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
          setProfile(empty);
        }
        setLoading(false);
      });
  }, [open, adminUserId]);

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
      toast.error(t('drawer.fiscal.editDialog.errors.cepNotFound'));
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
    const er = (k: string) => t(`drawer.fiscal.editDialog.errors.${k}`);
    if (!profile.legal_name.trim()) e.legal_name = er('required');
    if (profile.entity_type === 'company' && !isValidCNPJ(profile.tax_id)) e.tax_id = er('invalidCnpj');
    if (profile.entity_type === 'individual' && !isValidCPF(profile.tax_id)) e.tax_id = er('invalidCpf');
    if (!profile.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) e.email = er('invalidEmail');
    if (profile.postal_code && !isValidCEP(profile.postal_code)) e.postal_code = er('invalidCep');
    if (profile.state && !UF_LIST.includes(profile.state.toUpperCase() as any)) e.state = er('invalidUf');
    if (profile.address_line1 && !profile.address_number.trim()) e.address_number = er('addressNumberRequired');
    if (profile.address_line1 && !profile.neighborhood.trim()) e.neighborhood = er('neighborhoodRequired');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      toast.error(t('drawer.fiscal.editDialog.errors.checkFields'));
      return;
    }
    setSaving(true);
    const payload = {
      admin_user_id: adminUserId,
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
      address_line2: profile.address_complement.trim() || null,
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
    toast.success(t('drawer.fiscal.editDialog.success'));
    onSaved();
    onClose();
  };

  const isCompany = profile.entity_type === 'company';

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('drawer.fiscal.editDialog.title', { name: adminName })}</DialogTitle>
          <DialogDescription>{t('drawer.fiscal.editDialog.description')}</DialogDescription>
        </DialogHeader>

        <Alert className="border-amber-500/40 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="text-xs">
            <Trans
              i18nKey="drawer.fiscal.editDialog.warning"
              t={t}
              components={{ strong: <strong /> }}
            />
          </AlertDescription>
        </Alert>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            <RadioGroup
              value={profile.entity_type}
              onValueChange={(v) => handleEntityType(v as EntityType)}
              className="flex gap-6"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="individual" id="ed-ind" />
                <Label htmlFor="ed-ind" className="font-normal cursor-pointer">{t('drawer.fiscal.editDialog.individualOpt')}</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="company" id="ed-comp" />
                <Label htmlFor="ed-comp" className="font-normal cursor-pointer">{t('drawer.fiscal.editDialog.companyOpt')}</Label>
              </div>
            </RadioGroup>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>{isCompany ? t('drawer.fiscal.editDialog.legalNameCompany') : t('drawer.fiscal.editDialog.legalNameIndividual')}</Label>
                <Input
                  value={profile.legal_name}
                  onChange={(e) => update('legal_name', e.target.value)}
                  aria-invalid={!!errors.legal_name}
                />
                {errors.legal_name && <p className="text-xs text-destructive mt-1">{errors.legal_name}</p>}
              </div>

              <div>
                <Label>{isCompany ? t('drawer.fiscal.editDialog.cnpj') : t('drawer.fiscal.editDialog.cpf')}</Label>
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
                    <Label>{t('drawer.fiscal.editDialog.tradeName')}</Label>
                    <Input
                      value={profile.trade_name}
                      onChange={(e) => update('trade_name', e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>{t('drawer.fiscal.editDialog.municipalRegistration')}</Label>
                      <Input
                        value={profile.municipal_registration}
                        onChange={(e) => update('municipal_registration', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>{t('drawer.fiscal.editDialog.stateRegistration')}</Label>
                      <Input
                        value={profile.state_registration}
                        onChange={(e) => update('state_registration', e.target.value)}
                        placeholder={t('drawer.fiscal.editDialog.stateRegPlaceholder')}
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <Label>{t('drawer.fiscal.editDialog.email')}</Label>
                <Input
                  type="email"
                  value={profile.email}
                  onChange={(e) => update('email', e.target.value)}
                  aria-invalid={!!errors.email}
                />
                {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
              </div>

              <div>
                <Label>{t('drawer.fiscal.editDialog.phone')}</Label>
                <Input
                  value={profile.phone}
                  onChange={(e) => update('phone', formatPhone(e.target.value))}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div>
                <Label>{t('drawer.fiscal.editDialog.postalCode')}</Label>
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
                  <Label>{t('drawer.fiscal.editDialog.addressLine1')}</Label>
                  <Input
                    value={profile.address_line1}
                    onChange={(e) => update('address_line1', e.target.value)}
                    placeholder={t('drawer.fiscal.editDialog.addressLine1Placeholder')}
                  />
                </div>
                <div>
                  <Label>{t('drawer.fiscal.editDialog.addressNumber')}</Label>
                  <Input
                    value={profile.address_number}
                    onChange={(e) => update('address_number', e.target.value)}
                    aria-invalid={!!errors.address_number}
                  />
                  {errors.address_number && <p className="text-xs text-destructive mt-1">{errors.address_number}</p>}
                </div>
              </div>

              <div>
                <Label>{t('drawer.fiscal.editDialog.addressComplement')}</Label>
                <Input
                  value={profile.address_complement}
                  onChange={(e) => update('address_complement', e.target.value)}
                  placeholder={t('drawer.fiscal.editDialog.addressComplementPlaceholder')}
                />
              </div>

              <div>
                <Label>{t('drawer.fiscal.editDialog.neighborhood')}</Label>
                <Input
                  value={profile.neighborhood}
                  onChange={(e) => update('neighborhood', e.target.value)}
                  aria-invalid={!!errors.neighborhood}
                />
                {errors.neighborhood && <p className="text-xs text-destructive mt-1">{errors.neighborhood}</p>}
              </div>

              <div>
                <Label>{t('drawer.fiscal.editDialog.city')}</Label>
                <Input
                  value={profile.city}
                  onChange={(e) => update('city', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t('drawer.fiscal.editDialog.state')}</Label>
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
                  <Label>{t('drawer.fiscal.editDialog.country')}</Label>
                  <Input
                    value={profile.country}
                    onChange={(e) => update('country', e.target.value.toUpperCase().slice(0, 2))}
                    maxLength={2}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>{t('drawer.fiscal.editDialog.cancel')}</Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t('drawer.fiscal.editDialog.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
